from django.contrib import admin
from .models import Listing, ListingAvailability, Neighborhood, Amenity

admin.site.register(Listing)
admin.site.register(ListingAvailability)

@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'is_active']
    list_filter = ['city', 'is_active']
    search_fields = ['name']


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ['name', 'applies_to', 'is_active', 'sort_order']
    list_filter = ['applies_to', 'is_active']
    search_fields = ['name']
    ordering = ['sort_order', 'name']