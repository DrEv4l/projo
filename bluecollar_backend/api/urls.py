# File: api/urls.py
from django.urls import path
from .views import (
    UserCreateView,
    ProviderRegistrationView, # IMPORTED
    ServiceCategoryListView,
    ServiceProviderListView,
    ServiceProviderDetailView,
    MyProviderProfileView,
    BookingCreateView,
    BookingListView,
    BookingDetailView,
    BookingStatusUpdateView,
    ReviewCreateAPIView,
    UserProfileView,
    MyTokenObtainPairView,
    MyUserProfileEditView,
)
from rest_framework_simplejwt.views import TokenRefreshView

app_name = "api"

urlpatterns = [
    # User Auth & Profile
    path("users/register/", UserCreateView.as_view(), name="user-register"), # For Customers
    path("users/register/provider/", ProviderRegistrationView.as_view(), name="provider-register"), # For Providers
    path("users/me/", UserProfileView.as_view(), name="user-profile"),
    path("users/me/profile/", MyUserProfileEditView.as_view(), name="my-user-profile-edit"),
    path("token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Services & Providers
    path("categories/", ServiceCategoryListView.as_view(), name="category-list"),
    path("providers/", ServiceProviderListView.as_view(), name="provider-list"),
    path("providers/me/", MyProviderProfileView.as_view(), name="my-provider-profile"),
    path("providers/<int:user_id>/", ServiceProviderDetailView.as_view(), name="provider-detail"),

    # Bookings
    path("bookings/", BookingListView.as_view(), name="booking-list"),
    path("bookings/create/", BookingCreateView.as_view(), name="booking-create"),
    path("bookings/<int:pk>/status/", BookingStatusUpdateView.as_view(), name="booking-status-update"),
    path("bookings/<int:pk>/", BookingDetailView.as_view(), name="booking-detail"),

    # Reviews
    path("bookings/<int:booking_pk>/review/", ReviewCreateAPIView.as_view(), name="booking-review-create"),
]