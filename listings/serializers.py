from rest_framework import serializers
from .models import Listing


class ListingSerializer(serializers.ModelSerializer):
    host_name = serializers.CharField(source='host.full_name', read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id', 'host', 'host_name', 'title', 'description',
            'neighborhood', 'city', 'area_description',
            'price_per_night_kes', 'price_per_week_kes', 'price_per_month_kes',
            'max_guests', 'bedrooms', 'bathrooms',
            'amenities', 'house_rules', 'photos',
            'verification_badges', 'status',
            'average_rating', 'total_reviews', 'created_at'
        ]
        read_only_fields = [
            'id', 'host', 'status', 'average_rating',
            'total_reviews', 'created_at',
        ]


class ListingDetailSerializer(ListingSerializer):
    pass


class ListingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = [
            'title', 'description', 'neighborhood', 'city',
            'full_address', 'area_description',
            'latitude', 'longitude',  # from map picker
            'caretaker_name', 'caretaker_phone',
            'price_per_night_kes', 'price_per_week_kes', 'price_per_month_kes',
            'max_guests', 'bedrooms', 'bathrooms',
            'amenities', 'house_rules', 'photos',
        ]

    def validate_photos(self, value):
        if len(value) < 5:
            raise serializers.ValidationError('At least 5 photos are required.')
        return value