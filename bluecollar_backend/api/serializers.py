# File: api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Avg
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    ServiceCategory, ServiceProviderProfile, Booking, Review, ChatMessage, User
)

User = get_user_model()


# --- UTILITY & READ-ONLY SERIALIZERS ---

class BasicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        # === THIS IS THE FIX ===
        # The fields now correctly match the model: icon_class and category_image
        fields = ("id", "name", "description", "icon_class", "category_image")
        # =======================

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = BasicUserSerializer(read_only=True)
    class Meta:
        model = Review
        fields = ["id", "booking", "reviewer", "provider_profile", "rating", "comment", "created_at"]
        read_only_fields = ["booking", "reviewer", "provider_profile", "created_at"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

class SimpleReviewForBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "rating", "comment"]


# --- REGISTRATION & AUTH SERIALIZERS ---

class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")
    class Meta:
        model = User
        fields = ("username", "email", "password", "password2", "first_name", "last_name")
        extra_kwargs = {"password": {"write_only": True}, "first_name": {"required": False}, "last_name": {"required": False}}
    
    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create_user(**validated_data, is_provider=False)
        return user

class ProviderRegistrationSerializer(serializers.Serializer):
    # User fields
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'}, label="Confirm password")
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    # ProviderProfile fields
    business_name = serializers.CharField(required=True, allow_blank=False, write_only=True)
    phone_number = serializers.CharField(required=True, allow_blank=False, write_only=True)
    bio = serializers.CharField(required=False, allow_blank=True, style={'base_template': 'textarea.html'}, write_only=True)
    services_offered_ids = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=ServiceCategory.objects.all(), write_only=True),
        required=False, write_only=True
    )

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Password fields didn't match."})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        service_ids = validated_data.pop('services_offered_ids', [])
        validated_data.pop("password2")
        
        user_data = {key: validated_data.pop(key) for key in ['username', 'email', 'password', 'first_name', 'last_name'] if key in validated_data}
        user = User.objects.create_user(**user_data, is_provider=False)

        profile_data = {key: validated_data.pop(key) for key in ['business_name', 'phone_number', 'bio'] if key in validated_data}
        profile = ServiceProviderProfile.objects.create(user=user, status='PENDING', **profile_data)
        
        if service_ids:
            profile.services_offered.set(service_ids)
            
        return user

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_provider'] = user.is_provider
        token['user_id'] = user.id
        return token


# --- PROFILE & BOOKING SERIALIZERS ---

class ServiceProviderProfileSerializer(serializers.ModelSerializer):
    user = BasicUserSerializer(read_only=True)
    services_offered = ServiceCategorySerializer(many=True, read_only=True)
    services_offered_ids = serializers.PrimaryKeyRelatedField(queryset=ServiceCategory.objects.all(), many=True, write_only=True, source='services_offered')
    average_rating = serializers.SerializerMethodField(read_only=True)
    reviews_received = ReviewSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)
    
    class Meta:
        model = ServiceProviderProfile
        fields = ['user', 'business_name', 'bio', 'phone_number', 'profile_picture', 'services_offered', 'services_offered_ids', 'average_rating', 'reviews_received', 'status']

    def get_average_rating(self, obj):
        avg_rating = obj.reviews_received.aggregate(Avg('rating'))['rating__avg']
        return round(avg_rating, 2) if avg_rating is not None else None

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_provider']
        read_only_fields = ['id', 'username', 'email', 'is_provider']

class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['provider_profile', 'service_category_requested', 'service_description', 'booking_datetime', 'address_for_service', 'customer_notes']
        read_only_fields = ['customer', 'status']

    def validate_provider_profile(self, value):
        # Only allow booking with APPROVED providers
        if not (value.status == 'APPROVED' and value.user.is_active):
            raise serializers.ValidationError("Selected service provider is not valid or not active.")
        return value

    def validate_booking_datetime(self, value):
        from django.utils import timezone
        if value < timezone.now():
            raise serializers.ValidationError("Booking date and time cannot be in the past.")
        return value
    def create(self, validated_data):
        booking = Booking.objects.create(customer=self.context['request'].user, **validated_data)
        return booking

class BookingListSerializer(serializers.ModelSerializer):
    customer = BasicUserSerializer(read_only=True)
    provider_business_name = serializers.CharField(source='provider_profile.business_name', read_only=True, allow_null=True)
    provider_username = serializers.CharField(source='provider_profile.user.username', read_only=True, allow_null=True)
    service_category_requested_name = serializers.CharField(source='service_category_requested.name', read_only=True, allow_null=True)
    review = SimpleReviewForBookingSerializer(read_only=True)
    unread_chat_messages_for_provider = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = ['id', 'customer', 'provider_profile', 'provider_business_name', 'provider_username', 'service_category_requested', 'service_category_requested_name', 'service_description', 'booking_datetime', 'address_for_service', 'status', 'estimated_duration_hours', 'quoted_price', 'provider_notes', 'customer_notes', 'created_at', 'updated_at', 'review', 'unread_chat_messages_for_provider']
    
    def get_unread_chat_messages_for_provider(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.is_provider and hasattr(request.user, 'provider_profile') and obj.provider_profile == request.user.provider_profile:
            room_id = f"booking_{obj.id}"
            return ChatMessage.objects.filter(room_identifier=room_id, is_read=False).exclude(sender=request.user).exists()
        return False

class BookingStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['status']
    def validate_status(self, value):
        allowed_provider_statuses = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_PROVIDER', 'REJECTED_BY_PROVIDER']
        if value not in allowed_provider_statuses:
            raise serializers.ValidationError(f"Invalid status. Provider can set to: {', '.join(allowed_provider_statuses)}")
        return value