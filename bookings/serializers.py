from rest_framework import serializers
from .models import Booking
from listings.serializers import ListingSerializer
from users.serializers import UserSerializer


class BookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_neighborhood = serializers.CharField(source='listing.neighborhood', read_only=True)
    listing_photo = serializers.SerializerMethodField()
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)

    def get_listing_photo(self, obj):
        return obj.listing.photos.first().image.url if obj.listing.photos.exists() else None

    class Meta:
        model = Booking
        fields = [
            'id', 'reference_code',
            'listing', 'listing_title', 'listing_neighborhood', 'listing_photo',
            'guest', 'guest_name',
            'check_in_date', 'check_out_date', 'total_nights',
            'total_amount_kes', 'platform_fee_kes', 'host_payout_kes',
            'status', 'mpesa_transaction_code',
            'host_confirmed_at', 'checked_in_at',
            'escrow_release_at', 'payout_sent_at',
            'cancellation_reason', 'created_at'
        ]
        read_only_fields = fields
    def get_listing_photo(self, obj):
        photos = obj.listing.photos
        if photos and len(photos) > 0:
            return photos[0]
        return None


class BookingCreateSerializer(serializers.Serializer):
    listing_id = serializers.UUIDField()
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()
    guests = serializers.IntegerField(min_value=1)

    def validate(self, data):
        if data['check_out_date'] <= data['check_in_date']:
            raise serializers.ValidationError('Check-out must be after check-in.')
        return data