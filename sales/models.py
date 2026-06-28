import uuid

from django.db import models

from users.models import User


class PropertySale(models.Model):
    PROPERTY_TYPES = [
        ('apartment', 'Apartment'),
        ('house', 'House'),
        ('townhouse', 'Townhouse'),
        ('land', 'Land'),
        ('commercial', 'Commercial'),
        ('villa', 'Villa'),
    ]

    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('live', 'Live'),
        ('sold', 'Sold'),
        ('suspended', 'Suspended'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties_for_sale')
    title = models.CharField(max_length=255)
    description = models.TextField()
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES, default='apartment')
    neighborhood = models.CharField(max_length=100)
    city = models.CharField(max_length=100, default='Nairobi')
    area_description = models.CharField(max_length=255, null=True, blank=True)
    full_address = models.TextField(null=True, blank=True)
    bedrooms = models.IntegerField(default=1)
    bathrooms = models.IntegerField(default=1)
    size_sqft = models.IntegerField(null=True, blank=True)

    # Pricing
    sale_price_kes = models.BigIntegerField()
    is_also_for_rent = models.BooleanField(default=False)
    monthly_rent_kes = models.BigIntegerField(null=True, blank=True)
    installments_available = models.BooleanField(default=False)

    # Media
    photos = models.JSONField(default=list)
    amenities = models.JSONField(default=list)

    # Location
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Contact
    seller_phone = models.CharField(max_length=20, null=True, blank=True)
    seller_whatsapp = models.CharField(max_length=20, null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    verification_badges = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} - {self.neighborhood}'


class ViewingRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('declined', 'Declined'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(PropertySale, on_delete=models.CASCADE, related_name='viewing_requests')
    buyer_name = models.CharField(max_length=255)
    buyer_email = models.EmailField()
    buyer_phone = models.CharField(max_length=20)
    preferred_date = models.DateField()
    preferred_time = models.TimeField(null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Viewing request for {self.property.title} by {self.buyer_name}'
