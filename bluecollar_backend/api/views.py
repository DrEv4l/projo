# File: api/views.py

from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import Http404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import ServiceCategory, ServiceProviderProfile, Booking, Review
from .permissions import CanReviewBookingPermission
from .serializers import (
    BasicUserSerializer,
    UserRegistrationSerializer,
    ProviderRegistrationSerializer, # Make sure this is imported
    ServiceCategorySerializer,
    ServiceProviderProfileSerializer,
    BookingCreateSerializer,
    BookingListSerializer, # This is the serializer we will use for the detail view
    BookingStatusUpdateSerializer,
    ReviewSerializer,
    MyTokenObtainPairSerializer,
    UserProfileSerializer,
)

User = get_user_model()


# --- PERMISSION CLASSES ---
class IsCustomerUser(permissions.BasePermission):
    # ... (permission logic)
    message = "Only customer users can perform this action."
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and not request.user.is_provider

class IsProviderOfBooking(permissions.BasePermission):
    # ... (permission logic)
    message = "You are not the provider for this booking."
    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and request.user.is_provider
            and hasattr(request.user, "provider_profile")
            and obj.provider_profile == request.user.provider_profile
        )

class IsParticipantInBooking(permissions.BasePermission):
    # ... (permission logic)
    message = "You are not authorized to view this booking."
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        is_customer = request.user == obj.customer
        is_provider = request.user.is_provider and request.user.id == obj.provider_profile_id
        return is_customer or is_provider


# --- VIEW CLASSES ---

# --- User & Auth Views ---
class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class ProviderRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = ProviderRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class UserProfileView(generics.RetrieveAPIView):
    serializer_class = BasicUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user
    
class MyUserProfileEditView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user
    def get_queryset(self):
        return User.objects.filter(pk=self.request.user.pk)

# --- Service & Provider Views ---
class ServiceCategoryListView(generics.ListAPIView):
    queryset = ServiceCategory.objects.all().order_by("name")
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.AllowAny]

class ServiceProviderListView(generics.ListAPIView):
    serializer_class = ServiceProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        queryset = ServiceProviderProfile.objects.filter(status='APPROVED').select_related("user").prefetch_related(
            "services_offered", "reviews_received"
        ).filter(user__is_active=True).all()
        category_id = self.request.query_params.get("category", None)
        search_term = self.request.query_params.get("search", None)
        if category_id:
            try:
                queryset = queryset.filter(services_offered__id=int(category_id))
            except (ValueError, TypeError):
                pass
        if search_term:
            queryset = queryset.filter(
                Q(business_name__icontains=search_term)
                | Q(bio__icontains=search_term)
                | Q(user__username__icontains=search_term)
                | Q(services_offered__name__icontains=search_term)
            ).distinct()
        return queryset.order_by("business_name")

class ServiceProviderDetailView(generics.RetrieveAPIView):
    queryset = ServiceProviderProfile.objects.filter(status='APPROVED').select_related("user").prefetch_related(
        "services_offered", "reviews_received"
    ).all()
    serializer_class = ServiceProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "user_id"

class MyProviderProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ServiceProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def get_object(self):
        user = self.request.user
        if not hasattr(user, 'provider_profile'):
             raise Http404("No provider profile found for this user.")
        return user.provider_profile
    def get_queryset(self):
        return ServiceProviderProfile.objects.filter(user=self.request.user)

# --- Booking & Review Views ---
class BookingCreateView(generics.CreateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerUser]

class BookingListView(generics.ListAPIView):
    serializer_class = BookingListSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related(
            "customer", "provider_profile__user", "service_category_requested"
        ).prefetch_related("review")
        if user.is_provider and hasattr(user, "provider_profile") and user.provider_profile:
            return qs.filter(provider_profile=user.provider_profile)
        elif not user.is_provider:
            return qs.filter(customer=user)
        return Booking.objects.none()

# === THIS IS THE VIEW TO FIX ===
class BookingDetailView(generics.RetrieveAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingListSerializer # <<< USE THE EXISTING LIST SERIALIZER
    permission_classes = [permissions.IsAuthenticated, IsParticipantInBooking]
# === END OF FIX ===

class BookingStatusUpdateView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOfBooking]
    http_method_names = ["patch"]

class ReviewCreateAPIView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    def create(self, request, *args, **kwargs):
        booking_pk = self.kwargs.get("booking_pk")
        booking = get_object_or_404(Booking, pk=booking_pk)
        permission_checker = CanReviewBookingPermission()
        if not permission_checker.has_object_permission(request, self, booking):
            return Response(
                {"detail": permission_checker.message}, status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            serializer.save(
                booking=booking,
                reviewer=request.user,
                provider_profile=booking.provider_profile,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)