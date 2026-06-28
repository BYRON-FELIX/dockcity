import os
import requests

TEXTSMS_API_KEY = os.getenv('TEXTSMS_API_KEY')
TEXTSMS_PARTNER_ID = os.getenv('TEXTSMS_PARTNER_ID')
TEXTSMS_APP_TOKEN = os.getenv('TEXTSMS_APP_TOKEN')
TEXTSMS_SHORTCODE = os.getenv('TEXTSMS_SHORTCODE', 'TextSMS')
TEXTSMS_ENDPOINT = 'https://sms.textsms.co.ke/api/services/sendsms/'


def send_sms(phone_number, message):
    """Send SMS via TextSMS Kenya."""
    if not phone_number:
        print('SMS skipped - no phone number.')
        return False

    if not TEXTSMS_API_KEY or not TEXTSMS_PARTNER_ID:
        print('TEXTSMS_API_KEY or TEXTSMS_PARTNER_ID is missing - skipping SMS.')
        return False

    try:
        # Normalize phone number to 254XXXXXXXXX format
        phone = str(phone_number).strip().replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('+'):
            phone = phone[1:]
        elif not phone.startswith('254'):
            phone = '254' + phone

        payload = {
            'apikey': TEXTSMS_API_KEY,
            'partnerID': TEXTSMS_PARTNER_ID,
            'message': message,
            'shortcode': TEXTSMS_SHORTCODE,
            'mobile': phone,
        }

        # Keep compatibility with partner accounts configured to require app token.
        if TEXTSMS_APP_TOKEN:
            payload['token'] = TEXTSMS_APP_TOKEN

        response = requests.post(
            TEXTSMS_ENDPOINT,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=15,
        )
        print(f'TextSMS response: {response.status_code} - {response.text}')
        return response.status_code == 200
    except Exception as e:
        print(f'TextSMS error: {e}')
        return False


def send_sms_to_admin(message):
    """Send an SMS notification to platform admins (role='admin')."""
    admin_phones = set()

    # Prefer platform admin users over static env configuration.
    try:
        from users.models import User
        admin_user_phones = User.objects.filter(role='admin').exclude(phone_number__isnull=True).values_list('phone_number', flat=True)
        admin_phones.update(phone for phone in admin_user_phones if phone)
    except Exception as exc:
        print(f'Could not load admin users for SMS notification: {exc}')

    fallback_admin_phone = os.getenv('ADMIN_NOTIFICATION_PHONE')
    if fallback_admin_phone:
        admin_phones.add(fallback_admin_phone)

    if not admin_phones:
        print('No platform admin phone numbers found and no ADMIN_NOTIFICATION_PHONE set - skipping admin SMS notification.')
        return {'skipped': 'missing_admin_phone'}

    responses = []
    for admin_phone in sorted(admin_phones):
        responses.append(send_sms(admin_phone, message))
    return responses


# ─── Notification triggers ────────────────────────────────────────────────────

def notify_host_application_approved(host):
    message = (
        f'Dock City: Congratulations!\n'
        f'Your host application has been approved.\n'
        f'You can now list your properties.\n'
        f'thedockcity.com/dashboard/host'
    )
    send_sms(host.phone_number, message)


def notify_host_application_rejected(host, reason):
    message = (
        f'Dock City: Application Update\n'
        f'Your host application was not approved.\n'
        f'Reason: {reason}\n'
        f'Contact: support@thedockcity.com'
    )
    send_sms(host.phone_number, message)


def notify_host_new_booking(booking):
    host = booking.listing.host
    message = (
        f'Dock City: New booking request!\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {booking.guest.full_name}\n'
        f'Dates: {booking.check_in_date} to {booking.check_out_date}\n'
        f'Payout: KES {booking.host_payout_kes:,}\n'
        f'You have 2 hours to accept or decline.\n'
        f'thedockcity.com/dashboard/host'
    )
    send_sms(host.phone_number, message)


def notify_guest_payment_received(booking):
    guest = booking.guest
    message = (
        f'Dock City: Payment Received!\n'
        f'Ref: {booking.reference_code}\n'
        f'Thank you, your payment has been received.\n'
        f'Your host has up to 2 hours to confirm your booking.\n'
        f'Please be patient as they respond.'
    )
    send_sms(guest.phone_number, message)


