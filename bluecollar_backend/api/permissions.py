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
    

class IsCustomerUser(permissions.BasePermission):
    message = "Only customer users are permitted to perform this action."

    def has_permission(self, request, view):
        print("\n--- IsCustomerUser PERMISSION CHECK ---")
        
        user = request.user
        print(f"  Request User object: {user}")
        print(f"  User Type: {type(user)}")
        
        if not (user and user.is_authenticated):
            print(f"  RESULT: FAILED - User is not authenticated.")
            self.message = "Authentication required."
            return False

        # Use getattr for safe access, though it should exist
        is_provider_flag = getattr(user, 'is_provider', 'ATTRIBUTE_NOT_FOUND')
        
        print(f"  User Details: username='{user.username}', id={user.id}")
        print(f"  Checking 'is_provider' attribute: Value = {is_provider_flag}")
        
        if is_provider_flag is True:
            print(f"  RESULT: FAILED - User '{user.username}' has is_provider=True.")
            self.message = "Service providers cannot create bookings as customers."
            return False
        
        print(f"  RESULT: PASSED - User '{user.username}' is a customer.")
        print("-------------------------------------\n")
        return True    
    
    class IsProfileOwner(permissions.BasePermission):
        """
        Allows access only to the user who owns the profile.
        Assumes the view's object is a ServiceProviderProfile.
        """
        message = "You do not have permission to edit this profile."
    
        def has_object_permission(self, request, view, obj):
            # obj is the ServiceProviderProfile instance
            # The PK of ServiceProviderProfile is the user_id, so obj.pk is the user's ID.
            return obj.pk == request.user.id