from rest_framework import serializers
from .models import User, HostProfile


class UserSerializer(serializers.ModelSerializer):
    host_profile_status = serializers.SerializerMethodField()
    host_profile_trust_level = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role',
            'phone_number',
            'is_active', 'created_at',
            'host_profile_status', 'host_profile_trust_level',
            'guest_average_rating', 'guest_rating_count',
        ]
        read_only_fields = ['id', 'is_active', 'created_at', 'guest_average_rating', 'guest_rating_count']

    def get_host_profile_status(self, obj):
        if hasattr(obj, 'host_profile'):
            return obj.host_profile.status
        return None

    def get_host_profile_trust_level(self, obj):
        if hasattr(obj, 'host_profile'):
            return obj.host_profile.trust_level
        return None
class UploadIDSerializer(serializers.Serializer):
    id_document_type = serializers.ChoiceField(choices=['national_id', 'passport'])
    id_document_number = serializers.CharField(max_length=100)
    id_document_photo_url = serializers.URLField()
    selfie_photo_url = serializers.URLField()


class HostProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = HostProfile
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'trust_level', 'completed_bookings_count',
            'average_rating', 'approved_at', 'approved_by'
        ]