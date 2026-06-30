from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UploadIDSerializer
from .models import HostProfile


User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class GoogleLoginView(APIView):
    """
    Receives Google access token from frontend,
    fetches user info from Google, finds or creates user,
    returns JWT tokens.
    """
    permission_classes = []

    def post(self, request):
        access_token = request.data.get('id_token')  # frontend sends as id_token
        email = request.data.get('email')
        full_name = request.data.get('full_name', '')

        if not access_token and not email:
            return Response(
                {'error': 'Google token or email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # If we have email directly from frontend userInfo, use it
        if email:
            try:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={'full_name': full_name or email.split('@')[0]}
                )
                if not created and full_name and not user.full_name:
                    user.full_name = full_name
                    user.save()

                tokens = get_tokens_for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'tokens': tokens,
                }, status=status.HTTP_200_OK)

            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Fallback — verify access token with Google
        try:
            import requests as http_requests
            google_response = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            if google_response.status_code != 200:
                return Response(
                    {'error': 'Invalid Google token'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            info = google_response.json()
            email = info.get('email')
            full_name = info.get('name', '')

            if not email:
                return Response(
                    {'error': 'Could not get email from Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user, created = User.objects.get_or_create(
                email=email,
                defaults={'full_name': full_name}
            )

            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)




class BecomeHostView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.role == 'host':
            return Response({'error': 'You are already a host.'}, status=status.HTTP_400_BAD_REQUEST)

        if hasattr(user, 'host_profile'):
            return Response({'error': 'Host application already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

        user.role = 'host'
        user.save()

        HostProfile.objects.create(
            user=user,
            caretaker_name=request.data.get('caretaker_name', ''),
            caretaker_phone=request.data.get('caretaker_phone', '')
        )

        from core.email import notify_host_application_submitted
        from core.sms import send_sms_to_admin
        notify_host_application_submitted(user)
        send_sms_to_admin(
            f'[Admin] New host application\n'
            f'Name: {user.full_name}\n'
            f'Email: {user.email}\n'
            f'Phone: {user.phone_number or "N/A"}\n'
            f'Review: thedockcity.com/admin-panel'
        )

        return Response(
            {'message': 'Host application submitted. Await admin approval.'},
            status=status.HTTP_201_CREATED
        )
class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        full_name = request.data.get('full_name')
        phone_number = request.data.get('phone_number')

        if full_name:
            user.full_name = full_name
        if phone_number:
            user.phone_number = phone_number
        user.save()

        return Response(UserSerializer(user).data)