// src/components/MyBookings.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig'; // Or your axiosInstance
import { useAuth } from '../context/AuthContext';
import ReviewForm from './ReviewForm'; // Adjust path if ReviewForm.js is elsewhere (e.g., ../components/ReviewForm)

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // === NEW STATE FOR PHASE 5 ===
  const [showReviewFormForBookingId, setShowReviewFormForBookingId] = useState(null);
  // === END OF NEW STATE ===

  const fetchBookings = async () => { // Renamed from useEffect's inner function for clarity
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/bookings/');
      // Ensure response.data is an array. If API paginates, it might be response.data.results
      setBookings(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError('Failed to load bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await apiClient.patch(`/api/bookings/${bookingId}/status/`, { status: newStatus });
      // To reflect the change immediately, refetch or update state
      fetchBookings(); // Simple way to update
      alert(`Booking ${bookingId} status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating booking status:", err.response?.data || err.message);
      setError(`Failed to update status for booking ${bookingId}.`);
    }
  };

  // === NEW HANDLERS FOR PHASE 5 ===
  const handleReviewSubmitted = (reviewedBookingId) => {
    setShowReviewFormForBookingId(null); // Close the form
    fetchBookings(); // Re-fetch bookings to update the list (e.g., to show the review or hide "Leave Review" button)
  };

  const toggleReviewForm = (bookingId) => {
    setShowReviewFormForBookingId(prevId => (prevId === bookingId ? null : bookingId));
  };
  // === END OF NEW HANDLERS ===

  if (loading) return <p>Loading your bookings...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>My Bookings</h2>
      {bookings.length === 0 ? (
        <p>You have no bookings yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {bookings.map((booking) => (
            <li key={booking.id} style={{ border: '1px solid #ccc', marginBottom: '15px', padding: '15px', borderRadius: '5px' }}>
              <h4>Booking ID: {booking.id}</h4>
              {user?.is_provider ? (
                // Make sure booking.customer exists and has username/first_name
                <p>Customer: {booking.customer?.first_name || booking.customer?.username || 'N/A'}</p>
              ) : (
                // Make sure booking.provider_profile exists and has user/business_name
                <p>Provider: {booking.provider_profile?.business_name || booking.provider_profile?.user?.username || 'N/A'}</p>
              )}
              <p>Service: {booking.service_description?.substring(0,100)}...</p>
              <p>Booked for: {new Date(booking.booking_datetime).toLocaleString()}</p>
              <p>Address: {booking.address_for_service}</p>
              <p>Status: <strong>{booking.status?.replace(/_/g, ' ') || 'N/A'}</strong></p>
              <p>Requested on: {new Date(booking.created_at).toLocaleDateString()}</p>

              {/* Provider Actions (Your existing code - good!) */}
              {user?.is_provider && booking.status === 'PENDING' && (
                <div>
                  <button onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')} style={{marginRight: '5px'}}>Confirm</button>
                  <button onClick={() => handleStatusUpdate(booking.id, 'REJECTED_BY_PROVIDER')}>Reject</button>
                </div>
              )}
              {user?.is_provider && booking.status === 'CONFIRMED' && (
                <div>
                  <button onClick={() => handleStatusUpdate(booking.id, 'IN_PROGRESS')} style={{marginRight: '5px'}}>Start Job</button>
                  <button onClick={() => handleStatusUpdate(booking.id, 'CANCELLED_BY_PROVIDER')}>Cancel Booking</button>
                </div>
              )}
               {user?.is_provider && booking.status === 'IN_PROGRESS' && (
                <div>
                  <button onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}>Mark as Completed</button>
                </div>
              )}

              {/* === CUSTOMER ACTIONS - "LEAVE A REVIEW" FOR PHASE 5 === */}
              {/* Show only if user is a customer AND booking is completed AND no review exists */}
              {!user?.is_provider && booking.status === 'COMPLETED' && !booking.review && (
                <div style={{ marginTop: '10px' }}>
                  <button onClick={() => toggleReviewForm(booking.id)}>
                    {showReviewFormForBookingId === booking.id ? 'Cancel Review' : 'Leave a Review'}
                  </button>
                </div>
              )}

              {/* Display existing review if present (for customer or provider view) */}
              {booking.review && (
                  <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '3px'}}>
                      <strong>Review:</strong>
                      <p>Rating: {Array(booking.review.rating).fill('★').join('')}{Array(5-booking.review.rating).fill('☆').join('')}</p>
                      <p>Comment: {booking.review.comment || <em>No comment</em>}</p>
                  </div>
              )}

              {/* Show the review form if this booking is selected for review */}
              {showReviewFormForBookingId === booking.id && !user?.is_provider && (
                <ReviewForm
                  bookingId={booking.id}
                  onReviewSubmitted={handleReviewSubmitted}
                />
              )}
              {/* === END OF PHASE 5 CUSTOMER ACTIONS === */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyBookings;