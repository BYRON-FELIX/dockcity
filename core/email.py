import os
import resend


resend.api_key = os.getenv('RESEND_API_KEY')

FROM_EMAIL = os.getenv('FROM_EMAIL', 'Dock City <notifications@thedockcity.com>')


def send_email(to_email, subject, message, html_message=None):
    if not to_email:
        print('Email skipped - no recipient address.')
        return False

    try:
        params = {
            'from': FROM_EMAIL,
            'to': [to_email],
            'subject': subject,
            'text': message,
        }
        if html_message:
            params['html'] = html_message

        response = resend.Emails.send(params)
        print(f'Email sent to {to_email}: {subject} - ID: {response["id"]}')
        return True
    except Exception as exc:
        print(f'Email error sending to {to_email}: {exc}')
        return False


def send_to_admins(subject, message, html_message=None):
    admin_emails = set()

    # Prefer platform admin users over static env configuration.
    try:
        from users.models import User
        admin_user_emails = User.objects.filter(role='admin').exclude(email__isnull=True).values_list('email', flat=True)
        admin_emails.update(email for email in admin_user_emails if email)
    except Exception as exc:
        print(f'Could not load admin users for email notification: {exc}')

    fallback_admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL')
    if fallback_admin_email:
        admin_emails.add(fallback_admin_email)

    if not admin_emails:
        print('No platform admin emails found and no ADMIN_NOTIFICATION_EMAIL set - skipping admin notification.')
        return

    for admin_email in sorted(admin_emails):
        send_email(admin_email, subject, message, html_message)


def notify_host_application_submitted(host):
    """Host submits application - notify host + admin."""
    send_email(
        host.email,
        'Your Dock City host application has been received',
        f"Hello {host.full_name},\n\n"
        "We've received your application to become a host on Dock City.\n\n"
        "Our team will review it and get back to you within 24-48 hours.\n\n"
        "You'll be notified by email once a decision has been made.\n\n"
        ' - Dock City Team',
        html_message=(
            f'<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">'
            '<h2 style="color:#E8A020;">Application Received</h2>'
            f'<p>Hello {host.full_name},</p>'
            "<p>We've received your application to become a host on <strong>Dock City</strong>.</p>"
            '<p>Our team will review it and get back to you within <strong>24-48 hours</strong>.</p>'
            '<p style="color:#999;font-size:12px;margin-top:24px;"> - Dock City Team</p>'
            '</div>'
        ),
    )

    send_to_admins(
        f'[Admin] New host application - {host.full_name}',
        f'A new host application has been submitted.\n\n'
        f'Name: {host.full_name}\n'
        f'Email: {host.email}\n'
        f'Phone: {host.phone_number}\n\n'
        'Log in to the Admin Panel to review and approve or reject.\n'
        'https://thedockcity.com/admin-panel',
    )


def notify_host_application_approved(host):
    """Admin approves host - notify host."""
    send_email(
        host.email,
        'Congratulations - your Dock City host application is approved!',
        f"Hello {host.full_name},\n\n"
        'Great news! Your application to become a host on Dock City has been approved.\n\n'
        'You can now create your first listing and start receiving bookings.\n\n'
        'Log in at https://thedockcity.com to get started.\n\n'
        ' - Dock City Team',
        html_message=(
            '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">'
            "<h2 style='color:#E8A020;'>You're Approved!</h2>"
            f'<p>Hello {host.full_name},</p>'
            "<p>Your application to become a host on <strong>Dock City</strong> has been <strong style='color:#22c55e;'>approved</strong>.</p>"
            '<p>You can now create your first listing and start receiving bookings.</p>'
            '<a href="https://thedockcity.com/dashboard/host" '
            'style="display:inline-block;background:#E8A020;color:#000;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">'
            'Go to Host Dashboard</a>'
            '<p style="color:#999;font-size:12px;margin-top:24px;"> - Dock City Team</p>'
            '</div>'
        ),
    )


