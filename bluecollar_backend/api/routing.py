# File: api/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # This pattern matches ws/chat/ followed by any "word" characters (alphanumeric + underscore)
    re_path(r'ws/chat/(?P<room_name>[\w\-]+)/$', consumers.ChatConsumer.as_asgi()),
]