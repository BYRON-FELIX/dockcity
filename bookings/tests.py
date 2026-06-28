from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from bookings.models import Booking
from bookings.views import auto_complete_expired_bookings
from listings.models import Listing
from users.models import User


class AutoCompleteExpiredBookingsTests(TestCase):
	def setUp(self):
		self.host = User.objects.create_user(
			email='host@example.com',
			full_name='Host User',
			password='testpass123',
			role='host',
			phone_number='0712345678',
		)
		self.guest = User.objects.create_user(
			email='guest@example.com',
			full_name='Guest User',
			password='testpass123',
			role='guest',
			phone_number='0799999999',
		)
		self.listing = Listing.objects.create(
			host=self.host,
			title='Dock Apartment',
			description='Nice stay',
			neighborhood='Westlands',
			city='Nairobi',
			price_per_night_kes=5000,
			max_guests=2,
			bedrooms=1,
			bathrooms=1,
			amenities=['wifi'],
			photos=['https://example.com/photo.jpg'],
			status='live',
		)

	def _create_booking(self, **overrides):
		defaults = {
			'listing': self.listing,
			'guest': self.guest,
			'check_in_date': timezone.localdate() - timedelta(days=2),
			'check_out_date': timezone.localdate() - timedelta(days=1),
			'total_nights': 1,
			'total_amount_kes': 5000,
			'platform_fee_kes': 500,
			'host_payout_kes': 4500,
			'status': 'pending_payment',
		}
		defaults.update(overrides)
		return Booking.objects.create(**defaults)

	@patch('core.email.notify_booking_completed')
	def test_checked_in_with_expired_escrow_is_completed(self, mock_notify_completed):
		booking = self._create_booking(
			status='checked_in',
			escrow_release_at=timezone.now() - timedelta(minutes=1),
		)

		auto_complete_expired_bookings([booking])
		booking.refresh_from_db()

		self.assertEqual(booking.status, 'completed')
		mock_notify_completed.assert_called_once_with(booking)

	@patch('core.email.notify_booking_completed')
	def test_confirmed_with_past_checkout_is_completed(self, mock_notify_completed):
		booking = self._create_booking(
			status='confirmed',
			check_out_date=timezone.localdate() - timedelta(days=1),
		)

		auto_complete_expired_bookings([booking])
		booking.refresh_from_db()

		self.assertEqual(booking.status, 'completed')
		mock_notify_completed.assert_called_once_with(booking)

	@patch('core.sms.notify_both_auto_cancelled')
	def test_awaiting_host_past_two_hours_is_cancelled(self, mock_notify_cancelled):
		booking = self._create_booking(status='awaiting_host')
		booking.created_at = timezone.now() - timedelta(hours=3)
		booking.save(update_fields=['created_at'])

		auto_complete_expired_bookings([booking])
		booking.refresh_from_db()

		self.assertEqual(booking.status, 'cancelled')
		self.assertEqual(booking.cancellation_reason, 'Host did not respond within 2 hours.')
		mock_notify_cancelled.assert_called_once_with(booking)

	def test_pending_payment_with_expired_window_is_cancelled(self):
		booking = self._create_booking(
			status='pending_payment',
			payment_expires_at=timezone.now() - timedelta(minutes=1),
		)

		auto_complete_expired_bookings([booking])
		booking.refresh_from_db()

		self.assertEqual(booking.status, 'cancelled')
		self.assertEqual(booking.cancellation_reason, 'Payment window expired.')
