# File: api/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.urls import reverse
from django.utils.html import format_html
from .models import User, ServiceCategory, ServiceProviderProfile, Booking, Review, ChatMessage

class UserAdmin(BaseUserAdmin):
    list_display = BaseUserAdmin.list_display + ('is_provider',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Provider Status', {'fields': ('is_provider',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + ( # For user creation form
        (None, {'fields': ('is_provider',)}),
    )

class ServiceProviderProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'business_name', 'phone_number')
    search_fields = ('user__username', 'business_name', 'phone_number')
    raw_id_fields = ('user', 'services_offered') # Good for ForeignKey and ManyToManyField

class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_link', 'provider_link', 'booking_datetime', 'status', 'created_at')
    list_filter = ('status', 'booking_datetime', 'service_category_requested')
    search_fields = ('customer__username', 'provider_profile__user__username', 'provider_profile__business_name', 'service_description')
    raw_id_fields = ('customer', 'provider_profile', 'service_category_requested')
    readonly_fields = ('created_at', 'updated_at')
    # Your fieldsets were good, keeping them or simplifying for now is fine.
    fieldsets = (
        (None, {'fields': ('customer', 'provider_profile', 'status')}),
        ('Service Details', {'fields': ('service_category_requested', 'service_description', 'booking_datetime', 'address_for_service')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)})
    )

    def customer_link(self, obj):
        if obj.customer:
            link = reverse("admin:api_user_change", args=[obj.customer.id]) # Assumes app name 'api'
            return format_html('<a href="{}">{}</a>', link, obj.customer.username)
        return "N/A"
    customer_link.short_description = 'Customer'

    def provider_link(self, obj):
        if obj.provider_profile and obj.provider_profile.user:
            link = reverse("admin:api_serviceproviderprofile_change", args=[obj.provider_profile.user.id])
            return format_html('<a href="{}">{}</a>', link, obj.provider_profile.business_name or obj.provider_profile.user.username)
        return "N/A"
    provider_link.short_description = 'Provider'


class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking_id_display', 'reviewer_link', 'provider_display', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('reviewer__username', 'provider_profile__user__username', 'comment')
    raw_id_fields = ('booking', 'reviewer', 'provider_profile')
    readonly_fields = ('created_at',)

    def booking_id_display(self, obj):
        if obj.booking:
            link = reverse("admin:api_booking_change", args=[obj.booking.id])
            return format_html('<a href="{}">Booking #{}</a>', link, obj.booking.id)
        return "N/A"
    booking_id_display.short_description = 'Booking'

    def reviewer_link(self, obj):
        if obj.reviewer:
            link = reverse("admin:api_user_change", args=[obj.reviewer.id])
            return format_html('<a href="{}">{}</a>', link, obj.reviewer.username)
        return "N/A"
    reviewer_link.short_description = 'Reviewer'

    def provider_display(self, obj):
        if obj.provider_profile:
            return obj.provider_profile.business_name or obj.provider_profile.user.username
        return "N/A"
    provider_display.short_description = 'Provider Reviewed'


admin.site.register(User, UserAdmin)
admin.site.register(ServiceCategory) # Can add custom admin later if needed
admin.site.register(ServiceProviderProfile, ServiceProviderProfileAdmin)
admin.site.register(Booking, BookingAdmin)
admin.site.register(Review, ReviewAdmin)
admin.site.register(ChatMessage) # Basic registration for now