import uuid
from django.db import models
from users.models import User
from bookings.models import Booking


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.PROTECT, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='reviews_given')
    reviewee = models.ForeignKey(User, on_delete=models.PROTECT, related_name='reviews_received')
    rating = models.PositiveSmallIntegerField()  # 1-5
    comment = models.TextField()
    is_visible = models.BooleanField(default=False)  # false until both parties submit
    host_reply = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'Review by {self.reviewer.full_name} → {self.reviewee.full_name} ({self.rating}★)'