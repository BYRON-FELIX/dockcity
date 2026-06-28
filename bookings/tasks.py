from celery import shared_task
from django.utils import timezone

from core.sms import notify_both_auto_cancelled, notify_host_payout_released


@shared_task
def release_escrow(booking_id):
    """
    Releases escrow to host after the escrow window has passed.
    Called automatically by Celery Beat after check-in confirmation.
    """
    from .models import Booking

    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return f'Booking {booking_id} not found.'

    # Only release if still in checked_in state
    if booking.status != 'checked_in':
        return f'Booking {booking_id} is {booking.status} — escrow not released.'

    # Double check escrow window has actually passed
    if booking.escrow_release_at and timezone.now() < booking.escrow_release_at:
        return f'Escrow window not yet passed for booking {booking_id}.'

    # Mark as completed and record payout time
    booking.status = 'completed'
    booking.payout_sent_at = timezone.now()
    booking.save()

    # Update host completed bookings count
    host_profile = booking.listing.host.host_profile
    host_profile.completed_bookings_count += 1

    # Upgrade from probation to verified after 3 clean bookings
    if host_profile.trust_level == 'probation' and host_profile.completed_bookings_count >= 3:
        host_profile.trust_level = 'verified'

    host_profile.save()

    # TODO: WhatsApp notification to host — payout released
    from core.sms import notify_host_payout_released
    notify_host_payout_released(booking)
    from core.email import notify_booking_completed
    notify_booking_completed(booking)

    return f'Escrow released for booking {booking_id}. Host payout: KES {booking.host_payout_kes}'


@shared_task
def auto_cancel_expired_bookings():
    """
    Runs every 15 minutes via Celery Beat.
    Auto-cancels bookings where host didn't respond within 2 hours.
    """
    from .models import Booking

    now = timezone.now()
    expired = Booking.objects.filter(
        status='awaiting_host',
    )

    cancelled_count = 0
    for booking in expired:
        # Check if more than 2 hours have passed since payment confirmed
        if booking.mpesa_transaction_code:
            hours_waiting = (now - booking.created_at).total_seconds() / 3600
            if hours_waiting > 2:
                booking.status = 'cancelled'
                booking.cancellation_reason = 'Host did not respond within 2 hours. Auto-cancelled.'
                booking.save()
                cancelled_count += 1
                # TODO: WhatsApp notifications to both guest and host
                from core.sms import notify_both_auto_cancelled
                notify_both_auto_cancelled(booking)
                # TODO: Trigger refund via IntaSend

    return f'Auto-cancelled {cancelled_count} expired bookings.'