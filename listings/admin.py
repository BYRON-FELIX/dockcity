from django.contrib import admin
from .models import Listing, ListingAvailability, Neighborhood

admin.site.register(Listing)
admin.site.register(ListingAvailability)

@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ['name', 'city', 'is_active']
    list_filter = ['city', 'is_active']
    search_fields = ['name']