from rest_framework import serializers

from .models import PropertySale, ViewingRequest


class PropertySaleSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.full_name', read_only=True)

    class Meta:
        model = PropertySale
        fields = [
            'id', 'seller', 'seller_name', 'title', 'description',
            'property_type', 'neighborhood', 'city', 'area_description',
            'bedrooms', 'bathrooms', 'size_sqft',
            'sale_price_kes', 'is_also_for_rent', 'monthly_rent_kes',
            'installments_available', 'photos', 'amenities',
            'latitude', 'longitude',
            'seller_phone', 'seller_whatsapp',
            'status', 'verification_badges', 'created_at',
        ]
        read_only_fields = ['id', 'seller', 'status', 'created_at']


class PropertySaleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertySale
        fields = [
            'title', 'description', 'property_type',
            'neighborhood', 'city', 'area_description',
            'full_address', 'bedrooms', 'bathrooms', 'size_sqft',
            'sale_price_kes', 'is_also_for_rent', 'monthly_rent_kes',
            'installments_available', 'photos', 'amenities',
            'latitude', 'longitude',
            'seller_phone', 'seller_whatsapp',
        ]

    def validate_photos(self, value):
        if len(value) < 3:
            raise serializers.ValidationError('At least 3 photos are required.')
        return value


class ViewingRequestSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)

    class Meta:
        model = ViewingRequest
        fields = [
            'id', 'property', 'property_title',
            'buyer_name', 'buyer_email', 'buyer_phone',
            'preferred_date', 'preferred_time', 'message',
            'status', 'admin_notes', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'admin_notes', 'created_at']
