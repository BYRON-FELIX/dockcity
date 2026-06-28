from django.urls import path

from .views import (
    AdminPropertySaleApproveView,
    AdminPropertySaleListView,
    AdminPropertySaleRejectView,
    AdminViewingRequestListView,
    AdminViewingRequestUpdateView,
    PropertySaleCreateView,
    PropertySaleDetailView,
    PropertySaleListView,
    SellerPropertyListView,
    ViewingRequestCreateView,
)

urlpatterns = [
    path('properties-for-sale/', PropertySaleListView.as_view(), name='property-sale-list'),
    path('properties-for-sale/create/', PropertySaleCreateView.as_view(), name='property-sale-create'),
    path('properties-for-sale/my/', SellerPropertyListView.as_view(), name='seller-properties'),
    path('properties-for-sale/<uuid:pk>/', PropertySaleDetailView.as_view(), name='property-sale-detail'),
    path('properties-for-sale/<uuid:pk>/request-viewing/', ViewingRequestCreateView.as_view(), name='viewing-request'),
    path('admin/properties-for-sale/', AdminPropertySaleListView.as_view(), name='admin-property-sale-list'),
    path('admin/properties-for-sale/<uuid:pk>/approve/', AdminPropertySaleApproveView.as_view(), name='admin-approve-property'),
    path('admin/properties-for-sale/<uuid:pk>/reject/', AdminPropertySaleRejectView.as_view(), name='admin-reject-property'),
    path('admin/viewings/', AdminViewingRequestListView.as_view(), name='admin-viewings'),
    path('admin/viewings/<uuid:pk>/', AdminViewingRequestUpdateView.as_view(), name='admin-viewing-update'),
]
