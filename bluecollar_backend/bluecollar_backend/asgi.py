# File: bluecollar_backend/asgi.py

import os
from django.core.asgi import get_asgi_application
# Importing necessary modules for ASGI configuration
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack # For authentication over WebSockets
import api.routing # This imports your api/routing.py file


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bluecollar_backend.settings')
# The following print statement is just for debugging the asgi.py loading itself
print("ASGI.py: DJANGO_SETTINGS_MODULE set.")

django_asgi_app = get_asgi_application()
# Debug print for when django_asgi_app is created
print("ASGI.py: django_asgi_app created.")

# Debug print to check if websocket_urlpatterns is accessible
# This relies on api.routing being successfully imported above
if hasattr(api, 'routing') and hasattr(api.routing, 'websocket_urlpatterns'):
    print(f"ASGI.py: api.routing.websocket_urlpatterns is: {api.routing.websocket_urlpatterns}")
else:
    print("ASGI.py: Critical error - api.routing module or websocket_urlpatterns not found after import!")
    # If you see the above error, there's an issue with api/routing.py or its imports

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack( # AuthMiddlewareStack is now imported
        URLRouter( # URLRouter is now imported
            api.routing.websocket_urlpatterns # This should reference the imported list
        )
    ),
})
# Debug print for when the main application object is created
print("ASGI.py: ProtocolTypeRouter 'application' created.")