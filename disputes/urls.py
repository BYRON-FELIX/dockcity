from django.urls import path
from .views import RaiseDisputeView, AdminDisputeListView, AdminDisputeResolveView

urlpatterns = [
    path('bookings/<uuid:pk>/dispute/', RaiseDisputeView.as_view(), name='raise-dispute'),
    path('admin/disputes/', AdminDisputeListView.as_view(), name='admin-dispute-list'),
    path('admin/disputes/<uuid:pk>/resolve/', AdminDisputeResolveView.as_view(), name='admin-dispute-resolve'),
]