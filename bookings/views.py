from rest_framework import response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
def auto_complete_expired_bookings(bookings):
    """Auto-transition bookings based on escrow, checkout, response, and payment windows."""
    now = timezone.now()
    from datetime import date
    today = date.today()

    for booking in bookings:
        if (booking.status == 'checked_in' and
            booking.escrow_release_at and
            now >= booking.escrow_release_at):
            booking.status = 'completed'
            booking.save()

            from core.email import notify_booking_completed
            notify_booking_completed(booking)

        elif (booking.status == 'confirmed' and
              booking.check_out_date and
              booking.check_out_date < today):
            booking.status = 'completed'
            booking.save()

            from core.email import notify_booking_completed
            notify_booking_completed(booking)

        elif (booking.status == 'awaiting_host' and
              booking.created_at and
              now >= booking.created_at + timedelta(hours=2)):
            booking.status = 'cancelled'
            booking.cancellation_reason = 'Host did not respond within 2 hours.'
            booking.save()

            from core.sms import notify_both_auto_cancelled
            notify_both_auto_cancelled(booking)

        elif (booking.status == 'pending_payment' and
              booking.payment_expires_at and
              now >= booking.payment_expires_at):
            booking.status = 'cancelled'
            booking.cancellation_reason = 'Payment window expired.'
            booking.save()
    return bookings


def get_applicable_discount(listing, nights):
    """Return the highest discount percent this stay qualifies for, otherwise 0."""
    if not listing.long_stay_discounts:
        return 0

    qualifying = []
    for tier in listing.long_stay_discounts:
        try:
            min_nights = int(tier.get('min_nights', 0))
            discount_percent = int(tier.get('discount_percent', 0))
        except (TypeError, ValueError, AttributeError):
            continue

        if nights >= min_nights and discount_percent > 0:
            qualifying.append(discount_percent)

    return max(qualifying) if qualifying else 0

from datetime import datetime, timedelta

from core.sms import notify_guest_booking_confirmed, notify_host_checkin_confirmed
from .models import Booking
from .serializers import BookingSerializer, BookingCreateSerializer
from .payhero import trigger_stk_push
from listings.models import Listing



PLATFORM_FEE_PERCENT = 10

   

