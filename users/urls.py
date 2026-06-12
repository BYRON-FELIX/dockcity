from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import GoogleLoginView, MeView, UpdateProfileView, BecomeHostView
from .admin_views import (
    AdminDashboardView,
    AdminHostApplicationListView,
    AdminHostApplicationApproveView,
    AdminHostApplicationRejectView,
    AdminListingApproveView,
    AdminListingSuspendView,
    AdminUserSuspendView,
    
)

urlpatterns = [
    # Auth
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    
    path('auth/become-host/', BecomeHostView.as_view(), name='become-host'),
    path('auth/me/update/', UpdateProfileView.as_view(), name='update-profile'),

    # Admin
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/host-applications/', AdminHostApplicationListView.as_view(), name='admin-host-list'),
    path('admin/host-applications/<uuid:pk>/approve/', AdminHostApplicationApproveView.as_view(), name='admin-host-approve'),
    path('admin/host-applications/<uuid:pk>/reject/', AdminHostApplicationRejectView.as_view(), name='admin-host-reject'),
    path('admin/listings/<uuid:pk>/approve/', AdminListingApproveView.as_view(), name='admin-listing-approve'),
    path('admin/listings/<uuid:pk>/suspend/', AdminListingSuspendView.as_view(), name='admin-listing-suspend'),
    path('admin/users/<uuid:pk>/suspend/', AdminUserSuspendView.as_view(), name='admin-user-suspend'),
    
    
]