# File: api/middleware.py

from channels.db import database_sync_to_async # <<< 1. IMPORT THIS
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
from channels.auth import AuthMiddlewareStack

User = get_user_model()

# <<< 2. ADD THE DECORATOR HERE >>>
@database_sync_to_async
def get_user_from_token(token_string):
    """
    Asynchronously gets a user from a JWT access token string.
    Returns AnonymousUser if token is invalid or user doesn't exist.
    """
    print(f"  [get_user_from_token]: Attempting to decode token...")
    try:
        access_token = AccessToken(token_string)
        user_id = access_token.get('user_id')
        
        if user_id is None:
            print("  [get_user_from_token]: FAILED. 'user_id' not found in token payload.")
            return AnonymousUser()

        user = User.objects.get(id=user_id)
        print(f"  [get_user_from_token]: Success! Found user '{user.username}'.")
        return user
    except (InvalidToken, TokenError, User.DoesNotExist) as e:
        print(f"  [get_user_from_token]: FAILED. Error: {type(e).__name__} - {e}")
        return AnonymousUser()

class TokenAuthMiddleware:
    """
    Custom middleware for Django Channels that authenticates users using a JWT token
    passed in the query string.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        print("\n--- TOKEN AUTH MIDDLEWARE ---")
        if token:
            print("  > Token found in query string.")
            scope['user'] = await get_user_from_token(token)
        else:
            print("  > No token found in query string, user is AnonymousUser.")
            scope['user'] = AnonymousUser()
        print("---------------------------\n")

        return await self.app(scope, receive, send)

# A convenient wrapper for asgi.py
TokenAuthMiddlewareStack = lambda inner: TokenAuthMiddleware(AuthMiddlewareStack(inner))