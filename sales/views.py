from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PropertySale, ViewingRequest
from .serializers import (
    PropertySaleCreateSerializer,
    PropertySaleSerializer,
    ViewingRequestSerializer,
)


class PropertySaleListView(APIView):
    """Public - list all live properties for sale."""
    permission_classes = [AllowAny]

    def get(self, request):
        properties = PropertySale.objects.filter(status='live')
        neighborhood = request.query_params.get('neighborhood')
        property_type = request.query_params.get('type')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        for_rent_also = request.query_params.get('for_rent')

        if neighborhood:
            properties = properties.filter(neighborhood__icontains=neighborhood)
        if property_type:
            properties = properties.filter(property_type=property_type)
        if min_price:
            properties = properties.filter(sale_price_kes__gte=min_price)
        if max_price:
            properties = properties.filter(sale_price_kes__lte=max_price)
        if for_rent_also == 'true':
            properties = properties.filter(is_also_for_rent=True)

        serializer = PropertySaleSerializer(properties, many=True)
        return Response(serializer.data)


class PropertySaleDetailView(APIView):
    """Public - single property for sale detail."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        prop = get_object_or_404(PropertySale, pk=pk, status='live')
        serializer = PropertySaleSerializer(prop)
        return Response(serializer.data)


class PropertySaleCreateView(APIView):
    """Any logged-in user can list a property for sale - goes to pending_review."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PropertySaleCreateSerializer(data=request.data)
        if serializer.is_valid():
            prop = serializer.save(seller=request.user, status='pending_review')

            from core.email import send_to_admins
            from core.sms import send_sms_to_admin
            send_to_admins(
                f'[Admin] New property listed for sale - {prop.title}',
                f'A new property has been submitted for sale listing review.\n\n'
                f'Title: {prop.title}\n'
                f'Seller: {request.user.full_name} ({request.user.email})\n'
                f'Location: {prop.neighborhood}, {prop.city}\n'
                f'Price: KES {prop.sale_price_kes:,}\n\n'
                'Log in to the Admin Panel to review and approve.\n'
                'https://thedockcity.com/admin-panel'
            )

            send_sms_to_admin(
                f'[Admin] Property sale pending review\n'
                f'{prop.title}\n'
                f'Seller: {request.user.full_name}\n'
                f'Area: {prop.neighborhood}\n'
                f'Price: KES {prop.sale_price_kes:,}\n'
                f'Review: thedockcity.com/admin-panel'
            )

            from core.email import send_email
            send_email(
                request.user.email,
                'Your property listing has been submitted for review',
                f'Hello {request.user.full_name},\n\n'
                f'Your property "{prop.title}" has been submitted for review.\n\n'
                'Our team will review it and get back to you within 24-48 hours.\n\n'
                ' - Dock City Team'
            )

            return Response(PropertySaleSerializer(prop).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SellerPropertyListView(APIView):
    """Seller - list their own properties for sale."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        properties = PropertySale.objects.filter(seller=request.user)
        serializer = PropertySaleSerializer(properties, many=True)
        return Response(serializer.data)


class ViewingRequestCreateView(APIView):
    """Any visitor can submit a viewing request - no login required."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        prop = get_object_or_404(PropertySale, pk=pk, status='live')
        serializer = ViewingRequestSerializer(data=request.data)
        if serializer.is_valid():
            viewing = serializer.save(property=prop)

            from core.email import send_to_admins
            send_to_admins(
                f'[Admin] New viewing request - {prop.title}',
                f'A buyer has requested a property viewing.\n\n'
                f'Property: {prop.title}, {prop.neighborhood}\n'
                f'Seller: {prop.seller.full_name} ({prop.seller.email})\n\n'
                'Buyer details:\n'
                f'Name: {viewing.buyer_name}\n'
                f'Email: {viewing.buyer_email}\n'
                f'Phone: {viewing.buyer_phone}\n'
                f'Preferred date: {viewing.preferred_date}\n'
                f'Preferred time: {viewing.preferred_time or "Not specified"}\n'
                f'Message: {viewing.message or "No message"}\n\n'
                'Log in to Admin Panel to coordinate this viewing.\n'
                'https://thedockcity.com/admin-panel'
            )

            from core.email import send_email
            send_email(
                prop.seller.email,
                f'Someone wants to view your property - {prop.title}',
                f'Hello {prop.seller.full_name},\n\n'
                f'A buyer has expressed interest in viewing "{prop.title}".\n\n'
                f'Buyer: {viewing.buyer_name}\n'
                f'Phone: {viewing.buyer_phone}\n'
                f'Preferred date: {viewing.preferred_date}\n'
                f'Message: {viewing.message or "No message"}\n\n'
                'Our team will coordinate and confirm the viewing with both parties.\n\n'
                ' - Dock City Team'
            )

            send_email(
                viewing.buyer_email,
                f'Viewing request received - {prop.title}',
                f'Hello {viewing.buyer_name},\n\n'
                f'Your viewing request for "{prop.title}" in {prop.neighborhood} has been received.\n\n'
                'Our team will review and confirm your viewing schedule shortly.\n\n'
                ' - Dock City Team'
            )

            return Response({'message': 'Viewing request submitted successfully.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminPropertySaleListView(APIView):
    """Admin - list all properties for sale regardless of status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        properties = PropertySale.objects.all()
        serializer = PropertySaleSerializer(properties, many=True)
        return Response(serializer.data)


class AdminPropertySaleApproveView(APIView):
    """Admin - approve a property for sale listing."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        prop = get_object_or_404(PropertySale, pk=pk)
        prop.status = 'live'
        prop.save()

        from core.email import send_email
        send_email(
            prop.seller.email,
            f'Your property listing is now live - {prop.title}',
            f'Hello {prop.seller.full_name},\n\n'
            f'Your property "{prop.title}" has been approved and is now live on Dock City.\n\n'
            'Buyers can now view and schedule viewings.\n\n'
            'https://thedockcity.com/properties-for-sale\n\n'
            ' - Dock City Team'
        )

        return Response({'message': f'{prop.title} is now live.'})


class AdminPropertySaleRejectView(APIView):
    """Admin - reject a property for sale listing."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        prop = get_object_or_404(PropertySale, pk=pk)
        reason = request.data.get('reason', 'No reason provided.')
        prop.status = 'suspended'
        prop.save()

        from core.email import send_email
        send_email(
            prop.seller.email,
            f'Update on your property listing - {prop.title}',
            f'Hello {prop.seller.full_name},\n\n'
            f'Your property "{prop.title}" could not be approved at this time.\n\n'
            f'Reason: {reason}\n\n'
            'Please contact support@thedockcity.com for more information.\n\n'
            ' - Dock City Team'
        )

        return Response({'message': f'{prop.title} rejected.'})


class AdminViewingRequestListView(APIView):
    """Admin - list all viewing requests."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        viewings = ViewingRequest.objects.all()
        serializer = ViewingRequestSerializer(viewings, many=True)
        return Response(serializer.data)


class AdminViewingRequestUpdateView(APIView):
    """Admin - confirm, decline, or complete a viewing request."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        viewing = get_object_or_404(ViewingRequest, pk=pk)
        new_status = request.data.get('status')
        admin_notes = request.data.get('admin_notes', '')

        if new_status not in ['confirmed', 'declined', 'completed']:
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        viewing.status = new_status
        if admin_notes:
            viewing.admin_notes = admin_notes
        viewing.save()

        from core.email import send_email

        if new_status == 'confirmed':
            send_email(
                viewing.buyer_email,
                f'Your viewing has been confirmed - {viewing.property.title}',
                f'Hello {viewing.buyer_name},\n\n'
                f'Your viewing for "{viewing.property.title}" has been confirmed!\n\n'
                f'Date: {viewing.preferred_date}\n'
                f'Time: {viewing.preferred_time or "To be communicated"}\n'
                f'{f"Notes: {admin_notes}" if admin_notes else ""}\n\n'
                'Our team will be in touch with further details.\n\n'
                ' - Dock City Team'
            )
        elif new_status == 'declined':
            send_email(
                viewing.buyer_email,
                f'Viewing request update - {viewing.property.title}',
                f'Hello {viewing.buyer_name},\n\n'
                f'Unfortunately your viewing request for "{viewing.property.title}" '
                'could not be accommodated at this time.\n\n'
                f'{f"Reason: {admin_notes}" if admin_notes else ""}\n\n'
                'Please browse other properties at https://thedockcity.com/properties-for-sale\n\n'
                ' - Dock City Team'
            )

        return Response({'message': f'Viewing {new_status}.'})
