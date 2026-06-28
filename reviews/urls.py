from django.urls import path
from .views import (
    SubmitReviewView,
    ListingReviewsView,
    HostReplyView,
    AdminDeleteReviewView,
    AdminAllReviewsView,
    HostReplyToReviewView,
    HostReviewsListView,
)
urlpatterns = [
    path('reviews/', SubmitReviewView.as_view(), name='submit-review'),
    path('listings/<uuid:listing_pk>/reviews/', ListingReviewsView.as_view(), name='listing-reviews'),
    path('reviews/<uuid:pk>/reply/', HostReplyToReviewView.as_view(), name='host-reply'),
    path('reviews/all/', AdminAllReviewsView.as_view(), name='admin-all-reviews'),
    path('admin/reviews/<uuid:pk>/', AdminDeleteReviewView.as_view(), name='admin-delete-review'),
    path('reviews/host/me/', HostReviewsListView.as_view(), name='host-reviews'),
]