from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth import get_user_model

class User(AbstractUser):
    # We inherit username, password, email, first_name, last_name, etc., from AbstractUser
    is_provider = models.BooleanField(default=False, help_text='Designates whether this user is a service provider.')
    # You can add other common fields here later if needed, e.g.:
    # phone_number = models.CharField(max_length=20, blank=True, null=True)
    # profile_picture_url = models.URLField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.username
# models.py
        # Create your models here.
class ServiceCategory(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="Name of the service category (e.g., Plumbing, Electrical, Cleaning).")
    description = models.TextField(blank=True, help_text="Optional: A brief description of the service category.")
    icon = models.ImageField(upload_to='category_icons/', blank=True, null=True, help_text="Optional: Icon image for the category.")
    # Alternatively, for icon, you could use:
    # icon_class = models.CharField(max_length=50, blank=True, help_text="e.g., Font Awesome class like 'fas fa-wrench'")
    # icon_url = models.URLField(max_length=255, blank=True, null=True, help_text="URL to an icon image")

    class Meta:
        verbose_name_plural = "Service Categories" # Makes it look nicer in Django Admin

    def __str__(self):
        return self.name
    
class ServiceProviderProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True, # Makes the User the primary key for this profile
        limit_choices_to={'is_provider': True},
        help_text="The user account for this service provider."
    )
    business_name = models.CharField(max_length=200, blank=True, help_text="Official business name, if different from username.")
    bio = models.TextField(blank=True, help_text="A short biography or description of the provider/services.")
    phone_number = models.CharField(max_length=20, blank=True, help_text="Contact phone number.")
    # address = models.CharField(max_length=255, blank=True) # General area or exact if needed
    # profile_picture = models.ImageField(upload_to='provider_profiles/', blank=True, null=True)
    # years_of_experience = models.PositiveIntegerField(default=0, blank=True, null=True)

    services_offered = models.ManyToManyField(
        ServiceCategory,
        related_name="providers",
        blank=True, # A provider might sign up before specifying services
        help_text="Categories of services offered by this provider."
    )

    # average_rating = models.FloatField(default=0.0) # We can add this later when we have reviews

    def __str__(self):
        return self.business_name or self.user.username

User = get_user_model()

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Confirmation'),
        ('CONFIRMED', 'Confirmed by Provider'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED_BY_USER', 'Cancelled by User'),
        ('CANCELLED_BY_PROVIDER', 'Cancelled by Provider'),
        ('REJECTED_BY_PROVIDER', 'Rejected by Provider'),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings_as_customer',
        limit_choices_to={'is_provider': False},
        help_text="The user who is booking the service."
    )
    provider_profile = models.ForeignKey( # Link to ServiceProviderProfile
        ServiceProviderProfile,
        on_delete=models.CASCADE,
        related_name='bookings_as_provider',
        help_text="The service provider for this booking."
    )
    service_category_requested = models.ForeignKey( # Optional: if booking is for a specific category
        ServiceCategory,
        on_delete=models.SET_NULL, # Don't delete booking if category is deleted
        null=True,
        blank=True,
        help_text="The specific service category requested, if applicable."
    )
    service_description = models.TextField(help_text="Detailed description of the service required by the customer.")
    booking_datetime = models.DateTimeField(help_text="Preferred date and time for the service.")
    address_for_service = models.CharField(max_length=255, help_text="Address where the service is to be performed.")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    # Optional fields
    estimated_duration_hours = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="Provider's estimated duration in hours.")
    quoted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price quoted by the provider, if applicable.")
    provider_notes = models.TextField(blank=True, help_text="Notes from the provider regarding this booking.")
    customer_notes = models.TextField(blank=True, help_text="Additional notes from the customer.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at'] # Show newest bookings first by default

    def __str__(self):
        return f"Booking #{self.id} for {self.customer.username} with {self.provider_profile.business_name or self.provider_profile.user.username}"


class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)] # 1 to 5 stars

    booking = models.OneToOneField( # A booking should have at most one review
        Booking,
        on_delete=models.CASCADE,
        related_name='review',
        limit_choices_to={'status': 'COMPLETED'}, # Only allow reviews for completed bookings
        help_text="The completed booking being reviewed."
    )
    reviewer = models.ForeignKey( # Should be the customer of the booking
        User,
        on_delete=models.CASCADE,
        related_name='reviews_given',
        limit_choices_to={'is_provider': False}
    )
    provider_profile = models.ForeignKey( # The provider who was reviewed
        ServiceProviderProfile,
        on_delete=models.CASCADE,
        related_name='reviews_received'
    )
    rating = models.PositiveIntegerField(choices=RATING_CHOICES, help_text="Rating from 1 to 5 stars.")
    comment = models.TextField(blank=True, help_text="Optional comments for the review.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('booking', 'reviewer') # Ensure a reviewer can only review a booking once

    def __str__(self):
        return f"Review for Booking #{self.booking.id} by {self.reviewer.username} - {self.rating} stars"

    def save(self, *args, **kwargs):
        # Ensure reviewer is the customer of the booking
        if self.booking and self.reviewer != self.booking.customer:
            raise ValueError("Reviewer must be the customer of the booking.")
        # Ensure provider_profile is the provider of the booking
        if self.booking and self.provider_profile != self.booking.provider_profile:
            raise ValueError("Reviewed provider must be the provider of the booking.")
        super().save(*args, **kwargs)

class ChatMessage(models.Model):
    # A booking can be null if the chat is general, or linked if it's about a specific booking
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        null=True,
        blank=True,
        help_text="The booking this chat message is related to, if any."
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_chat_messages',
        help_text="The user who sent the message."
    )
    # The receiver could be inferred if the chat is always between customer and provider of a booking.
    # Or, for more general chat rooms, you might have a 'room' or 'thread' model.
    # For simplicity, let's assume a direct message context for now, or infer receiver from booking.
    # If you need explicit receiver for non-booking chats:
    # receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_chat_messages')
    message_content = models.TextField(help_text="The content of the chat message.")
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp'] # Oldest messages first

    def __str__(self):
        return f"From {self.sender.username} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"       