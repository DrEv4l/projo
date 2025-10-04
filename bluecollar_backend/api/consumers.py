# File: api/consumers.py
import re # Regular Expression modul
import json
import traceback # Import traceback to print full error details
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatMessage, Booking

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # === ADDED A ROBUST TRY...EXCEPT BLOCK to catch all connection errors ===
        try:
            self.room_name = self.scope['url_route']['kwargs']['room_name']
            self.room_group_name = f'chat_{self.room_name}'
            self.user = self.scope['user']

            print(f"CONNECT: User '{self.user}' attempting connection for room '{self.room_name}'.")

            if not self.user or not self.user.is_authenticated:
                print("CONNECT: User is not authenticated. Closing connection.")
                await self.close()
                return

            is_authorized = await self.check_user_authorization_for_room()
            if not is_authorized:
                print(f"CONNECT: User '{self.user.username}' NOT AUTHORIZED for room '{self.room_name}'. Closing connection.")
                await self.close()
                return

            print(f"CONNECT: User '{self.user.username}' is authorized. Adding to group '{self.room_group_name}'.")
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            print(f"CONNECT: WebSocket connection accepted for user '{self.user.username}'.")

            # These methods now run safely inside the try block
            await self.mark_messages_as_read_for_user()
            await self.send_message_history()

        except Exception as e:
            # This block will catch ANY unhandled exception during the connect phase
            print("\n--- UNHANDLED EXCEPTION IN ChatConsumer.connect() ---")
            print(f"Exception Type: {type(e).__name__}")
            print(f"Exception Details: {e}")
            print("Traceback:")
            traceback.print_exc() # Prints the full stack trace to the console
            print("--------------------------------------------------")
            # Ensure the connection is closed if an error occurs
            await self.close()
        # === END OF TRY...EXCEPT BLOCK ===

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        print(f"DISCONNECT: User '{self.user.username if self.user and self.user.is_authenticated else 'Anonymous'}' from room '{getattr(self, 'room_name', 'N/A')}', code: {close_code}")

    async def receive(self, text_data):
        # ... (Your receive method is fine as is)
        print(f"RECEIVE: User '{self.user.username}', Raw: {text_data}")
        if not self.user or not self.user.is_authenticated:
            await self.send_error_message("Authentication error. Please reconnect.")
            return
        try:
            text_data_json = json.loads(text_data)
            message_content = text_data_json.get('message')
        except json.JSONDecodeError:
            await self.send_error_message("Invalid message format.")
            return
        if not message_content or not message_content.strip():
            return
        saved_chat_message_obj = await self.save_chat_message_db(message_content)
        if saved_chat_message_obj:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_broadcast',
                    'id': saved_chat_message_obj.id,
                    'message': saved_chat_message_obj.message_content,
                    'sender_id': saved_chat_message_obj.sender.id,
                    'sender_username': saved_chat_message_obj.sender.username,
                    'timestamp': saved_chat_message_obj.timestamp.isoformat(),
                    'room_name': self.room_name
                }
            )
        else:
            await self.send_error_message('Message could not be sent or saved.')


    async def chat_message_broadcast(self, event):
        # ... (Your chat_message_broadcast method is fine as is)
        await self.send(text_data=json.dumps({
            'type': 'chat_message', 'id': event['id'], 'message': event['message'],
            'sender_id': event['sender_id'], 'sender_username': event['sender_username'],
            'timestamp': event['timestamp'], 'room_name': event.get('room_name'),
            'is_self': event['sender_id'] == self.user.id
        }))

    async def send_error_message(self, error_message_text):
        # ... (Your send_error_message method is fine as is)
        await self.send(text_data=json.dumps({ 'type': 'error', 'message': error_message_text }))

    @database_sync_to_async
    def save_chat_message_db(self, message_content):
        # ... (Your save_chat_message_db method is fine as is)
        booking_instance = None
        if self.room_name.startswith('booking_'):
            try:
                booking_id = int(self.room_name.split('_', 1)[1])
                booking_instance = Booking.objects.get(id=booking_id)
            except (IndexError, ValueError, Booking.DoesNotExist, TypeError):
                booking_instance = None
        try:
            chat_msg = ChatMessage.objects.create(
                sender=self.user, message_content=message_content,
                booking=booking_instance, room_identifier=self.room_name
            )
            return chat_msg
        except Exception as e:
            print(f"SAVE_MSG DB ERROR: {e}")
            return None

    @database_sync_to_async
    def check_user_authorization_for_room(self):
        # ... (Your check_user_authorization_for_room method is fine as is)
        user_id = self.user.id
        print(f"AUTH CHECK: User '{self.user.username}' (ID: {user_id}), Room: '{self.room_name}'")
        if self.room_name.startswith('booking_'):
            try:
                booking_id = int(self.room_name.split('_', 1)[1])
                booking = Booking.objects.get(id=booking_id)
                is_customer = (user_id == booking.customer_id)
                is_provider = False
                if self.user.is_provider and user_id == booking.provider_profile_id:
                    is_provider = True
                authorized = is_customer or is_provider
                print(f"    AUTH CHECK RESULT (Booking Room): Authorized: {authorized}")
                return authorized
            except (Booking.DoesNotExist, IndexError, ValueError, TypeError):
                return False
        # This pattern looks for "chat_user_" followed by digits, another "_user_", and more digits.
        match = re.match(r'^chat_user_(\d+)_user_(\d+)$', self.room_name)
        if match:
            try:
                # The matched groups (the digits) are extracted.
                user_id1 = int(match.group(1))
                user_id2 = int(match.group(2))
                
                is_participant = user_id == user_id1 or user_id == user_id2
                print(f"AUTH CHECK (User Chat): Matched pattern. Participant? {is_participant} (Room User IDs: {user_id1}, {user_id2})")
                return is_participant
            except (IndexError, ValueError):
                # This would only happen if the regex was wrong, but it's a good safeguard.
                print(f"AUTH CHECK FAILED (User Chat): Could not parse IDs from matched pattern.")
                return False
        # === END OF NEW CHECK ===
        
        print(f"AUTH CHECK: Unknown or unhandled room type for '{self.room_name}'. Denying access by default.")
        return False

    @database_sync_to_async
    def get_message_history_db(self, limit=50):
        # ... (Your get_message_history_db method is fine as is)
        messages = ChatMessage.objects.filter(
            room_identifier=self.room_name
        ).select_related('sender').order_by('-timestamp')[:limit]
        history_data = list(reversed([{'id': m.id, 'type': 'chat_message', 'sender_id': m.sender.id,
            'sender_username': m.sender.username, 'message': m.message_content,
            'timestamp': m.timestamp.isoformat(), 'is_self': m.sender.id == self.user.id,
            'room_name': m.room_identifier} for m in messages]))
        return history_data

    async def send_message_history(self):
        # ... (Your send_message_history method is fine as is)
        history = await self.get_message_history_db()
        if history:
            await self.send(text_data=json.dumps({'type': 'message_history', 'messages': history}))

    @database_sync_to_async
    def mark_messages_as_read_for_user(self):
        # ... (Your mark_messages_as_read_for_user method is fine as is)
        if self.user and self.user.is_authenticated:
            ChatMessage.objects.filter(
                room_identifier=self.room_name, is_read=False
            ).exclude(sender=self.user).update(is_read=True)