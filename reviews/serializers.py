from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.full_name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'reviewer', 'reviewer_name',
            'reviewee', 'rating', 'comment',
            'is_visible', 'host_reply', 'submitted_at'
        ]
        read_only_fields = [
            'id', 'reviewer', 'reviewee',
            'is_visible', 'submitted_at'
        ]


class ReviewCreateSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField()


class HostReplySerializer(serializers.Serializer):
    host_reply = serializers.CharField()