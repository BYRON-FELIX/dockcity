from rest_framework import serializers
from .models import Listing
from reviews.models import Review


class ListingSerializer(serializers.ModelSerializer):
    host_name = serializers.CharField(source='host.full_name', read_only=True)
    host_average_rating = serializers.SerializerMethodField()
    host_total_reviews = serializers.SerializerMethodField()

    def get_host_average_rating(self, obj):
        if hasattr(obj.host, 'host_profile'):
            return obj.host.host_profile.average_rating
        return None

    def get_host_total_reviews(self, obj):
        return Review.objects.filter(reviewee=obj.host, is_visible=True).count()

    class Meta:
        model = Listing
        fields = [
            'id', 'host', 'host_name', 'title', 'description',
            'neighborhood', 'city', 'area_description',
            'host_average_rating', 'host_total_reviews',
            'price_per_night_kes', 'price_per_week_kes', 'price_per_month_kes',
            'is_hourly_available', 'hourly_pricing_type',
            'hourly_rate_kes', 'hourly_min_hours', 'hourly_blocks', 'long_stay_discounts',
            'max_guests', 'bedrooms', 'bathrooms',
            'amenities', 'house_rules', 'photos',
            'verification_badges', 'status',
            'average_rating', 'total_reviews', 'created_at',
            'earliest_checkin_time', 'latest_checkin_time',
            'earliest_checkout_time', 'latest_checkout_time',
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
            'latitude', 'longitude',
            'caretaker_name', 'caretaker_phone',
            'earliest_checkin_time', 'latest_checkin_time',
            'earliest_checkout_time', 'latest_checkout_time',
            'is_hourly_available', 'hourly_pricing_type',
            'hourly_rate_kes', 'hourly_min_hours', 'hourly_blocks', 'long_stay_discounts',
            'price_per_night_kes', 'price_per_week_kes', 'price_per_month_kes',
            'max_guests', 'bedrooms', 'bathrooms',
            'amenities', 'house_rules', 'photos',
        ]

    def validate_photos(self, value):
        if len(value) < 5:
            raise serializers.ValidationError('At least 5 photos are required.')
        return value