# Users\Public\Projo\bluecollar_backend\api\views.py
from django.shortcuts import render     
from rest_framework import generics, permissions, status
from .serializers import BasicUserSerializer, UserRegistrationSerializer , ServiceCategorySerializer , ServiceProviderProfileSerializer, BookingCreateSerializer, BookingListSerializer, BookingStatusUpdateSerializer,ReviewSerializer, MyTokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import ServiceCategory, ServiceProviderProfile , Booking , Review 
from rest_framework.response import Response
from api import models
from .permissions import CanReviewBookingPermission
from rest_framework_simplejwt.views import TokenObtainPairView 
from django.shortcuts import get_object_or_404

User = get_user_model()

class UserCreateView(generics.CreateAPIView):
    """
    API endpoint for user registration.
    Allows any user (even unauthenticated) to create a new user account.
    """
    queryset = User.objects.all() # Required for CreateAPIView, though not strictly used for creation
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny] # Anyone can register

class ServiceCategoryListView(generics.ListAPIView):
    """
    API endpoint to list all available service categories.
    Accessible by any authenticated user.
    """
    queryset = ServiceCategory.objects.all().order_by('name') # Get all categories, ordered by name
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.IsAuthenticated] # Only logged-in users can see categories
    # If you want categories to be public (e.g., for the landing page before login):
    # permission_classes = [permissions.AllowAny]

class ReviewCreateAPIView(generics.CreateAPIView):
    """
    API endpoint for creating a review for a specific booking.
    Accessible via: POST /api/bookings/<booking_pk>/review/
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated] # User must be logged in

    def create(self, request, *args, **kwargs):
        booking_pk = self.kwargs.get('booking_pk') # Get booking_pk from the URL
        booking = get_object_or_404(Booking, pk=booking_pk)

        # Check custom permission against the booking object
        permission_checker = CanReviewBookingPermission()
        if not permission_checker.has_object_permission(request, self, booking):
            return Response({'detail': permission_checker.message}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # The Review model's save() method has additional validation
        try:
            # We explicitly pass booking, reviewer, and provider_profile.
            # Serializer doesn't expect these in request.data for creation.
            serializer.save(
                booking=booking,
                reviewer=request.user, # The logged-in user is the reviewer
                provider_profile=booking.provider_profile # The provider from the booking
            )
        except ValueError as e: # Catch validation errors from Review.save()
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

class ServiceProviderListView(generics.ListAPIView):
    """
    API endpoint to list service providers.
    Can be filtered by service_category_id.
    e.g., /api/providers/?category=1
    """
    serializer_class = ServiceProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated] # Only logged-in users can see providers

    def get_queryset(self):
        queryset = ServiceProviderProfile.objects.select_related('user').prefetch_related('services_offered').all()
        # .select_related('user') optimizes the query for the OneToOneField to User
        # .prefetch_related('services_offered') optimizes for the ManyToManyField

        category_id = self.request.query_params.get('category', None)
        search_term = self.request.query_params.get('search', None) # For future search functionality

        if category_id is not None:
            try:
                category_id = int(category_id)
                queryset = queryset.filter(services_offered__id=category_id)
            except ValueError:
                # Handle invalid category_id if necessary, or just ignore
                pass

        if search_term is not None:
            # Basic search example (can be expanded with Q objects for more complex searches)
            queryset = queryset.filter(
                models.Q(business_name__icontains=search_term) |
                models.Q(bio__icontains=search_term) |
                models.Q(user__username__icontains=search_term) |
                models.Q(services_offered__name__icontains=search_term)
            ).distinct() # Use distinct if searching across M2M causes duplicates


        return queryset.order_by('business_name') # Or some other relevant ordering

class ServiceProviderDetailView(generics.RetrieveAPIView):
    """
    API endpoint to retrieve a single service provider's profile.
    The lookup field is the user's ID (since user is the PK for ServiceProviderProfile).
    """
    queryset = ServiceProviderProfile.objects.select_related('user').prefetch_related('services_offered').all()
    serializer_class = ServiceProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated] # Only logged-in users can see details
    lookup_field = 'user_id' # Since user is the OneToOneField PK, we look up by user's ID
    # If you didn't set primary_key=True on the user field in ServiceProviderProfile,
    # and ServiceProviderProfile has its own 'id' PK, then you'd use:
    # lookup_field = 'id'
    # or lookup_field = 'pk' (which is the default)   

class IsCustomerUser(permissions.BasePermission):
    """
    Allows access only to authenticated users who are NOT providers.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and not request.user.is_provider

class BookingCreateView(generics.CreateAPIView):
    """
    API endpoint for customers to create a new booking.
    """
    queryset = Booking.objects.all()
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsCustomerUser] # Only authenticated non-providers

    def perform_create(self, serializer):
        # The serializer's create method already handles setting the customer
        # using self.context['request'].user
        serializer.save()
        # Add any post-creation logic here, like sending notifications

class BookingListView(generics.ListAPIView):
    """
    API endpoint to list bookings.
    - Customers see their own bookings.
    - Providers see bookings assigned to them.
    """
    serializer_class = BookingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_provider and hasattr(user, 'serviceproviderprofile'):
            # Provider sees bookings assigned to their profile
            return Booking.objects.filter(provider_profile=user.serviceproviderprofile).select_related(
                'customer', 'provider_profile__user', 'service_category_requested'
            ).prefetch_related('provider_profile__services_offered')
        elif not user.is_provider:
            # Customer sees bookings they created
            return Booking.objects.filter(customer=user).select_related(
                'customer', 'provider_profile__user', 'service_category_requested'
            ).prefetch_related('provider_profile__services_offered')
        return Booking.objects.none() # Should not happen for authenticated users, but good fallback

class IsProviderOfBooking(permissions.BasePermission):
    """
    Allows access only if the user is the provider associated with the booking.
    """
    def has_object_permission(self, request, view, obj): # obj is the Booking instance
        return request.user.is_authenticated and \
               request.user.is_provider and \
               hasattr(request.user, 'serviceproviderprofile') and \
               obj.provider_profile == request.user.serviceproviderprofile

class BookingStatusUpdateView(generics.UpdateAPIView):
    """
    API endpoint for providers to update the status of a booking.
    Uses PATCH for partial updates.
    """
    queryset = Booking.objects.all()
    serializer_class = BookingStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOfBooking]
    http_method_names = ['patch'] # Only allow PATCH requests

    # perform_update is handled by UpdateAPIView, which calls serializer.save()
    # Add notifications to customer here if needed after status update  

class UserProfileView(generics.RetrieveAPIView):
    serializer_class = BasicUserSerializer # Or a more detailed UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user  

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Custom view for obtaining JWT token pair, using the custom serializer
    to include additional claims like 'is_provider' and 'user_id'.
    """
    serializer_class = MyTokenObtainPairSerializer     