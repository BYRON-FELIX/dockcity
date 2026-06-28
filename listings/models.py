import uuid
from django.db import models
from users.models import User


class Listing(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('live', 'Live'),
        ('suspended', 'Suspended'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    title = models.CharField(max_length=255)
    description = models.TextField()
    neighborhood = models.CharField(max_length=100)
    city = models.CharField(max_length=100, default='Nairobi')

    # Full address — hidden until booking confirmed
    full_address = models.TextField(null=True, blank=True)
    # General area shown publicly
    area_description = models.CharField(max_length=255, null=True, blank=True)

    price_per_night_kes = models.PositiveIntegerField()
    price_per_week_kes = models.PositiveIntegerField(null=True, blank=True)
    price_per_month_kes = models.PositiveIntegerField(null=True, blank=True)

    is_hourly_available = models.BooleanField(default=False)
    hourly_pricing_type = models.CharField(
        max_length=20,
        choices=[('flat_rate', 'Flat Rate per Hour'), ('fixed_blocks', 'Fixed Time Blocks')],
        null=True,
        blank=True,
    )
    hourly_rate_kes = models.IntegerField(null=True, blank=True)
    hourly_min_hours = models.IntegerField(null=True, blank=True, default=2)
    hourly_blocks = models.JSONField(null=True, blank=True)
    long_stay_discounts = models.JSONField(null=True, blank=True)

    earliest_checkin_time = models.TimeField(default='14:00')
    latest_checkin_time = models.TimeField(default='22:00')
    earliest_checkout_time = models.TimeField(default='08:00')
    latest_checkout_time = models.TimeField(default='11:00')
    
    max_guests = models.PositiveIntegerField(default=1)
    bedrooms = models.PositiveIntegerField(default=1)
    bathrooms = models.PositiveIntegerField(default=1)

    amenities = models.JSONField(default=list)
    house_rules = models.TextField(null=True, blank=True)
    photos = models.JSONField(default=list)  # min 5 Cloudinary URLs
    verification_badges = models.JSONField(default=list)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Exact coordinates from map picker — hidden from public
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    caretaker_name = models.CharField(max_length=255, null=True, blank=True)
    caretaker_phone = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} — {self.neighborhood} ({self.status})'
    
class ListingAvailability(models.Model):
    """Dates manually blocked by host."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='blocked_dates')
    date = models.DateField()
    reason = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['listing', 'date']
        ordering = ['date']

    def __str__(self):
        return f'{self.listing.title} — {self.date} (blocked)'


class Neighborhood(models.Model):
    """Dynamically managed neighborhoods."""
    name = models.CharField(max_length=100, unique=True)
    city = models.CharField(max_length=100, default='Nairobi')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name}, {self.city}'
    
