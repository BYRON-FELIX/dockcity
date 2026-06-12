from rest_framework import serializers
from .models import Dispute


class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.full_name', read_only=True)
    booking_reference = serializers.CharField(source='booking.reference_code', read_only=True)

    class Meta:
        model = Dispute
        fields = [
            'id', 'booking', 'booking_reference',
            'raised_by', 'raised_by_name',
            'reason', 'evidence_photo_urls', 'status',
            'admin_notes', 'resolution_details',
            'resolved_by', 'resolved_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'raised_by', 'status', 'admin_notes',
            'resolution_details', 'resolved_by', 'resolved_at', 'created_at'
        ]


class DisputeCreateSerializer(serializers.Serializer):
    booking_id = serializers.UUIDField()
    reason = serializers.CharField()
    evidence_photo_urls = serializers.ListField(
        child=serializers.URLField(), required=False, default=list
    )


class DisputeResolveSerializer(serializers.Serializer):
    resolution = serializers.ChoiceField(choices=[
        'resolved_for_guest',
        'resolved_for_host',
        'resolved_partial',
    ])
    admin_notes = serializers.CharField()
    resolution_details = serializers.CharField()