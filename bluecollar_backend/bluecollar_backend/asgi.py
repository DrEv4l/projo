# File: bluecollar_backend/asgi.py

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from api.middleware import TokenAuthMiddlewareStack # Import your custom stack
import api.routing # Import your app's routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bluecollar_backend.settings')

django_asgi_app = get_asgi_application()

print("ASGI.py: DJANGO_SETTINGS_MODULE set.")
print(f"ASGI.py: django_asgi_app created.")
print(f"ASGI.py: api.routing.websocket_urlpatterns is: {api.routing.websocket_urlpatterns}")

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddlewareStack(
        URLRouter(
            api.routing.websocket_urlpatterns
        )
    ),
})

print("ASGI.py: ProtocolTypeRouter 'application' created.")