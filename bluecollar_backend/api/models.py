# File: api/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Custom User model. `is_provider` being True signifies an Admin-approved provider.
    """
    is_provider = models.BooleanField(
        default=False,
        help_text="Designates whether this user is an approved service provider.",
    )

    def __str__(self):
        return self.username

class ServiceCategory(models.Model):
    """
    Represents a category of service, e.g., Plumbing, Electrical.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Name of the service category (e.g., Plumbing).",
    )
    description = models.TextField(
        blank=True, help_text="Optional: A brief description."
    )
    # Field for a CSS class name from a library like react-icons
    icon_class = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Name of the React Icon component (e.g., 'FaWrench').",
    )
    # Field for a larger, illustrative image
    category_image = models.ImageField(
        upload_to='category_images/',
        blank=True,
        null=True,
        help_text="An image representing the service category (for landing page, etc.).",
    )

    class Meta:
        verbose_name_plural = "Service Categories"
        ordering = ['name']

    def __str__(self):
        return self.name

class ServiceProviderProfile(models.Model):
    """
    Holds detailed information for a service provider, linked to a User account.
    """
    class ProfileStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="provider_profile",
        help_text="The user account associated with this profile.",
    )
    business_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Official business name.",
    )
    bio = models.TextField(
        blank=True, help_text="A short biography or description."
    )
    phone_number = models.CharField(
        max_length=20, blank=True, help_text="Contact phone number."
    )
    # Field for the provider's profile picture
    profile_picture = models.ImageField(
        upload_to='provider_pictures/',
        blank=True,
        null=True,
        help_text="A profile picture for the service provider."
    )
    services_offered = models.ManyToManyField(
        ServiceCategory,
        blank=True,
        related_name="providers",
        help_text="Categories of services offered by this provider.",
    )
    status = models.CharField(
        max_length=10,
        choices=ProfileStatus.choices,
        default=ProfileStatus.PENDING,
        help_text="The approval status of this provider profile.",
    )

    def __str__(self):
        return f"{self.business_name or self.user.username} ({self.get_status_display()})"


class Booking(models.Model):
    # ... (Your Booking model is fine, no changes needed)
    STATUS_CHOICES = [('PENDING', 'Pending Confirmation'), ('CONFIRMED', 'Confirmed by Provider'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('CANCELLED_BY_USER', 'Cancelled by User'), ('CANCELLED_BY_PROVIDER', 'Cancelled by Provider'), ('REJECTED_BY_PROVIDER', 'Rejected by Provider')]
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings_as_customer', limit_choices_to={'is_provider': False})
    provider_profile = models.ForeignKey(ServiceProviderProfile, on_delete=models.CASCADE, related_name='bookings_as_provider')
    service_category_requested = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, null=True, blank=True)
    service_description = models.TextField()
    booking_datetime = models.DateTimeField()
    address_for_service = models.CharField(max_length=255)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    estimated_duration_hours = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    quoted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    provider_notes = models.TextField(blank=True)
    customer_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-created_at']
    def __str__(self):
        return f"Booking #{self.id} for {self.customer.username} with {self.provider_profile.business_name or self.provider_profile.user.username}"


class Review(models.Model):
    # ... (Your Review model is fine, no changes needed)
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review', limit_choices_to={'status': 'COMPLETED'})
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given', limit_choices_to={'is_provider': False})
    provider_profile = models.ForeignKey(ServiceProviderProfile, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']
        unique_together = ('booking', 'reviewer')
    def __str__(self):
        return f"Review for Booking #{self.booking.id} by {self.reviewer.username} - {self.rating} stars"
    def save(self, *args, **kwargs):
        if self.booking and self.reviewer != self.booking.customer:
            raise ValueError("Reviewer must be the customer of the booking.")
        if self.booking and self.provider_profile != self.booking.provider_profile:
            raise ValueError("Reviewed provider must be the provider of the booking.")
        super().save(*args, **kwargs)


class ChatMessage(models.Model):
    # ... (Your ChatMessage model is fine, no changes needed)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='chat_messages', null=True, blank=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_chat_messages')
    message_content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    room_identifier = models.CharField(max_length=255, db_index=True)
    class Meta:
        ordering = ['timestamp']
    def __str__(self):
        return f"From {self.sender.username} in room '{self.room_identifier}' at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"