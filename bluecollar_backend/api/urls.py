# File: api/urls.py
from django.urls import path
from .views import (
    UserCreateView,
    ServiceCategoryListView,
    ServiceProviderListView,
    ServiceProviderDetailView,
    BookingCreateView,
    BookingListView,
    BookingStatusUpdateView,
    ReviewCreateAPIView,
    UserProfileView,         # <<< ADD THIS if you created it for /users/me/
    MyTokenObtainPairView    # <<< ADD THIS (your custom token view)
)
from rest_framework_simplejwt.views import TokenRefreshView # Standard refresh view

app_name = 'api' # Good practice

urlpatterns = [
    # User Authentication & Profile
    path('users/register/', UserCreateView.as_view(), name='user-register'),
    path('users/me/', UserProfileView.as_view(), name='user-profile'), # For current user details

    # Token Authentication (JWT)
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'), # Use your custom view
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Standard refresh view is fine

    # Service Categories
    path('categories/', ServiceCategoryListView.as_view(), name='category-list'),

    # Service Providers
    path('providers/', ServiceProviderListView.as_view(), name='provider-list'),
    path('providers/<int:user_id>/', ServiceProviderDetailView.as_view(), name='provider-detail'),

    # Bookings
    path('bookings/', BookingListView.as_view(), name='booking-list-create'), # Can serve as list (GET) and create (POST if view handles it)
    # If BookingCreateView is separate:
    path('bookings/create/', BookingCreateView.as_view(), name='booking-create'),
    path('bookings/<int:pk>/status/', BookingStatusUpdateView.as_view(), name='booking-status-update'),
    # Potentially: path('bookings/<int:pk>/', YourBookingDetailView.as_view(), name='booking-detail'),

    # Reviews
    path('bookings/<int:booking_pk>/review/', ReviewCreateAPIView.as_view(), name='booking-review-create'),
]