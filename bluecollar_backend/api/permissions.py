# File: your_project_directory/api/permissions.py

from rest_framework import permissions
from .models import Booking, Review # Ensure Review is imported

class CanReviewBookingPermission(permissions.BasePermission):
    """
    Custom permission to only allow customers of completed bookings to create a review once.
    """
    message = 'You do not have permission to review this booking.'

    def has_object_permission(self, request, view, obj):
        # obj is expected to be a Booking instance, passed from the view.
        if not isinstance(obj, Booking):
            self.message = "Invalid object for review permission check."
            return False

        if obj.customer != request.user:
            self.message = "You can only review your own bookings."
            return False

        if obj.status != 'COMPLETED':
            # This check is also in Review model's limit_choices_to for booking FK,
            # but it's good to have an explicit API-level error message.
            self.message = "You can only review completed bookings."
            return False

        if Review.objects.filter(booking=obj).exists():
            # OneToOneField on Review.booking ensures this at DB level after creation.
            # This check prevents API attempt if review already exists.
            self.message = "A review for this booking already exists."
            return False

        return True