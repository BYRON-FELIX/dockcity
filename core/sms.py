import africastalking
import os


def initialize():
    africastalking.initialize(
        username=os.getenv('dockcity'),
        api_key=os.getenv('atsk_7a5b16c0e3a4ee3a383d466776e252fbb455e07406da8759caf168a6ff8f6517015a05b0')
    )
    return africastalking.SMS


def send_sms(phone_number, message):
    """
    Send SMS via Africa's Talking.
    Phone number format: +254XXXXXXXXX
    """
    try:
        sms = initialize()

        # Normalize phone number
        phone = str(phone_number).strip().replace(' ', '')
        if phone.startswith('0'):
            phone = '+254' + phone[1:]
        elif phone.startswith('254'):
            phone = '+' + phone
        elif not phone.startswith('+'):
            phone = '+254' + phone

        response = sms.send(
            message=message,
            recipients=[phone],
            sender_id='DockCity'  # use 'AFRICASTKNG' in sandbox
        )
        print(f'SMS sent: {response}')
        return response
    except Exception as e:
        print(f'SMS error: {e}')
        return {'error': str(e)}


# ─── Notification triggers ────────────────────────────────────────────────────

def notify_host_application_approved(host):
    message = (
        f'Hello {host.full_name},\n\n'
        f'Your StayHaki host application has been APPROVED!\n\n'
        f'You can now create your first listing.\n'
        f'Log in at stayhaki.com to get started.\n\n'
        f'- StayHaki Team'
    )
    send_sms(host.phone_number, message)


def notify_host_application_rejected(host, reason):
    message = (
        f'Hello {host.full_name},\n\n'
        f'Your StayHaki host application was not approved.\n\n'
        f'Reason: {reason}\n\n'
        f'Contact support for more info.\n'
        f'- StayHaki Team'
    )
    send_sms(host.phone_number, message)


def notify_host_new_booking(booking):
    host = booking.listing.host
    message = (
        f'Hello {host.full_name},\n\n'
        f'New booking request!\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {booking.guest.full_name}\n'
        f'Dates: {booking.check_in_date} to {booking.check_out_date}\n'
        f'Payout: KES {booking.host_payout_kes:,}\n\n'
        f'You have 2 hours to accept or decline.\n'
        f'Log in to your dashboard to respond.\n\n'
        f'- StayHaki'
    )
    send_sms(host.phone_number, message)


def notify_guest_booking_confirmed(booking):
    guest = booking.guest
    listing = booking.listing
    message = (
        f'Hello {guest.full_name},\n\n'
        f'Your booking is CONFIRMED!\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Property: {listing.title}\n'
        f'Location: {listing.neighborhood}, Nairobi\n'
        f'Check-in: {booking.check_in_date}\n'
        f'Check-out: {booking.check_out_date}\n\n'
        f'Your funds are held in escrow until you confirm check-in.\n\n'
        f'- StayHaki'
    )
    send_sms(guest.phone_number, message)


def notify_guest_booking_declined(booking):
    guest = booking.guest
    message = (
        f'Hello {guest.full_name},\n\n'
        f'Your booking {booking.reference_code} was declined by the host.\n\n'
        f'A full refund of KES {booking.total_amount_kes:,} will be processed shortly.\n\n'
        f'Please search for another listing on StayHaki.\n\n'
        f'- StayHaki'
    )
    send_sms(guest.phone_number, message)


def notify_both_auto_cancelled(booking):
    guest = booking.guest
    host = booking.listing.host

    send_sms(guest.phone_number,
        f'Hello {guest.full_name},\n\n'
        f'Your booking {booking.reference_code} was auto-cancelled '
        f'because the host did not respond within 2 hours.\n\n'
        f'A full refund of KES {booking.total_amount_kes:,} will be processed shortly.\n\n'
        f'- StayHaki'
    )

    send_sms(host.phone_number,
        f'Hello {host.full_name},\n\n'
        f'Booking {booking.reference_code} was auto-cancelled because '
        f'you did not respond within 2 hours.\n\n'
        f'Please respond to bookings promptly to avoid penalties.\n\n'
        f'- StayHaki'
    )


def notify_host_checkin_confirmed(booking):
    host = booking.listing.host
    message = (
        f'Hello {host.full_name},\n\n'
        f'Your guest {booking.guest.full_name} has confirmed check-in '
        f'for booking {booking.reference_code}.\n\n'
        f'Your payout of KES {booking.host_payout_kes:,} will be '
        f'released at {booking.escrow_release_at.strftime("%d %b %Y %H:%M")}.\n\n'
        f'- StayHaki'
    )
    send_sms(host.phone_number, message)


def notify_dispute_raised(booking):
    host = booking.listing.host
    message = (
        f'Hello {host.full_name},\n\n'
        f'A dispute has been raised for booking {booking.reference_code}.\n\n'
        f'Our team is reviewing the case. Please log in to your '
        f'dashboard and await further instructions.\n\n'
        f'- StayHaki'
    )
    send_sms(host.phone_number, message)


def notify_dispute_resolved(booking, dispute):
    guest = booking.guest
    host = booking.listing.host

    send_sms(guest.phone_number,
        f'Hello {guest.full_name},\n\n'
        f'Your dispute for booking {booking.reference_code} has been resolved.\n\n'
        f'Outcome: {dispute.resolution_details}\n\n'
        f'- StayHaki'
    )

    send_sms(host.phone_number,
        f'Hello {host.full_name},\n\n'
        f'The dispute for booking {booking.reference_code} has been resolved.\n\n'
        f'Outcome: {dispute.resolution_details}\n\n'
        f'- StayHaki'
    )


def notify_host_payout_released(booking):
    host = booking.listing.host
    message = (
        f'Hello {host.full_name},\n\n'
        f'Your payout for booking {booking.reference_code} has been sent!\n\n'
        f'Amount: KES {booking.host_payout_kes:,}\n'
        f'M-Pesa Ref: {booking.mpesa_transaction_code}\n\n'
        f'Thank you for hosting on DockCity!\n\n'
        f'- DockCity'
    )
    send_sms(host.phone_number, message)


def notify_review_prompt(booking):
    guest = booking.guest
    host = booking.listing.host

    send_sms(guest.phone_number,
        f'Hello {guest.full_name},\n\n'
        f'How was your stay at {booking.listing.title}?\n\n'
        f'Please leave a review on DockCity!\n\n'
        f'- DockCity'
    )

    send_sms(host.phone_number,
        f'Hello {host.full_name},\n\n'
        f'Booking {booking.reference_code} is complete.\n\n'
        f'Please review your guest {guest.full_name} on DockCity!\n\n'
        f'- DockCity'
    )