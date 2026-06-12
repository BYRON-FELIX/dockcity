from rest_framework import response
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
def auto_complete_expired_bookings(bookings):
    """Auto-complete bookings where escrow time has passed."""
    from django.utils import timezone
    now = timezone.now()
    for booking in bookings:
        if (booking.status == 'checked_in' and 
            booking.escrow_release_at and 
            now >= booking.escrow_release_at):
            booking.status = 'completed'
            booking.payout_sent_at = now
            booking.save()
    return bookings

from datetime import timedelta

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

        # Calculate costs
        total_nights = (data['check_out_date'] - data['check_in_date']).days
        total_amount = listing.price_per_night_kes * total_nights
        platform_fee = int(total_amount * PLATFORM_FEE_PERCENT / 100)
        host_payout = total_amount - platform_fee

        # Create booking in pending_payment state
        booking = Booking.objects.create(
            listing=listing,
            guest=user,
            check_in_date=data['check_in_date'],
            check_out_date=data['check_out_date'],
            total_nights=total_nights,
            total_amount_kes=total_amount,
            platform_fee_kes=platform_fee,
            host_payout_kes=host_payout,
            status='pending_payment',
        )

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
            'message': 'Booking created. Complete M-Pesa payment to confirm.'
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

            booking.mpesa_transaction_code = transaction_code
            booking.status = 'awaiting_host'
            booking.save()
            
            print(f'Booking updated to awaiting_host!')

            from core.sms import notify_host_new_booking
            notify_host_new_booking(booking)

            return Response({'message': 'Payment confirmed. Awaiting host.'})

        except Exception as e:
            print(f'WEBHOOK ERROR: {e}')
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)
class HostBookingConfirmView(APIView):
    """Host accepts a booking — must respond within 2 hours."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, listing__host=request.user)

        if booking.status != 'awaiting_host':
            return Response({'error': 'Booking is not awaiting confirmation.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = 'confirmed'
        booking.host_confirmed_at = timezone.now()
        booking.save()

        from core.sms import notify_guest_booking_confirmed
        notify_guest_booking_confirmed(booking)

        return Response({'message': 'Booking confirmed successfully.'})


class HostBookingDeclineView(APIView):
    """Host declines a booking — triggers full refund."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, listing__host=request.user)

        if booking.status != 'awaiting_host':
            return Response({'error': 'Booking is not awaiting confirmation.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = 'cancelled'
        booking.cancellation_reason = request.data.get('reason', 'Declined by host')
        booking.save()

        from core.sms import notify_guest_booking_declined
        notify_guest_booking_declined(booking)

        return Response({'message': 'Booking declined. Guest will be refunded.'})

class GuestCheckInView(APIView):
    """Guest confirms check-in — starts escrow release timer."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, guest=request.user)

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