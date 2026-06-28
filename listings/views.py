from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404
from decimal import Decimal
from .models import Listing, Neighborhood
from .serializers import ListingSerializer, ListingCreateSerializer, ListingDetailSerializer

class ListingListView(APIView):
    """Public — browse all live listings with filters."""
    permission_classes = [AllowAny]

    def get(self, request):
        listings = Listing.objects.filter(status='live')

        # Filters
        neighborhood = request.query_params.get('neighborhood')
        city = request.query_params.get('city')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        bedrooms = request.query_params.get('bedrooms')
        max_guests = request.query_params.get('max_guests')
        hourly_only = request.query_params.get('hourly')

        if neighborhood:
            listings = listings.filter(neighborhood__icontains=neighborhood)
        if city:
            listings = listings.filter(city__icontains=city)
        if min_price:
            listings = listings.filter(price_per_night_kes__gte=min_price)
        if max_price:
            listings = listings.filter(price_per_night_kes__lte=max_price)
        if bedrooms:
            listings = listings.filter(bedrooms=bedrooms)
        if max_guests:
            listings = listings.filter(max_guests__gte=max_guests)
        if hourly_only == 'true':
            listings = listings.filter(is_hourly_available=True)

        serializer = ListingSerializer(listings, many=True)
        return Response(serializer.data)


class ListingDetailView(APIView):
    """Public — single listing detail. Returns display coords only."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, status='live')
        serializer = ListingDetailSerializer(listing)
        return Response(serializer.data)


class HostListingListView(APIView):
    """Host — view all their own listings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'host':
            return Response({'error': 'Only hosts can access this.'}, status=status.HTTP_403_FORBIDDEN)
        listings = Listing.objects.filter(host=request.user)
        serializer = ListingSerializer(listings, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Host — create a new listing."""
        if request.user.role != 'host':
            return Response({'error': 'Only hosts can create listings.'}, status=status.HTTP_403_FORBIDDEN)

        # Check host profile is approved
        if not hasattr(request.user, 'host_profile') or request.user.host_profile.status != 'approved':
            return Response(
                {'error': 'Your host application must be approved before creating listings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ListingCreateSerializer(data=request.data)
        if serializer.is_valid():

            listing = serializer.save(
                host=request.user,
                status='draft'
            )
            return Response(ListingSerializer(listing).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class HostListingDetailView(APIView):
    """Host — view, edit or delete their own listing."""
    permission_classes = [IsAuthenticated]

    def get_listing(self, pk, user):
        return get_object_or_404(Listing, pk=pk, host=user)

    def get(self, request, pk):
        listing = self.get_listing(pk, request.user)
        serializer = ListingSerializer(listing)
        data = dict(serializer.data)
        data.update({
            'full_address': listing.full_address,
            'latitude': listing.latitude,
            'longitude': listing.longitude,
            'caretaker_name': listing.caretaker_name,
            'caretaker_phone': listing.caretaker_phone,
        })
        return Response(data)

    def patch(self, request, pk):
        listing = self.get_listing(pk, request.user)
        serializer = ListingCreateSerializer(listing, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ListingSerializer(listing).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        listing = self.get_listing(pk, request.user)
        if listing.status == 'live':
            return Response(
                {'error': 'Cannot delete a live listing. Suspend it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        listing.delete()
        return Response({'message': 'Listing deleted.'}, status=status.HTTP_204_NO_CONTENT)


class HostListingSubmitView(APIView):
    """Host — submit a draft listing for admin review."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk, host=request.user)

        if listing.status != 'draft':
            return Response(
                {'error': f'Listing is already {listing.status}. Only drafts can be submitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(listing.photos) < 5:
            return Response(
                {'error': 'At least 5 photos required before submitting for review.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        listing.status = 'pending_review'
        listing.save()
        return Response({'message': 'Listing submitted for admin review.'})


class CloudinarySignatureView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import cloudinary
        import time
        import hashlib
        import os

        timestamp = int(time.time())
        api_secret = os.getenv('CLOUDINARY_API_SECRET')
        api_key = os.getenv('CLOUDINARY_API_KEY')
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')

        # Correct signature format
        params_to_sign = f'timestamp={timestamp}{api_secret}'
        signature = hashlib.sha1(params_to_sign.encode('utf-8')).hexdigest()

        return Response({
            'signature': signature,
            'timestamp': timestamp,
            'api_key': api_key,
            'cloud_name': cloud_name,
        })
    

class ListingAvailabilityView(APIView):
    """
    Public — returns all unavailable dates for a listing.
    Combines host-blocked dates + confirmed/checked_in bookings.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        from bookings.models import Booking
        from .models import ListingAvailability
        import datetime

        listing = get_object_or_404(Listing, pk=pk)

        # Get booked dates from confirmed bookings
        booked_dates = set()
        bookings = Booking.objects.filter(
            listing=listing,
            status__in=['confirmed', 'checked_in', 'awaiting_host']
        )
        for booking in bookings:
            current = booking.check_in_date
            while current < booking.check_out_date:
                booked_dates.add(str(current))
                current += datetime.timedelta(days=1)

        # Get manually blocked dates by host
        blocked = ListingAvailability.objects.filter(listing=listing)
        for b in blocked:
            booked_dates.add(str(b.date))

        return Response({
            'listing_id': str(listing.id),
            'unavailable_dates': sorted(list(booked_dates))
        })


class HostBlockDatesView(APIView):
    """Host manually blocks or unblocks dates."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from .models import ListingAvailability
        import datetime

        listing = get_object_or_404(Listing, pk=pk, host=request.user)
        dates = request.data.get('dates', [])
        action = request.data.get('action', 'block')  # block or unblock

        if not dates:
            return Response({'error': 'No dates provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'block':
            created = []
            for date_str in dates:
                try:
                    date = datetime.date.fromisoformat(date_str)
                    obj, was_created = ListingAvailability.objects.get_or_create(
                        listing=listing,
                        date=date,
                        defaults={'reason': request.data.get('reason', 'Blocked by host')}
                    )
                    if was_created:
                        created.append(date_str)
                except ValueError:
                    pass
            return Response({'message': f'{len(created)} date(s) blocked.'})

        elif action == 'unblock':
            deleted, _ = ListingAvailability.objects.filter(
                listing=listing,
                date__in=dates
            ).delete()
            return Response({'message': f'{deleted} date(s) unblocked.'})

        return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


class NeighborhoodListView(APIView):
    """Public — get all active neighborhoods."""
    permission_classes = [AllowAny]

    def get(self, request):
        neighborhoods = Neighborhood.objects.filter(is_active=True)
        data = [{'id': n.id, 'name': n.name, 'city': n.city} for n in neighborhoods]
        return Response(data)