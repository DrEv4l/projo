# File: api/admin.py
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.urls import reverse
from django.utils.html import format_html
from .models import User, ServiceCategory, ServiceProviderProfile, Booking, Review, ChatMessage

# --- Custom Action for Approving Providers ---
@admin.action(description='Approve selected provider profiles')
def approve_profiles(modeladmin, request, queryset):
    """
    Admin action to approve provider applications.
    Sets the profile status to APPROVED and the user's is_provider flag to True.
    """
    # Filter out profiles that are already approved to avoid redundant operations
    pending_profiles = queryset.filter(status='PENDING')
    
    # Update the status for the selected ServiceProviderProfile objects
    updated_profile_count = pending_profiles.update(status='APPROVED')
    
    # Get the user IDs from the profiles that were just updated
    user_ids_to_approve = pending_profiles.values_list('user_id', flat=True)
    
    # Update the is_provider flag on the corresponding User objects
    User.objects.filter(id__in=user_ids_to_approve).update(is_provider=True)
    
    if updated_profile_count > 0:
        modeladmin.message_user(request, f"{updated_profile_count} provider profiles were successfully approved.", messages.SUCCESS)
    else:
        modeladmin.message_user(request, "No pending profiles were selected for approval.", messages.WARNING)


# --- Custom Admin for ServiceProviderProfile ---
@admin.register(ServiceProviderProfile)
class ServiceProviderProfileAdmin(admin.ModelAdmin):
    # This is the main list view for providers. It's the "notification center".
    list_display = ('user_link', 'business_name', 'status', 'phone_number')

    # This allows the admin to easily filter for 'PENDING' applications
    list_filter = ('status', 'services_offered')
    
    search_fields = ('user__username', 'business_name', 'bio')
    
    # Use the custom action we defined above
    actions = [approve_profiles]
    
    # Use a more user-friendly widget for selecting services
    filter_horizontal = ('services_offered',)
    
    # For the User foreign key, a dropdown is fine unless you have thousands of users.
    # If so, raw_id_fields = ('user',) is better.
    autocomplete_fields = ('user',) # Even better, provides a search box

    # Organize the fields on the edit/detail page
    fieldsets = (
        ('Account Information', {
            'fields': ('user', 'status') # Admin can manually change status here too
        }),
        ('Business Details', {
            'fields': ('business_name', 'phone_number', 'bio')
        }),
        ('Services Offered', {
            'fields': ('services_offered',)
        }),
    )

    # Make the user's username clickable in the list view, linking to the user's admin page
    def user_link(self, obj):
        link = reverse("admin:api_user_change", args=[obj.user.id]) # Assumes app name 'api'
        return format_html('<a href="{}">{}</a>', link, obj.user.username)
    user_link.short_description = 'User (Username)'
    user_link.admin_order_field = 'user__username'


# --- Custom User Admin ---
class CustomUserAdmin(BaseUserAdmin):
    list_display = BaseUserAdmin.list_display + ('is_provider',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Provider Status', {'fields': ('is_provider',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {'fields': ('is_provider',)}),
    )


# --- Registering all models with the admin site ---

# Unregister the default User admin if it's already registered, then register our custom one
# This avoids potential conflicts if the User model is registered elsewhere.
# from django.contrib.auth.models import User as DjangoUser
# if admin.site.is_registered(DjangoUser):
#     admin.site.unregister(DjangoUser)
if admin.site.is_registered(User):
    admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

admin.site.register(ServiceCategory)

# ServiceProviderProfile is registered with the @admin.register decorator above, so no need to do it again.

# You can add custom admin classes for these other models as well if you want to improve their display
admin.site.register(Booking)
admin.site.register(Review)
admin.site.register(ChatMessage)