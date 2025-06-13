# api/routing.py
from django.urls import re_path
from . import consumers # We will create consumers.py next

websocket_urlpatterns = [
    # Example: ws/chat/booking_123/ or ws/chat/user_456/
    # The <room_name> can be a booking ID, a user-pair ID, etc.
    re_path(r'ws/chat/(?P<room_name>\w+)/$', consumers.ChatConsumer.as_asgi()),
]