def notify_host_application_rejected(host, reason):
    """Admin rejects host - notify host with reason."""
    send_email(
        host.email,
        'Update on your Dock City host application',
        f"Hello {host.full_name},\n\n"
        'Thank you for applying to become a host on Dock City.\n\n'
        'Unfortunately, we were unable to approve your application at this time.\n\n'
        f'Reason: {reason}\n\n'
        'If you believe this is a mistake or would like to reapply after addressing the above, '
        'please contact us at support@thedockcity.com.\n\n'
        ' - Dock City Team',
        html_message=(
            '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">'
            '<h2 style="color:#0A0A0A;">Application Update</h2>'
            f'<p>Hello {host.full_name},</p>'
            '<p>Thank you for applying to become a host on <strong>Dock City</strong>.</p>'
            '<p>Unfortunately, we were unable to approve your application at this time.</p>'
            '<div style="background:#f9f9f9;border-left:4px solid #E8A020;padding:12px 16px;margin:16px 0;">'
            f'<p style="margin:0;color:#333;"><strong>Reason:</strong> {reason}</p>'
            '</div>'
            '<p>Contact us at <a href="mailto:support@thedockcity.com">support@thedockcity.com</a> '
            'if you would like to discuss further or reapply.</p>'
            '<p style="color:#999;font-size:12px;margin-top:24px;"> - Dock City Team</p>'
            '</div>'
        ),
    )


def notify_payment_confirmed(booking):
    """Payment webhook fires - notify guest, host, and admin."""
    listing = booking.listing
    host = listing.host
    guest = booking.guest

    send_email(
        guest.email,
        f'Payment received - waiting for host confirmation ({booking.reference_code})',
        f"Hello {guest.full_name},\n\n"
        f'Your payment of KES {booking.total_amount_kes:,} has been received.\n\n'
        f'Booking ref: {booking.reference_code}\n'
        f'Property: {listing.title}, {listing.neighborhood}\n'
        f'Check-in: {booking.check_in_date}\n'
        f'Check-out: {booking.check_out_date}\n\n'
        'The host has up to 2 hours to confirm your booking. You will be notified immediately once they respond.\n\n'
        ' - Dock City Team',
    )

    send_email(
        host.email,
        f'New booking request - {booking.reference_code}',
        f"Hello {host.full_name},\n\n"
        'You have a new booking request!\n\n'
        f'Booking ref: {booking.reference_code}\n'
        f'Guest: {guest.full_name}\n'
        f'Property: {listing.title}\n'
        f'Check-in: {booking.check_in_date}\n'
        f'Check-out: {booking.check_out_date}\n'
        f'Your payout: KES {booking.host_payout_kes:,}\n\n'
        'You have 2 hours to accept or decline. Log in to your dashboard now.\n'
        'https://thedockcity.com/dashboard/host\n\n'
        ' - Dock City Team',
    )

    send_to_admins(
        f'[Admin] Payment received - {booking.reference_code}',
        f'A guest has completed payment.\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {guest.full_name} ({guest.email})\n'
        f'Host: {host.full_name} ({host.email})\n'
        f'Property: {listing.title}\n'
        f'Amount: KES {booking.total_amount_kes:,}\n'
        f'M-Pesa: {booking.mpesa_transaction_code}\n'
        f'Check-in: {booking.check_in_date} -> Check-out: {booking.check_out_date}\n\n'
        'Host has 2 hours to respond.',
    )


def notify_booking_confirmed(booking):
    """Host accepts - notify guest and admin."""
    listing = booking.listing
    guest = booking.guest
    host = listing.host

    send_email(
        guest.email,
        f'Booking confirmed! - {booking.reference_code}',
        f"Hello {guest.full_name},\n\n"
        'Great news! Your booking has been confirmed by the host.\n\n'
        f'Booking ref: {booking.reference_code}\n'
        f'Property: {listing.title}, {listing.neighborhood}\n'
        f'Check-in: {booking.check_in_date}\n'
        f'Check-out: {booking.check_out_date}\n\n'
        'Log in to My Trips to view your full receipt including address and caretaker contact.\n'
        'https://thedockcity.com/dashboard/guest\n\n'
        ' - Dock City Team',
    )

    send_email(
        host.email,
        f'You confirmed booking {booking.reference_code}',
        f"Hello {host.full_name},\n\n"
        f"You've confirmed the booking for {listing.title}.\n\n"
        f'Guest: {guest.full_name}\n'
        f'Check-in: {booking.check_in_date}\n'
        f'Check-out: {booking.check_out_date}\n'
        f'Your payout: KES {booking.host_payout_kes:,} (released after guest confirms check-in)\n\n'
        ' - Dock City Team',
    )

    send_to_admins(
        f'[Admin] Booking confirmed - {booking.reference_code}',
        f'Host confirmed a booking.\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {guest.full_name}\n'
        f'Host: {host.full_name}\n'
        f'Property: {listing.title}\n'
        f'Dates: {booking.check_in_date} -> {booking.check_out_date}\n'
        f'Amount: KES {booking.total_amount_kes:,}',
    )


