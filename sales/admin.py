from django.contrib import admin

from .models import PropertySale, ViewingRequest


@admin.register(PropertySale)
class PropertySaleAdmin(admin.ModelAdmin):
    list_display = ['title', 'seller', 'neighborhood', 'sale_price_kes', 'status', 'created_at']
    list_filter = ['status', 'property_type']
    search_fields = ['title', 'seller__email', 'neighborhood']


@admin.register(ViewingRequest)
class ViewingRequestAdmin(admin.ModelAdmin):
    list_display = ['property', 'buyer_name', 'buyer_email', 'preferred_date', 'status', 'created_at']
    list_filter = ['status']