def notify_guest_booking_confirmed(booking):
    guest = booking.guest
    listing = booking.listing
    host = listing.host
    message = (
        f'Dock City: Booking Confirmed!\n'
        f'Ref: {booking.reference_code}\n'
        f'Property: {listing.title}\n'
        f'Check-in: {booking.check_in_date}\n'
        f'Check-out: {booking.check_out_date}\n'
        f'View details: thedockcity.com/dashboard/guest'
    )
    send_sms(guest.phone_number, message)

    admin_message = (
        f'[Admin] Booking confirmed by host\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {guest.full_name}\n'
        f'Host: {host.full_name}\n'
        f'Property: {listing.title}\n'
        f'Dates: {booking.check_in_date} to {booking.check_out_date}\n'
        f'Amount: KES {booking.total_amount_kes:,}'
    )
    send_sms_to_admin(admin_message)


def notify_guest_booking_declined(booking):
    guest = booking.guest
    message = (
        f'Dock City: Booking Declined\n'
        f'Ref: {booking.reference_code}\n'
        f'Reason: {booking.cancellation_reason}\n'
        f'A full refund of KES {booking.total_amount_kes:,} is being processed.\n'
        f'Browse other stays: thedockcity.com'
    )
    send_sms(guest.phone_number, message)


def notify_both_auto_cancelled(booking):
    guest = booking.guest
    host = booking.listing.host

    send_sms(guest.phone_number,
        f'Dock City: Booking Auto-Cancelled\n'
        f'Ref: {booking.reference_code}\n'
        f'Host did not respond in time.\n'
        f'Full refund of KES {booking.total_amount_kes:,} being processed.'
    )

    send_sms(host.phone_number,
        f'Dock City: Booking Auto-Cancelled\n'
        f'Ref: {booking.reference_code}\n'
        f'You did not respond within 2 hours.\n'
        f'Please respond to bookings promptly.'
    )


def notify_host_checkin_confirmed(booking):
    host = booking.listing.host
    message = (
        f'Dock City: Guest Checked In\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {booking.guest.full_name} has confirmed check-in.\n'
        f'Payout of KES {booking.host_payout_kes:,} releasing soon.'
    )
    send_sms(host.phone_number, message)

    admin_message = (
        f'[Admin] Guest check-in confirmed\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {booking.guest.full_name}\n'
        f'Host: {host.full_name}\n'
        f'Property: {booking.listing.title}\n'
        f'Escrow release: {booking.escrow_release_at.strftime("%d %b %Y %H:%M")}'
    )
    send_sms_to_admin(admin_message)


def notify_dispute_raised(booking):
    host = booking.listing.host
    message = (
        f'Dock City: Dispute Raised\n'
        f'Booking: {booking.reference_code}\n'
        f'A guest has raised a dispute.\n'
        f'Our team will review within 24hrs.'
    )
    send_sms(host.phone_number, message)


def notify_dispute_resolved(booking, dispute):
    guest = booking.guest
    host = booking.listing.host

    send_sms(guest.phone_number,
        f'Dock City: Dispute Resolved\n'
        f'Booking: {booking.reference_code}\n'
        f'Outcome: {dispute.resolution_details}'
    )

    send_sms(host.phone_number,
        f'Dock City: Dispute Resolved\n'
        f'Booking: {booking.reference_code}\n'
        f'Outcome: {dispute.resolution_details}'
    )


def notify_host_payout_released(booking):
    host = booking.listing.host
    message = (
        f'Dock City: Payout Sent!\n'
        f'Booking: {booking.reference_code}\n'
        f'Amount: KES {booking.host_payout_kes:,}\n'
        f'Check your M-Pesa.'
    )
    send_sms(host.phone_number, message)


def notify_review_prompt(booking):
    guest = booking.guest
    host = booking.listing.host

    send_sms(guest.phone_number,
        f'Dock City: How was your stay at {booking.listing.title}?\n'
        f'Please leave a review on thedockcity.com.'
    )

    send_sms(host.phone_number,
        f'Dock City: Booking {booking.reference_code} is complete.\n'
        f'Please review your guest {guest.full_name} on thedockcity.com.'
    )