def notify_guest_checkin(booking):
    """Guest confirms check-in - notify guest, host, admin."""
    listing = booking.listing
    guest = booking.guest
    host = listing.host

    send_email(
        guest.email,
        f'Check-in confirmed - enjoy your stay! ({booking.reference_code})',
        f"Hello {guest.full_name},\n\n"
        f'Your check-in at {listing.title} has been confirmed.\n\n'
        'If you have any issues within the first 24 hours, you can raise a dispute directly from your My Trips dashboard.\n\n'
        'Enjoy your stay!\n\n'
        ' - Dock City Team',
    )

    send_email(
        host.email,
        f'Guest checked in - {booking.reference_code}',
        f"Hello {host.full_name},\n\n"
        f'{guest.full_name} has confirmed check-in at {listing.title}.\n\n'
        f'Your payout of KES {booking.host_payout_kes:,} will be released '
        f'at {booking.escrow_release_at.strftime("%d %b %Y %H:%M") if booking.escrow_release_at else "the scheduled time"}.\n\n'
        ' - Dock City Team',
    )

    send_to_admins(
        f'[Admin] Guest checked in - {booking.reference_code}',
        f'Guest has confirmed check-in.\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {guest.full_name}\n'
        f'Host: {host.full_name}\n'
        f'Property: {listing.title}\n'
        f'Escrow releases: {booking.escrow_release_at}',
    )


def notify_booking_completed(booking):
    """Booking completes (escrow released) - notify guest and host."""
    listing = booking.listing
    guest = booking.guest
    host = listing.host

    send_email(
        guest.email,
        f'Your stay at {listing.title} is complete - leave a review!',
        f"Hello {guest.full_name},\n\n"
        f'Your stay at {listing.title} is now complete. We hope you had a great time!\n\n'
        'Please take a moment to leave a review - it helps other guests and rewards great hosts.\n\n'
        'https://thedockcity.com/dashboard/guest\n\n'
        ' - Dock City Team',
    )

    send_email(
        host.email,
        f'Booking {booking.reference_code} complete - payout incoming',
        f"Hello {host.full_name},\n\n"
        f'Booking {booking.reference_code} is now complete.\n\n'
        f'Your payout of KES {booking.host_payout_kes:,} will be sent to your M-Pesa shortly.\n\n'
        f'Please also take a moment to review your guest {guest.full_name}.\n\n'
        'https://thedockcity.com/dashboard/host\n\n'
        ' - Dock City Team',
    )


def notify_dispute_raised(booking, dispute):
    """Guest raises dispute - notify host and admin."""
    host = booking.listing.host
    guest = booking.guest

    send_email(
        host.email,
        f'Dispute raised for booking {booking.reference_code}',
        f"Hello {host.full_name},\n\n"
        f'A guest has raised a dispute for booking {booking.reference_code}.\n\n'
        f'Guest: {guest.full_name}\n'
        f'Property: {booking.listing.title}\n'
        f'Reason: {dispute.reason}\n\n'
        'Please review and await admin resolution updates.\n\n'
        ' - Dock City Team',
    )

    send_to_admins(
        f'[Admin] New dispute raised - {booking.reference_code}',
        f'A guest has raised a new dispute.\n\n'
        f'Ref: {booking.reference_code}\n'
        f'Guest: {guest.full_name} ({guest.email})\n'
        f'Host: {host.full_name} ({host.email})\n'
        f'Property: {booking.listing.title}\n'
        f'Reason: {dispute.reason}\n\n'
        'Please review and resolve this dispute from the admin panel.',
    )


