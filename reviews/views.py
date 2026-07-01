from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Avg
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer, HostReplySerializer
from bookings.models import Booking
from django.utils import timezone


def recalculate_ratings(reviewee):
    """Recalculate and store the average rating for the reviewed user."""
    reviews = Review.objects.filter(reviewee=reviewee, is_visible=True)
    avg = reviews.aggregate(Avg('rating'))['rating__avg']
    count = reviews.count()

    if reviewee.role == 'host' and hasattr(reviewee, 'host_profile'):
        reviewee.host_profile.average_rating = round(avg, 2) if avg else 0
        reviewee.host_profile.save()
    else:
        reviewee.guest_average_rating = round(avg, 2) if avg else None
        reviewee.guest_rating_count = count
        reviewee.save(update_fields=['guest_average_rating', 'guest_rating_count'])


class SubmitReviewView(APIView):
    """Guest or host submits a review after a completed booking."""
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
            is_visible=True,
        )
        recalculate_ratings(review.reviewee)

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


class AdminAllReviewsView(APIView):
    """Admin — list all reviews regardless of visibility, for moderation."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        reviews = Review.objects.all().order_by('-submitted_at')
        data = []
        for r in reviews:
            data.append({
                'id': r.id,
                'rating': r.rating,
                'comment': r.comment,
                'host_reply': r.host_reply,
                'is_visible': r.is_visible,
                'reviewer_name': r.reviewer.full_name,
                'reviewee_name': r.reviewee.full_name,
                'submitted_at': r.submitted_at,
            })
        return Response(data)


class AdminDeleteReviewView(APIView):
    """Admin — delete any review (e.g. abusive, fake, or inappropriate)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        review = get_object_or_404(Review, pk=pk)
        review.delete()

        return Response({'message': 'Review deleted.'}, status=status.HTTP_204_NO_CONTENT)
    
class HostReplyToReviewView(APIView):
    """Host replies to a review left about them. Only the affected host can reply."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk)

        # Only the host who was reviewed can reply
        if review.reviewee_id != request.user.id:
            return Response(
                {'error': 'You can only reply to reviews written about you.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not review.is_visible:
            return Response(
                {'error': 'This review is not visible yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if review.host_reply:
            return Response(
                {'error': 'You have already replied to this review.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reply_text = request.data.get('reply', '').strip()
        if not reply_text:
            return Response({'error': 'Reply cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        review.host_reply = reply_text
        review.save()

        return Response({'message': 'Reply posted.', 'host_reply': review.host_reply})
class HostReviewsListView(APIView):
    """Host — list reviews written about them, so they can reply."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = Review.objects.filter(reviewee=request.user, is_visible=True).order_by('-submitted_at')
        data = []
        for r in reviews:
            data.append({
                'id': r.id,
                'rating': r.rating,
                'comment': r.comment,
                'host_reply': r.host_reply,
                'reviewer_name': r.reviewer.full_name,
                'submitted_at': r.submitted_at,
            })
        return Response(data)