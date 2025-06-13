// src/components/ProviderDashboard.js (NEW FILE)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

const ProviderDashboard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState({ pendingBookings: 0, activeBookings: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch a summary for the provider, e.g., number of pending/active bookings
        // This would require a new API endpoint or derive from the full bookings list
        const fetchSummary = async () => {
            setLoading(true);
            try {
                // Example: fetch all bookings and count them
                // In a real app, you might have a dedicated summary endpoint
                const response = await apiClient.get('/bookings/'); // Fetches bookings for this provider
                const bookings = response.data.results || response.data;
                const pending = bookings.filter(b => b.status === 'PENDING').length;
                const active = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS').length;
                setSummary({ pendingBookings: pending, activeBookings: active });
            } catch (error) {
                console.error("Error fetching provider dashboard summary:", error);
            }
            setLoading(false);
        };
        if(user && user.is_provider) {
            fetchSummary();
        }
    }, [user]);

    if (loading) return <p>Loading provider dashboard...</p>;

    return (
        <div>
            <h2>Welcome, Provider {user?.username}!</h2>
            <p>This is your Provider Dashboard.</p>
            <Link to="/my-bookings">Manage Your Bookings</Link>
            <hr />
            <div>
                <h3>Booking Summary</h3>
                <p>Pending Bookings: {summary.pendingBookings}</p>
                <p>Active Bookings: {summary.activeBookings}</p>
            </div>
            {/* Add links to manage profile, services, etc. later */}
        </div>
    );
};
export default ProviderDashboard;