def notify_payout_sent(booking):
    """Admin marks payout sent - notify host."""
    listing = booking.listing
    host = listing.host

    send_email(
        host.email,
        f'Your payout has been sent - KES {booking.host_payout_kes:,}',
        f"Hello {host.full_name},\n\n"
        f'Your payout for booking {booking.reference_code} has been sent to your M-Pesa.\n\n'
        f'Amount: KES {booking.host_payout_kes:,}\n'
        f'Property: {listing.title}\n\n'
        'Thank you for hosting on Dock City!\n\n'
        ' - Dock City Team',
        html_message=(
            '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">'
            '<h2 style="color:#E8A020;">Payout Sent</h2>'
            f'<p>Hello {host.full_name},</p>'
            f'<p>Your payout for booking <strong>{booking.reference_code}</strong> has been sent.</p>'
            f'<p style="font-size:24px;font-weight:bold;color:#E8A020;">KES {booking.host_payout_kes:,}</p>'
            '<p>Check your M-Pesa - it should arrive within minutes.</p>'
            '<p style="color:#999;font-size:12px;margin-top:24px;"> - Dock City Team</p>'
            '</div>'
        ),
    )


def notify_guest_booking_declined_email(booking, reason):
    guest = booking.guest
    listing = booking.listing
    subject = f'Your Dock City booking was declined - {booking.reference_code}'
    message = (
        f'Hello {guest.full_name},\n\n'
        f'Unfortunately, the host for "{listing.title}" was unable to accept your booking.\n\n'
        f'Booking reference: {booking.reference_code}\n'
        f'Reason given: {reason}\n\n'
        f'A full refund of KES {booking.total_amount_kes:,} is being processed and will reach you shortly.\n\n'
        f'You can browse other verified stays in {listing.neighborhood} or elsewhere in Nairobi at thedockcity.com.\n\n'
        "We're sorry for the inconvenience.\n\n"
        ' - Dock City Team'
    )

    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0A0A0A;">Booking Declined</h2>
        <p>Hello {guest.full_name},</p>
        <p>Unfortunately, the host for <strong>{listing.title}</strong> was unable to accept your booking.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #666;">Booking Ref</td><td style="padding: 6px 0; font-weight: bold;">{booking.reference_code}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Reason</td><td style="padding: 6px 0;">{reason}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Refund Amount</td><td style="padding: 6px 0; font-weight: bold; color: #E8A020;">KES {booking.total_amount_kes:,}</td></tr>
        </table>
        <p>A full refund is being processed and will reach you shortly.</p>
        <p>You can browse other verified stays at <a href="https://thedockcity.com">thedockcity.com</a>.</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;"> - Dock City Team</p>
    </div>
    """

    send_email(guest.email, subject, message, html_message)


def notify_admin_booking_declined_email(booking, reason, admin_email):
    subject = f'[Admin] Booking declined - {booking.reference_code}'
    message = (
        f'A host has declined a booking.\n\n'
        f'Booking ref: {booking.reference_code}\n'
        f'Guest: {booking.guest.full_name} ({booking.guest.email})\n'
        f'Host: {booking.listing.host.full_name} ({booking.listing.host.email})\n'
        f'Listing: {booking.listing.title}\n'
        f'Amount: KES {booking.total_amount_kes:,}\n'
        f'Reason: {reason}\n\n'
        'Guest needs a refund processed. Check the admin panel.\n'
    )
    send_email(admin_email, subject, message)


def notify_admin_payment_received_email(booking, admin_email):
    subject = f'[Admin] Payment received - {booking.reference_code}'
    message = (
        f'A payment has been received for a booking.\n\n'
        f'Booking ref: {booking.reference_code}\n'
        f'Guest: {booking.guest.full_name} ({booking.guest.email})\n'
        f'Host: {booking.listing.host.full_name} ({booking.listing.host.email})\n'
        f'Listing: {booking.listing.title}\n'
        f'Amount: KES {booking.total_amount_kes:,}\n'
        f'M-Pesa transaction: {booking.mpesa_transaction_code}\n'
        f'Status: {booking.status}\n\n'
        'Please review the booking in the admin panel if needed.\n'
    )
    send_email(admin_email, subject, message)
