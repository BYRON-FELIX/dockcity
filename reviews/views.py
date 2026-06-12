from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer, HostReplySerializer
from bookings.models import Booking


class SubmitReviewView(APIView):
    """
    Guest or host submits a review after a completed booking.
    Reviews are double-blind — neither party sees the other's
    review until both have submitted.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        booking = get_object_or_404(Booking, pk=data['booking_id'])

        # Only completed bookings can generate reviews
        if booking.status != 'completed':
            return Response(
                {'error': 'Reviews can only be submitted for completed bookings.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Reviewer must be guest or host of this booking
        user = request.user
        if user == booking.guest:
            reviewee = booking.listing.host
        elif user == booking.listing.host:
            reviewee = booking.guest
        else:
            return Response({'error': 'You are not part of this booking.'}, status=status.HTTP_403_FORBIDDEN)

        # One review per booking per user
        if Review.objects.filter(booking=booking, reviewer=user).exists():
            return Response(
                {'error': 'You have already submitted a review for this booking.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review = Review.objects.create(
            booking=booking,
            reviewer=user,
            reviewee=reviewee,
            rating=data['rating'],
            comment=data['comment'],
            is_visible=False,
        )

        # If both parties have now reviewed — make both visible
        both_reviewed = Review.objects.filter(booking=booking).count() == 2
        if both_reviewed:
            Review.objects.filter(booking=booking).update(is_visible=True)

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ListingReviewsView(APIView):
    """Public — visible reviews for a listing."""
    permission_classes = []

    def get(self, request, listing_pk):
        reviews = Review.objects.filter(
            booking__listing_id=listing_pk,
            is_visible=True
        )
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)


class HostReplyView(APIView):
    """Host replies to a visible review."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        review = get_object_or_404(Review, pk=pk)

        if request.user != review.booking.listing.host:
            return Response({'error': 'Only the host can reply to this review.'}, status=status.HTTP_403_FORBIDDEN)

        if not review.is_visible:
            return Response({'error': 'Review is not yet visible.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = HostReplySerializer(data=request.data)
        if serializer.is_valid():
            review.host_reply = serializer.validated_data['host_reply']
            review.save()
            return Response(ReviewSerializer(review).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)