class BookingCreateView(APIView):
    """Guest creates a booking and triggers M-Pesa STK Push."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Must be a guest
        if user.role != 'guest':
            return Response({'error': 'Only guests can create bookings.'}, status=status.HTTP_403_FORBIDDEN)

        # Must have verified ID
        

        serializer = BookingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        listing = get_object_or_404(Listing, pk=data['listing_id'], status='live')

        is_hourly = str(request.data.get('is_hourly_booking', '')).lower() in ['true', '1', 'yes']

        # Validate check-in/check-out times against listing windows for nightly bookings
        check_in_time = None
        check_out_time = None
        if not is_hourly:
            check_in_time_str = request.data.get('check_in_time')
            check_out_time_str = request.data.get('check_out_time')

            if check_in_time_str:
                try:
                    check_in_time = datetime.strptime(check_in_time_str, '%H:%M').time()
                    if not (listing.earliest_checkin_time <= check_in_time <= listing.latest_checkin_time):
                        return Response(
                            {'error': f'Check-in must be between {listing.earliest_checkin_time.strftime("%H:%M")} and {listing.latest_checkin_time.strftime("%H:%M")} for this listing.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except ValueError:
                    return Response({'error': 'Invalid check-in time format. Use HH:MM.'}, status=status.HTTP_400_BAD_REQUEST)

            if check_out_time_str:
                try:
                    check_out_time = datetime.strptime(check_out_time_str, '%H:%M').time()
                    if not (listing.earliest_checkout_time <= check_out_time <= listing.latest_checkout_time):
                        return Response(
                            {'error': f'Check-out must be between {listing.earliest_checkout_time.strftime("%H:%M")} and {listing.latest_checkout_time.strftime("%H:%M")} for this listing.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except ValueError:
                    return Response({'error': 'Invalid check-out time format. Use HH:MM.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check guest count
        if data['guests'] > listing.max_guests:
            return Response(
                {'error': f'This listing allows a maximum of {listing.max_guests} guests.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check availability — no overlapping confirmed/checked_in bookings
        overlapping = Booking.objects.filter(
            listing=listing,
            status__in=['confirmed', 'checked_in'],
            check_in_date__lt=data['check_out_date'],
            check_out_date__gt=data['check_in_date'],
        ).exists()

        if overlapping:
            return Response(
                {'error': 'These dates are not available.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        hourly_duration = None
        discount_percent = 0
        discount_amount = 0

        if is_hourly:
            hourly_duration = request.data.get('hourly_duration')
            if not hourly_duration:
                return Response({'error': 'Hourly duration is required.'}, status=status.HTTP_400_BAD_REQUEST)

            if not listing.is_hourly_available:
                return Response({'error': 'This listing does not support hourly bookings.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                hourly_duration = int(hourly_duration)
            except (TypeError, ValueError):
                return Response({'error': 'Hourly duration must be a number.'}, status=status.HTTP_400_BAD_REQUEST)

            if listing.hourly_pricing_type == 'flat_rate':
                if not listing.hourly_rate_kes:
                    return Response({'error': 'This listing has no hourly rate configured.'}, status=status.HTTP_400_BAD_REQUEST)

                min_hours = listing.hourly_min_hours or 1
                if hourly_duration < min_hours:
                    return Response(
                        {'error': f'Minimum booking is {min_hours} hours for this listing.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                total_amount = listing.hourly_rate_kes * hourly_duration

            elif listing.hourly_pricing_type == 'fixed_blocks':
                blocks = listing.hourly_blocks or []
                block = next((b for b in blocks if int(b.get('hours', 0)) == hourly_duration), None)
                if not block:
                    return Response({'error': 'Invalid time block selected.'}, status=status.HTTP_400_BAD_REQUEST)
                total_amount = int(block.get('price_kes', 0))
                if total_amount <= 0:
                    return Response({'error': 'Selected time block has invalid pricing.'}, status=status.HTTP_400_BAD_REQUEST)

            else:
                return Response({'error': 'This listing has no hourly pricing configured.'}, status=status.HTTP_400_BAD_REQUEST)

            total_nights = 0
        else:
            # Calculate nightly costs
            total_nights = (data['check_out_date'] - data['check_in_date']).days
            base_total = listing.price_per_night_kes * total_nights
            discount_percent = get_applicable_discount(listing, total_nights)
            if discount_percent > 0:
                discount_amount = int(base_total * discount_percent / 100)
                total_amount = base_total - discount_amount
            else:
                total_amount = base_total

        platform_fee = int(total_amount * PLATFORM_FEE_PERCENT / 100)
        host_payout = total_amount - platform_fee

        # Create booking in pending_payment state
        booking = Booking.objects.create(
            listing=listing,
            guest=user,
            check_in_time=check_in_time,
            check_out_time=check_out_time,
            check_in_date=data['check_in_date'],
            check_out_date=data['check_out_date'],
            is_hourly_booking=is_hourly,
            hourly_duration=hourly_duration if is_hourly else None,
            total_nights=total_nights,
            total_amount_kes=total_amount,
            platform_fee_kes=platform_fee,
            host_payout_kes=host_payout,
            status='pending_payment',
        )

        booking.payment_expires_at = timezone.now() + timedelta(minutes=20)
        booking.save()

        # Trigger M-Pesa STK Push
        phone = request.data.get('phone_number') or booking.guest.phone_number or '254700000000'  # fallback — ideally guest has a phone field
        
        mpesa_response = trigger_stk_push(
            phone_number=phone,
            amount=total_amount,
            reference_code=booking.reference_code
        )

        return Response({
            'booking': BookingSerializer(booking).data,
            'mpesa': mpesa_response,
            'message': 'Booking created. Complete M-Pesa payment to confirm.',
            'discount_applied_percent': discount_percent,
            'discount_amount_kes': discount_amount if discount_percent > 0 else 0,
        }, status=status.HTTP_201_CREATED)


class BookingConfirmPaymentView(APIView):
    """
    PayHero webhook — called after M-Pesa payment is confirmed.
    """
    permission_classes = []

    def post(self, request):
        print('='*50)
        print('PAYHERO WEBHOOK RECEIVED:')
        print(request.data)
        print('='*50)

        try:
            response = request.data.get('response', {})
            
            status = response.get('Status', '')
            reference = response.get('ExternalReference', '')
            transaction_code = response.get('MpesaReceiptNumber', '')

            print(f'Status: {status}')
            print(f'Reference: {reference}')
            print(f'Transaction code: {transaction_code}')

            if status != 'Success':
                print(f'Payment not successful: {status}')
                return Response({'message': f'Payment status {status} — ignoring.'})

            if not reference:
                print('No reference found')
                return Response({'error': 'No reference found.'}, status=400)

            try:
                booking = Booking.objects.get(reference_code=reference)
                print(f'Booking found: {booking.id} — current status: {booking.status}')
            except Booking.DoesNotExist:
                print(f'Booking not found for reference: {reference}')
                return Response({'error': 'Booking not found.'}, status=404)

            if booking.status != 'pending_payment':
                print(f'Booking {booking.reference_code} already processed with status {booking.status}.')
                return Response({'message': 'Payment already processed. Ignoring duplicate webhook.'})

            booking.mpesa_transaction_code = transaction_code
            booking.status = 'awaiting_host'
            booking.save()
            
            print(f'Booking updated to awaiting_host!')

            from core.sms import notify_host_new_booking, notify_guest_payment_received
            notify_host_new_booking(booking)
            notify_guest_payment_received(booking)

            from core.email import notify_payment_confirmed
            notify_payment_confirmed(booking)

            return Response({'message': 'Payment confirmed. Awaiting host.'})

        except Exception as e:
            print(f'WEBHOOK ERROR: {e}')
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

class BookingRetryPaymentView(APIView):
    """Guest retries STK push for an existing pending_payment booking."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, guest=request.user)

        if booking.status != 'pending_payment':
            return Response(
                {'error': f'This booking is {booking.status}, payment can no longer be retried.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        phone = request.data.get('phone_number') or booking.guest.phone_number
        if not phone:
            return Response({'error': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.payment_expires_at = timezone.now() + timedelta(minutes=20)
        booking.save()

        mpesa_response = trigger_stk_push(
            phone_number=phone,
            amount=booking.total_amount_kes,
            reference_code=booking.reference_code,
        )

        return Response({
            'message': 'Payment request sent again. Check your phone.',
            'mpesa_response': mpesa_response,
        })

class HostBookingConfirmView(APIView):
    """Host accepts a booking — must respond within 2 hours."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, listing__host=request.user)

        if booking.status == 'confirmed':
            return Response({'message': 'Booking already confirmed.'})

        if booking.status != 'awaiting_host':
            return Response({'error': 'Booking is not awaiting confirmation.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = 'confirmed'
        booking.host_confirmed_at = timezone.now()
        booking.save()

        from core.sms import notify_guest_booking_confirmed
        notify_guest_booking_confirmed(booking)
        from core.email import notify_booking_confirmed
        notify_booking_confirmed(booking)

        return Response({'message': 'Booking confirmed successfully.'})


class HostBookingDeclineView(APIView):
    """Host declines a booking awaiting their response."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, listing__host=request.user)

        if booking.status != 'awaiting_host':
            return Response(
                {'error': f'Booking is {booking.status}, cannot decline.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', 'No reason provided.')

        booking.status = 'cancelled'
        booking.cancellation_reason = reason
        booking.refund_status = 'pending'
        booking.save()

        # SMS to guest (kept even though carrier-blocked for now, harmless to call)
        from core.sms import notify_guest_booking_declined
        notify_guest_booking_declined(booking)

        # Email to guest
        from core.email import notify_guest_booking_declined_email, notify_admin_booking_declined_email
        notify_guest_booking_declined_email(booking, reason)

        # Email to admin — pull all admin users
        from users.models import User
        admin_emails = User.objects.filter(role='admin').values_list('email', flat=True)
        for admin_email in admin_emails:
            notify_admin_booking_declined_email(booking, reason, admin_email)

        return Response({'message': 'Booking declined. Guest will be refunded.'})

class GuestCheckInView(APIView):
    """Guest confirms check-in — starts escrow release timer."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, guest=request.user)

        if booking.status == 'checked_in':
            return Response({'message': 'Check-in already confirmed.'})

        if booking.status != 'confirmed':
            return Response({'error': 'Booking is not in confirmed state.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()

        # Escrow: 8hrs normally, 48hrs if host is on probation
        host_profile = booking.listing.host.host_profile
        escrow_hours = 48 if host_profile.trust_level == 'probation' else 8

        booking.status = 'checked_in'
        booking.checked_in_at = now
        booking.escrow_release_at = now + timedelta(hours=escrow_hours)
        booking.save()

        # Schedule escrow release task
        from .tasks import release_escrow
        release_escrow.apply_async(
            args=[str(booking.id)],
            eta=booking.escrow_release_at
        )
        from core.sms import notify_host_checkin_confirmed
        notify_host_checkin_confirmed(booking)
        from core.email import notify_guest_checkin
        notify_guest_checkin(booking)

        return Response({
            'message': f'Check-in confirmed. Escrow releases in {escrow_hours} hours.',
            'escrow_release_at': booking.escrow_release_at,
        })

class GuestBookingListView(APIView):
    """Guest views all their bookings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(guest=request.user)
        auto_complete_expired_bookings(bookings)
        # Refresh after auto-complete
        bookings = Booking.objects.filter(guest=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class GuestActiveTripsCountView(APIView):
    """Guest — count of bookings still in progress (for navbar badge)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(guest=request.user)
        auto_complete_expired_bookings(bookings)
        # Refresh after auto-complete
        bookings = Booking.objects.filter(guest=request.user)

        active_statuses = ['pending_payment', 'awaiting_host', 'confirmed', 'checked_in']
        count = bookings.filter(status__in=active_statuses).count()

        return Response({'active_count': count})



class HostBookingListView(APIView):
    """Host views all bookings for their listings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(listing__host=request.user)
        auto_complete_expired_bookings(bookings)
        # Refresh after auto-complete
        bookings = Booking.objects.filter(listing__host=request.user)
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)
    
class BookingAddressView(APIView):
    """
    Guest gets full address + Google Maps link after payment confirmed.
    Only available for confirmed, checked_in or completed bookings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, guest=request.user)

        if booking.status not in ['confirmed', 'checked_in', 'completed']:
            return Response(
                {'error': 'Address is only available after booking is confirmed and paid.'},
                status=status.HTTP_403_FORBIDDEN
            )

        listing = booking.listing
        full_address = listing.full_address or f'{listing.neighborhood}, Nairobi'

        # Generate Google Maps directions link
        # Use coordinates if available for more accurate directions
        if listing.latitude and listing.longitude:
            maps_link = f'https://www.google.com/maps/dir/?api=1&destination={listing.latitude},{listing.longitude}'
        else:
            encoded_address = full_address.replace(' ', '+').replace(',', '%2C')
            maps_link = f'https://www.google.com/maps/dir/?api=1&destination={encoded_address}'

        return Response({
            'full_address': full_address,
            'maps_link': maps_link,
            'caretaker_name': listing.caretaker_name or listing.host.host_profile.caretaker_name,
            'caretaker_phone': listing.caretaker_phone or listing.host.host_profile.caretaker_phone,
        })

class BookingReceiptView(APIView):
    """Guest gets full booking receipt after host confirms."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, guest=request.user)

        if booking.status not in ['confirmed', 'checked_in', 'completed']:
            return Response(
                {'error': 'Receipt is only available for confirmed bookings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        listing = booking.listing
        full_address = listing.full_address or f'{listing.neighborhood}, Nairobi'
        # Use coordinates if available for more accurate directions
        if listing.latitude and listing.longitude:
            maps_link = f'https://www.google.com/maps/dir/?api=1&destination={listing.latitude},{listing.longitude}'
        else:
            encoded_address = full_address.replace(' ', '+').replace(',', '%2C')
            maps_link = f'https://www.google.com/maps/dir/?api=1&destination={encoded_address}'

        return Response({
            'reference_code': booking.reference_code,
            'listing_title': listing.title,
            'neighborhood': listing.neighborhood,
            'full_address': full_address,
            'area_description': listing.area_description,
            'maps_link': maps_link,
            'check_in_date': str(booking.check_in_date),
            'check_out_date': str(booking.check_out_date),
            'total_nights': booking.total_nights,
            'total_amount_kes': booking.total_amount_kes,
            'mpesa_transaction_code': booking.mpesa_transaction_code,
            'payment_phone': booking.guest.phone_number,
            'caretaker_name': listing.caretaker_name or listing.host.host_profile.caretaker_name,
            'caretaker_phone': listing.caretaker_phone or listing.host.host_profile.caretaker_phone,
            'host_confirmed_at': booking.host_confirmed_at,
            'status': booking.status,
        })   

class AdminMarkPayoutView(APIView):
    """Admin manually marks host payout as sent."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        booking = get_object_or_404(Booking, pk=pk)

        if booking.status not in ['completed', 'checked_in']:
            return Response(
                {'error': 'Booking must be checked in or completed before marking payout.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if booking.payout_sent_at:
            return Response({'error': 'Payout already marked as sent.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.payout_sent_at = timezone.now()
        booking.save()

        # WhatsApp notification to host
        from core.sms import notify_host_payout_released
        notify_host_payout_released(booking)
        from core.email import notify_payout_sent
        notify_payout_sent(booking)

        return Response({'message': f'Payout of KES {booking.host_payout_kes:,} marked as sent to {booking.listing.host.full_name}.'})

class AdminBookingsView(APIView):
    """Admin views all bookings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        
        status_filter = request.query_params.get('status')
        bookings = Booking.objects.all()
        if status_filter:
            bookings = bookings.filter(status=status_filter)
        
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class AdminRecentPaymentsView(APIView):
    """Admin views recent bookings that have completed payment."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        payment_statuses = ['awaiting_host', 'confirmed', 'checked_in', 'completed']
        bookings = Booking.objects.filter(status__in=payment_statuses).order_by('-created_at')[:50]
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class AdminDeclinedBookingsView(APIView):
    """Admin — list all declined bookings still needing a refund."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        bookings = Booking.objects.filter(status='cancelled', refund_status='pending')
        serializer = BookingSerializer(bookings, many=True)
        return Response(serializer.data)


class AdminMarkRefundSentView(APIView):
    """Admin manually marks a guest refund as sent."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        booking = get_object_or_404(Booking, pk=pk)

        if booking.refund_status != 'pending':
            return Response({'error': 'No pending refund on this booking.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.refund_status = 'sent'
        booking.save()

        return Response({'message': f'Refund of KES {booking.total_amount_kes:,} marked as sent.'})