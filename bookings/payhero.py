import requests
import os


def trigger_stk_push(phone_number, amount, reference_code, callback_url=None):
    """
    Triggers an M-Pesa STK Push via PayHero.
    Phone number format: 2547XXXXXXXX
    """
    # Normalize phone number
    phone = str(phone_number).strip().replace(' ', '')
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    elif phone.startswith('+'):
        phone = phone[1:]

    url = os.getenv('PAYHERO_API_URL', 'https://backend.payhero.co.ke/api/v2/payments')
    auth = os.getenv('PAYHERO_BASIC_AUTH')
    channel_id = int(os.getenv('PAYHERO_CHANNEL_ID', '3257'))

    # Callback URL — where PayHero sends payment confirmation
    if not callback_url:
        callback_url = os.getenv('BACKEND_URL', 'http://127.0.0.1:8000') + '/api/bookings/webhook/payment/'

    payload = {
        'amount': amount,
        'phone_number': phone,
        'channel_id': channel_id,
        'provider': 'm-pesa',
        'external_reference': reference_code,
        'callback_url': callback_url,
    }

    headers = {
        'Authorization': auth,
        'Content-Type': 'application/json',
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        print(f'PayHero response: {response.status_code} — {response.text}')
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'PayHero error: {e}')
        return {'error': str(e)}