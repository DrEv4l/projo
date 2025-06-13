from rest_framework import serializers
from django.contrib.auth import get_user_model # To get your custom User model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import ServiceCategory, ServiceProviderProfile, Booking, Review# Import your models
from django.db.models import Avg
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

User = get_user_model() # This gets the User model defined in AUTH_USER_MODEL

class BasicUserSerializer(serializers.ModelSerializer):
    """
    A simple serializer for basic user info, to embed in other serializers.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ('id', 'name', 'description', 'icon')  # Include all fields you want to expose

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = BasicUserSerializer(read_only=True)
    # Optional: If you want to show some provider details directly on the review
    # provider_profile_business_name = serializers.CharField(source='provider_profile.business_name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'booking', # Expect booking ID on write, can be nested on read
            'reviewer',
            'provider_profile', # Expect provider_profile ID on write, can be nested on read
            'rating',
            'comment',
            'created_at',
            # 'provider_profile_business_name', # If you added the optional field above
        ]
        read_only_fields = ['reviewer', 'provider_profile', 'created_at']
        # 'booking' ID is passed via URL in our ReviewCreateAPIView, so it's not expected in POST data.
        # 'reviewer' and 'provider_profile' are set in the view.

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value    
    
class SimpleReviewForBookingSerializer(serializers.ModelSerializer): # NEW helper serializer
    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment']



class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")

    class Meta:
        model = User
        # Fields to include in the serializer for registration
        # 'username' is included by default with ModelSerializer for User model
        # 'email' is also important for user accounts
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False}, # Make first_name optional
            'last_name': {'required': False},  # Make last_name optional
            'email': {'required': True}        # Ensure email is required
        }

    def validate_email(self, value):
        """
        Check if the email is already in use.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        """
        Check that the two password entries match.
        """
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        """
        Create and return a new `User` instance, given the validated data.
        """
        # We don't want to save password2 to the database
        validated_data.pop('password2')
        # Use create_user to handle password hashing
        user = User.objects.create_user(**validated_data)
        # You could add logic here like sending a verification email
        return user


# api/serializers.py
# ... (other imports and serializers) ...

 # Add more if needed

class ServiceProviderProfileSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True) # Embed basic user details
    services_offered = ServiceCategorySerializer(many=True, read_only=True) # Show full category details
    average_rating = serializers.SerializerMethodField(read_only=True)
    reviews_received = ReviewSerializer(many=True, read_only=True)
    class Meta:
        model = ServiceProviderProfile
        fields = [
            'user', # This will now be the nested BasicUserSerializer output
            'business_name',
            'bio',
            'phone_number',
            'services_offered',
            'average_rating',
            'reviews_received',
            # Add other fields like 'profile_picture_url' if you have them
        ]

    def get_average_rating(self, obj):
        """
        Calculate the average rating for the service provider.
        This assumes you have a Review model with a rating field.
        """
        avg_rating = obj.reviews_received.aggregate(Avg('rating'))['rating__avg']
        return round(avg_rating, 2) if avg_rating else None

class BookingCreateSerializer(serializers.ModelSerializer):
    # provider_profile_id = serializers.IntegerField(write_only=True) # Or however you want to specify the provider
    # For simplicity, let's assume provider_profile ID is passed directly for now
    # In a real app, you might want to validate provider_profile based on user ID from URL like in ProviderProfileDetailView

    class Meta:
        model = Booking
        # Fields that the customer will provide when creating a booking
        fields = [
            'provider_profile', # Expecting the ID of the ServiceProviderProfile
            'service_category_requested', # Optional, expecting ID
            'service_description',
            'booking_datetime',
            'address_for_service',
            'customer_notes',
        ]
        read_only_fields = ['customer', 'status'] # customer is set from request.user, status has a default

    def validate_provider_profile(self, value):
        # Ensure the selected provider profile exists and is active (if you have an active flag)
        if not ServiceProviderProfile.objects.filter(pk=value.pk, user__is_active=True).exists(): # value is already a ServiceProviderProfile instance
            raise serializers.ValidationError("Selected service provider is not valid or not active.")
        return value

    def validate_booking_datetime(self, value):
        # Add validation for booking_datetime (e.g., not in the past, within business hours)
        from django.utils import timezone
        if value < timezone.now():
            raise serializers.ValidationError("Booking date and time cannot be in the past.")
        # Add more specific business logic here if needed
        return value

    def create(self, validated_data):
        # customer is set automatically from the authenticated user making the request
        booking = Booking.objects.create(customer=self.context['request'].user, **validated_data)
        # You could add notifications to the provider here
        return booking


# Serializer for listing/retrieving bookings (might show more info)
class BookingListSerializer(serializers.ModelSerializer):
    customer = BasicUserSerializer(read_only=True) # From Task 2.2
    provider_profile = ServiceProviderProfileSerializer(read_only=True) # From Task 2.2
    service_category_requested = ServiceCategorySerializer(read_only=True)

    class Meta:
        model = Booking
        fields = '__all__'

class BookingStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['status'] # Only status can be updated via this serializer

    def validate_status(self, value):
        # Providers should only be able to set certain statuses
        allowed_provider_statuses = [
            'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
            'CANCELLED_BY_PROVIDER', 'REJECTED_BY_PROVIDER'
        ]
        if value not in allowed_provider_statuses:
            raise serializers.ValidationError(f"Invalid status. Provider can set to: {', '.join(allowed_provider_statuses)}")
        return value        
    
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['is_provider'] = user.is_provider # Add this
        # ... add other claims if needed
        return token

class MyTokenObtainPairView(TokenObtainPairView): # Use this view in urls.py
    serializer_class = MyTokenObtainPairSerializer    
    



     # Show all fields for list/detail views, or specify them
    # def get_average_rating(self, obj):
    #     # Placeholder: Calculate or fetch average rating for obj (ServiceProviderProfile instance)
    #     # For now, return a fixed value or None
    #     # This will be implemented properly when you have the Review model
    #     # avg_rating = obj.reviews_received.aggregate(Avg('rating'))['rating__avg']
    #     # return round(avg_rating, 2) if avg_rating else None
    #     return 0.0 # Temporary

# Serializer for creating/updating ServiceProviderProfile (might be different)
# For now, the above serializer is primarily for listing/retrieving.
# If you need to create/update profiles via API, you might need a writable serializer.        