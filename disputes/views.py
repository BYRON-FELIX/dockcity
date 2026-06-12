from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from core.sms import notify_dispute_raised, notify_dispute_resolved
from .models import Dispute
from .serializers import DisputeSerializer, DisputeCreateSerializer, DisputeResolveSerializer
from bookings.models import Booking


class RaiseDisputeView(APIView):
    """Guest raises a dispute within 24hrs of check-in confirmation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DisputeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        booking = get_object_or_404(Booking, pk=data['booking_id'], guest=request.user)

        # Must be checked in
        if booking.status != 'checked_in':
            return Response(
                {'error': 'You can only raise a dispute after confirming check-in.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Must be within 24hr dispute window
        if booking.checked_in_at:
            hours_since_checkin = (timezone.now() - booking.checked_in_at).total_seconds() / 3600
            if hours_since_checkin > 24:
                return Response(
                    {'error': 'Dispute window has closed. You had 24 hours after check-in.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Only one dispute per booking
        if hasattr(booking, 'dispute'):
            return Response(
                {'error': 'A dispute has already been raised for this booking.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute = Dispute.objects.create(
            booking=booking,
            raised_by=request.user,
            reason=data['reason'],
            evidence_photo_urls=data['evidence_photo_urls'],
        )

        # Update booking status
        booking.status = 'disputed'
        booking.save()

        # TODO: WhatsApp notification to host + admin
        from core.sms import notify_dispute_raised
        notify_dispute_raised(booking)

        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


class AdminDisputeListView(APIView):
    """Admin views all disputes."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        disputes = Dispute.objects.all()
        serializer = DisputeSerializer(disputes, many=True)
        return Response(serializer.data)


class AdminDisputeResolveView(APIView):
    """Admin resolves a dispute."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        dispute = get_object_or_404(Dispute, pk=pk)

        if dispute.status not in ['open', 'under_review']:
            return Response(
                {'error': 'This dispute has already been resolved.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = DisputeResolveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        dispute.status = data['resolution']
        dispute.admin_notes = data['admin_notes']
        dispute.resolution_details = data['resolution_details']
        dispute.resolved_by = request.user
        dispute.resolved_at = timezone.now()
        dispute.save()

        # Update booking status to completed
        dispute.booking.status = 'completed'
        dispute.booking.save()

        # TODO: WhatsApp notifications to both parties
        from core.sms import notify_dispute_resolved
        notify_dispute_resolved(dispute.booking, dispute)

        return Response(DisputeSerializer(dispute).data)