from rest_framework import serializers
from .models import Booking
from listings.serializers import ListingSerializer
from users.serializers import UserSerializer


class BookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    listing_neighborhood = serializers.CharField(source='listing.neighborhood', read_only=True)
    listing_photo = serializers.SerializerMethodField()
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    guest_average_rating = serializers.DecimalField(
        source='guest.guest_average_rating',
        max_digits=3,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    guest_rating_count = serializers.IntegerField(source='guest.guest_rating_count', read_only=True)
    guest_recent_host_reviews = serializers.SerializerMethodField()

    def get_listing_photo(self, obj):
        return obj.listing.photos.first().image.url if obj.listing.photos.exists() else None

    class Meta:
        model = Booking
        fields = [
            'id', 'reference_code',
            'listing', 'listing_title', 'listing_neighborhood', 'listing_photo',
            'guest', 'guest_name', 'guest_average_rating', 'guest_rating_count', 'guest_recent_host_reviews',
            'check_in_date', 'check_out_date', 'check_in_time', 'check_out_time',
            'is_hourly_booking', 'hourly_duration', 'total_nights',
            'total_amount_kes', 'platform_fee_kes', 'host_payout_kes',
            'status', 'mpesa_transaction_code',
            'host_confirmed_at', 'checked_in_at',
            'escrow_release_at', 'payout_sent_at',
            'cancellation_reason', 'created_at'
        ]
        read_only_fields = fields

    def get_guest_recent_host_reviews(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []

        # Only expose this detail to the host handling the booking.
        if request.user.id != obj.listing.host_id:
            return []

        from reviews.models import Review

        qs = (
            Review.objects
            .filter(reviewee=obj.guest, is_visible=True, reviewer__role='host')
            .exclude(reviewer=request.user)
            .order_by('-submitted_at')[:3]
        )

        return [
            {
                'id': str(r.id),
                'rating': r.rating,
                'comment': r.comment,
                'reviewer_name': r.reviewer.full_name,
                'submitted_at': r.submitted_at,
            }
            for r in qs
        ]

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
        is_hourly = str(self.initial_data.get('is_hourly_booking', '')).lower() in ['true', '1', 'yes']
        if is_hourly:
            if data['check_out_date'] != data['check_in_date']:
                raise serializers.ValidationError('Hourly bookings must start and end on the same date.')
        elif data['check_out_date'] <= data['check_in_date']:
            raise serializers.ValidationError('Check-out must be after check-in.')
        return data