from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count

from core.sms import notify_host_application_approved, notify_host_application_rejected
from .models import User, HostProfile
from .serializers import UserSerializer, HostProfileSerializer
from bookings.models import Booking
from disputes.models import Dispute
from listings.models import Listing


def is_admin(user):
    return user.role == 'admin'


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        total_users = User.objects.count()
        total_hosts = User.objects.filter(role='host').count()
        total_guests = User.objects.filter(role='guest').count()
        total_listings = Listing.objects.filter(status='live').count()
        pending_listings = Listing.objects.filter(status='pending_review').count()
        total_bookings = Booking.objects.count()
        active_bookings = Booking.objects.filter(status__in=['confirmed', 'checked_in']).count()
        open_disputes = Dispute.objects.filter(status__in=['open', 'under_review']).count()
        pending_hosts = HostProfile.objects.filter(status='pending').count()

        total_revenue = Booking.objects.filter(
            status__in=['completed', 'checked_in']
        ).aggregate(total=Sum('platform_fee_kes'))['total'] or 0

        return Response({
            'users': {
                'total': total_users,
                'hosts': total_hosts,
                'guests': total_guests,
            },
            'listings': {
                'live': total_listings,
                'pending_review': pending_listings,
            },
            'bookings': {
                'total': total_bookings,
                'active': active_bookings,
            },
            'disputes': {
                'open': open_disputes,
            },
            'host_applications': {
                'pending': pending_hosts,
            },
            'platform_revenue_kes': total_revenue,
        })


class AdminHostApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        applications = HostProfile.objects.filter(status='pending')
        serializer = HostProfileSerializer(applications, many=True)
        return Response(serializer.data)


class AdminHostApplicationApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        profile = get_object_or_404(HostProfile, pk=pk)

        if profile.status != 'pending':
            return Response(
                {'error': f'Application is already {profile.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        profile.status = 'approved'
        profile.approved_at = timezone.now()
        profile.approved_by = request.user
        profile.save()

        from core.email import notify_host_application_approved as notify_host_application_approved_email
        from core.sms import notify_host_application_approved
        notify_host_application_approved(profile.user)
        notify_host_application_approved_email(profile.user)

        return Response({'message': f'Host {profile.user.full_name} approved successfully.'})


class AdminHostApplicationRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        profile = get_object_or_404(HostProfile, pk=pk)
        reason = request.data.get('reason', '')

        if not reason:
            return Response({'error': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.status = 'rejected'
        profile.rejection_reason = reason
        profile.save()

        from core.email import notify_host_application_rejected as notify_host_application_rejected_email
        from core.sms import notify_host_application_rejected
        notify_host_application_rejected(profile.user, reason)
        notify_host_application_rejected_email(profile.user, reason)

        return Response({'message': f'Host application rejected.'})


class AdminListingApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        listing = get_object_or_404(Listing, pk=pk)

        if listing.status != 'pending_review':
            return Response(
                {'error': f'Listing is not pending review. Current status: {listing.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        listing.status = 'live'
        listing.save()

        return Response({'message': f'Listing "{listing.title}" is now live.'})


class AdminListingSuspendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        listing = get_object_or_404(Listing, pk=pk)
        listing.status = 'suspended'
        listing.save()

        return Response({'message': f'Listing "{listing.title}" has been suspended.'})


class AdminUserSuspendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not is_admin(request.user):
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        user = get_object_or_404(User, pk=pk)

        if user.role == 'admin':
            return Response({'error': 'Cannot suspend an admin account.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = False
        user.save()

        return Response({'message': f'User {user.full_name} has been suspended.'})


