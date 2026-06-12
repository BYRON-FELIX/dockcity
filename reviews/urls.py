from django.urls import path
from .views import SubmitReviewView, ListingReviewsView, HostReplyView

urlpatterns = [
    path('reviews/', SubmitReviewView.as_view(), name='submit-review'),
    path('listings/<uuid:listing_pk>/reviews/', ListingReviewsView.as_view(), name='listing-reviews'),
    path('reviews/<uuid:pk>/reply/', HostReplyView.as_view(), name='host-reply'),
]