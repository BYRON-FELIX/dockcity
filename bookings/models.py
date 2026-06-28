import uuid
from django.db import models
from django.utils import timezone
from users.models import User
from listings.models import Listing


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('awaiting_host', 'Awaiting Host'),
        ('confirmed', 'Confirmed'),
        ('checked_in', 'Checked In'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('disputed', 'Disputed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.PROTECT, related_name='bookings')
    guest = models.ForeignKey(User, on_delete=models.PROTECT, related_name='guest_bookings')

    check_in_date = models.DateField()
    check_out_date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    is_hourly_booking = models.BooleanField(default=False)
    hourly_duration = models.IntegerField(null=True, blank=True)
    total_nights = models.PositiveIntegerField()
    total_amount_kes = models.PositiveIntegerField()
    platform_fee_kes = models.PositiveIntegerField()
    host_payout_kes = models.PositiveIntegerField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_payment')
    mpesa_transaction_code = models.CharField(max_length=50, null=True, blank=True)

    host_confirmed_at = models.DateTimeField(null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    escrow_release_at = models.DateTimeField(null=True, blank=True)
    payout_sent_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    REFUND_STATUS_CHOICES = [
        ('not_applicable', 'Not Applicable'),
        ('pending', 'Pending'),
        ('sent', 'Sent'),
    ]
    refund_status = models.CharField(max_length=20, choices=REFUND_STATUS_CHOICES, default='not_applicable')

    created_at = models.DateTimeField(auto_now_add=True)
    payment_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference_code} — {self.guest.full_name} → {self.listing.title}'

    def save(self, *args, **kwargs):
        if not self.reference_code:
            year = timezone.now().year
            last = Booking.objects.order_by('-created_at').first()
            if last and last.reference_code:
                try:
                    next_num = int(last.reference_code.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    next_num = 1
            else:
                next_num = 1
            self.reference_code = f'SH-{year}-{next_num:05d}'
        super().save(*args, **kwargs)