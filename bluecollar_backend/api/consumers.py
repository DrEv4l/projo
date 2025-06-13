# File: api/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatMessage, Booking, ServiceProviderProfile # Ensure ServiceProviderProfile is imported

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope['user']

        print(f"CHAT CONSUMER CONNECT: User from scope: {self.user}, Is authenticated: {self.user.is_authenticated}") 

        if not self.user.is_authenticated:
            print(f"CHAT CONSUMER CONNECT: User {self.user} is not authenticated. Closing connection.")
            await self.close()
            return

        # Optional: Authorization check for the room
        # is_authorized = await self.check_user_authorization(self.room_name, self.user)
        # if not is_authorized:
        #     print(f"User {self.user.username} not authorized for room {self.room_name}.")
        #     await self.close()
        #     return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        print(f"User {self.user.username} (ID: {self.user.id}) connected to room {self.room_group_name}")

        # Optional: Load and send recent message history
        # await self.send_message_history()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        print(f"User {self.user.username if self.user and self.user.is_authenticated else 'Anonymous'} disconnected from room {getattr(self, 'room_name', 'N/A')}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        if not self.user or not self.user.is_authenticated: # Extra check
            return

        text_data_json = json.loads(text_data)
        message_content = text_data_json.get('message')
        # booking_id_from_payload = text_data_json.get('booking_id') # If frontend sends it explicitly

        if not message_content: # Ignore empty messages
            return

        # Save message to database. The save_chat_message method will use self.room_name
        # and self.user.
        saved_chat_message_obj = await self.save_chat_message_db(message_content)

        if saved_chat_message_obj: # Check if message was actually saved
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_broadcast', # Method to call on each consumer in the group
                    'id': saved_chat_message_obj.id,
                    'message': saved_chat_message_obj.message_content,
                    'sender_id': saved_chat_message_obj.sender.id,
                    'sender_username': saved_chat_message_obj.sender.username,
                    'timestamp': saved_chat_message_obj.timestamp.isoformat(),
                    'room_name': self.room_name # Optionally broadcast room name for client-side logic
                }
            )
        else:
            # Handle case where message saving failed (e.g., due to permissions in save_chat_message_db)
            # You might want to send an error message back to the sender only
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to save or send message. You might not be authorized for this chat.'
            }))


    # Method called when a message is received from the group
    async def chat_message_broadcast(self, event):
        # Send message to this specific WebSocket client
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'timestamp': event['timestamp'],
            'room_name': event.get('room_name'), # Include room_name if sent
            'is_self': event['sender_id'] == self.user.id # Flag if message is from current user
        }))

    @database_sync_to_async
    def save_chat_message_db(self, message_content):
        """
        Saves a chat message to the database.
        Uses self.user (sender) and self.room_name (to determine booking context).
        """
        booking_instance = None

        # Try to determine booking from room_name if it's a booking-specific chat
        if self.room_name.startswith('booking_'):
            try:
                booking_id = int(self.room_name.split('_')[1])
                booking_instance = Booking.objects.select_related('customer', 'provider_profile__user').get(id=booking_id)

                # Authorization: Ensure self.user is part of this booking_instance
                is_customer = (self.user == booking_instance.customer)
                is_provider = (
                    self.user.is_provider and
                    hasattr(self.user, 'provider_profile') and # Ensure provider_profile exists
                    self.user.provider_profile == booking_instance.provider_profile
                )

                if not (is_customer or is_provider):
                    print(f"DENIED: User {self.user.username} (ID: {self.user.id}) tried to send message to booking room '{self.room_name}' they are not part of.")
                    return None # Do not save if user is not authorized for this booking chat
            except Booking.DoesNotExist:
                print(f"Warning: Booking for room '{self.room_name}' not found. Message saved without booking link.")
                booking_instance = None
            except (IndexError, ValueError):
                print(f"Warning: Could not parse booking ID from room_name '{self.room_name}'. Message saved without booking link.")
                booking_instance = None
        elif self.room_name.startswith('chat_user'):
            # This is a user-to-user chat, booking_instance will remain None
            # You might add authorization here: e.g., is self.user one of the two user IDs in self.room_name?
            try:
                parts = self.room_name.split('_') # e.g., ['chat', 'userX', 'userY']
                user_id1_str = parts[1].replace('user', '')
                user_id2_str = parts[2].replace('user', '')
                user_ids_in_room = {int(user_id1_str), int(user_id2_str)}
                if self.user.id not in user_ids_in_room:
                    print(f"DENIED: User {self.user.username} (ID: {self.user.id}) tried to send message to user chat room '{self.room_name}' they are not part of.")
                    return None
            except (IndexError, ValueError):
                print(f"Warning: Could not parse user IDs from room_name '{self.room_name}'. Message saved without specific validation.")
                # Potentially allow if it's a general room or handle error
                pass # Allows saving if parsing fails, booking_instance remains None

        # Create and save the ChatMessage instance
        chat_msg = ChatMessage.objects.create(
            sender=self.user,
            message_content=message_content,
            booking=booking_instance
            # If you add a 'room_identifier' field to ChatMessage model, you could save self.room_name there
        )
        print(f"Message saved: ID {chat_msg.id} by {self.user.username} in room context '{self.room_name}' (Booking ID: {booking_instance.id if booking_instance else 'None'})")
        return chat_msg


    # --- Optional Stubs for Future Implementation ---
    # @database_sync_to_async
    # def check_user_authorization(self, room_name, user):
    #     if room_name.startswith('booking_'):
    #         try:
    #             booking_id = int(room_name.split('_')[1])
    #             booking = Booking.objects.get(id=booking_id)
    #             return (user == booking.customer or
    #                     (user.is_provider and hasattr(user, 'provider_profile') and
    #                      user.provider_profile == booking.provider_profile))
    #         except (Booking.DoesNotExist, IndexError, ValueError):
    #             return False
    #     elif room_name.startswith('chat_user'):
    #         try:
    #             parts = room_name.split('_')
    #             user_id1 = int(parts[1].replace('user', ''))
    #             user_id2 = int(parts[2].replace('user', ''))
    #             return user.id == user_id1 or user.id == user_id2
    #         except (IndexError, ValueError):
    #             return False # Invalid room format
    #     # For other general rooms (e.g., 'chat_general')
    #     # return True # Or implement specific logic
    #     return False # Default to deny if room type is unknown or not authorized

    # @database_sync_to_async
    # def get_message_history_db(self, limit=50):
    #     # This needs more refined logic based on room_name to fetch relevant messages
    #     # For booking-specific chat:
    #     if self.room_name.startswith('booking_'):
    #         try:
    #             booking_id = int(self.room_name.split('_')[1])
    #             messages = ChatMessage.objects.filter(booking_id=booking_id).select_related('sender').order_by('-timestamp')[:limit]
    #             return list(reversed([{ # Reverse to get oldest first for display
    #                 'id': m.id,
    #                 'sender_id': m.sender.id,
    #                 'sender_username': m.sender.username,
    #                 'message': m.message_content,
    #                 'timestamp': m.timestamp.isoformat()
    #             } for m in messages]))
    #         except (Booking.DoesNotExist, IndexError, ValueError):
    #             return []
    #     # For user-to-user chat (more complex: needs to identify messages between the two users in the room_name)
    #     elif self.room_name.startswith('chat_user'):
    #         # This requires more logic to parse user IDs from room_name and filter messages
    #         # where sender/receiver match those IDs (if you add a receiver field).
    #         # Or, if you add a 'room_identifier' field to ChatMessage.
    #         print(f"History for user-to-user chat room '{self.room_name}' not yet implemented.")
    #         return []
    #     return []

    # async def send_message_history(self):
    #     history = await self.get_message_history_db()
    #     if history:
    #         # Send history as a special message type, or loop and send individually
    #         await self.send(text_data=json.dumps({
    #             'type': 'message_history', # Client needs to handle this type
    #             'messages': history
    #         }))