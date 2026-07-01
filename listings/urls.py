from django.urls import path
from .views import (
    ListingListView, ListingDetailView,
    HostListingListView, HostListingDetailView,
    HostListingSubmitView, CloudinarySignatureView,
    ListingAvailabilityView, HostBlockDatesView,
    NeighborhoodListView, AmenityListView
)

urlpatterns = [
    # Public
    path('neighborhoods/', NeighborhoodListView.as_view(), name='neighborhoods'),
    path('amenities/', AmenityListView.as_view(), name='amenities'),
    path('listings/', ListingListView.as_view(), name='listing-list'),
    path('listings/<uuid:pk>/', ListingDetailView.as_view(), name='listing-detail'),
    path('listings/<uuid:pk>/availability/', ListingAvailabilityView.as_view(), name='listing-availability'),

    # Host
    path('host/listings/', HostListingListView.as_view(), name='host-listing-list'),
    path('host/listings/<uuid:pk>/', HostListingDetailView.as_view(), name='host-listing-detail'),
    path('host/listings/<uuid:pk>/submit/', HostListingSubmitView.as_view(), name='host-listing-submit'),
    path('host/listings/<uuid:pk>/block-dates/', HostBlockDatesView.as_view(), name='host-block-dates'),

    # Cloudinary
    path('upload/signature/', CloudinarySignatureView.as_view(), name='cloudinary-signature'),
]