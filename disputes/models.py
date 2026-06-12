import uuid
from django.db import models
from users.models import User
from bookings.models import Booking


class Dispute(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('under_review', 'Under Review'),
        ('resolved_for_guest', 'Resolved for Guest'),
        ('resolved_for_host', 'Resolved for Host'),
        ('resolved_partial', 'Resolved Partial'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.PROTECT, related_name='dispute')
    raised_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='disputes_raised')
    reason = models.TextField()
    evidence_photo_urls = models.JSONField(default=list)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='open')
    admin_notes = models.TextField(null=True, blank=True)
    resolution_details = models.TextField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='disputes_resolved'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Dispute — {self.booking.reference_code} ({self.status})'