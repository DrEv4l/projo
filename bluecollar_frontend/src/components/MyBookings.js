// File: src/components/MyBookings.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import ReviewForm from './ReviewForm';
import { useNavigate } from 'react-router-dom';
// --- React-Bootstrap & Icons ---
import { Button, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaComments, FaCheckCircle, FaTimesCircle, FaHammer, FaStar, FaPlayCircle } from 'react-icons/fa';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showReviewFormForBookingId, setShowReviewFormForBookingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/bookings/');
      setBookings(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
      setBookings([]);
    }
  }, [user]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await apiClient.patch(`/bookings/${bookingId}/status/`, { status: newStatus });
      fetchBookings();
      alert(`Booking ${bookingId} status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating booking status:", err.response?.data || err.message);
      setError(`Failed to update status for booking ${bookingId}.`);
    }
  };

  const handleReviewSubmitted = (reviewedBookingId) => {
    setShowReviewFormForBookingId(null);
    fetchBookings();
  };

  const toggleReviewForm = (bookingId) => {
    setShowReviewFormForBookingId(prevId => (prevId === bookingId ? null : bookingId));
  };

  const handleGoToChat = (booking) => {
    if (!booking || !booking.id) {
        alert("Error: Booking information is missing.");
        return;
    }
    // This creates the correct, consistent, booking-specific room name
    const roomName = `booking_${booking.id}`;
    navigate(`/chat/${roomName}`);
  };

  // Helper function to get a styled badge for each status
  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: 'secondary',
      CONFIRMED: 'info',
      IN_PROGRESS: 'primary',
      COMPLETED: 'success',
      CANCELLED_BY_USER: 'warning',
      CANCELLED_BY_PROVIDER: 'warning',
      REJECTED_BY_PROVIDER: 'danger',
    };
    return <Badge bg={statusMap[status] || 'dark'}>{status?.replace(/_/g, ' ') || 'Unknown'}</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading your bookings...</p>
      </div>
    );
  }

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!user) return <p>Please log in to see your bookings.</p>;

  return (
    <div>
      <h2 className="mb-4">My Bookings</h2>
      {bookings.length === 0 ? (
        <Alert variant="info">You have no bookings yet.</Alert>
      ) : (
        <div className="d-grid gap-3">
          {bookings.map((booking) => (
            <Card key={booking.id} className="shadow-sm">
              <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                <span>Booking ID: {booking.id}</span>
                {getStatusBadge(booking.status)}
              </Card.Header>
              <Card.Body>
                {user?.is_provider ? (
                  <Card.Text><strong>Customer:</strong> {booking.customer?.first_name || booking.customer?.username}</Card.Text>
                ) : (
                  <Card.Text><strong>Provider:</strong> {booking.provider_business_name || booking.provider_username}</Card.Text>
                )}
                <Card.Text className="text-muted">{booking.service_description}</Card.Text>
                <Card.Text><strong>Date:</strong> {new Date(booking.booking_datetime).toLocaleString()}</Card.Text>
                
                <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
                  {/* --- PROVIDER ACTIONS --- */}
                  {user?.is_provider && (
                    <>
                      {booking.status === 'PENDING' && (
                        <>
                          <Button variant="success" size="sm" onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}><FaCheckCircle className="me-1" /> Confirm</Button>
                          <Button variant="danger" size="sm" onClick={() => handleStatusUpdate(booking.id, 'REJECTED_BY_PROVIDER')}><FaTimesCircle className="me-1" /> Reject</Button>
                        </>
                      )}
                      {booking.status === 'CONFIRMED' && (
                          <Button variant="primary" size="sm" onClick={() => handleStatusUpdate(booking.id, 'IN_PROGRESS')}><FaPlayCircle className="me-1" /> Start Job</Button>
                      )}
                      {booking.status === 'IN_PROGRESS' && (
                          <Button variant="success" size="sm" onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}><FaHammer className="me-1" /> Mark as Completed</Button>
                      )}
                      {/* Unified Chat Button */}
                      <Button variant="outline-secondary" size="sm" onClick={() => handleGoToChat(booking)}>
                          <FaComments className="me-1" /> Chat with Customer
                      </Button>
                    </>
                  )}

                  {/* --- CUSTOMER ACTIONS --- */}
                  {!user?.is_provider && (
                    <>
                      {booking.status === 'COMPLETED' && !booking.review && (
                        <Button variant="warning" size="sm" onClick={() => toggleReviewForm(booking.id)}>
                          <FaStar className="me-1" /> {showReviewFormForBookingId === booking.id ? 'Cancel Review' : 'Leave a Review'}
                        </Button>
                      )}
                      {/* Unified Chat Button */}
                      <Button variant="outline-secondary" size="sm" onClick={() => handleGoToChat(booking)}>
                        <FaComments className="me-1" /> Chat with Provider
                      </Button>
                    </>
                  )}
                </div>

                {booking.review && (
                  <Alert variant="light" className="mt-3">
                    <strong>Your Review:</strong>
                    <p className="mb-0">Rating: {Array(booking.review.rating).fill('★').join('')}{Array(5-booking.review.rating).fill('☆').join('')}</p>
                    <p className="mb-0 fst-italic">"{booking.review.comment || 'No comment'}"</p>
                  </Alert>
                )}
                
                {showReviewFormForBookingId === booking.id && (
                  <ReviewForm
                    bookingId={booking.id}
                    onReviewSubmitted={handleReviewSubmitted}
                  />
                )}
              </Card.Body>
              <Card.Footer className="text-muted text-end" style={{fontSize: '0.8rem'}}>
                  Requested on: {new Date(booking.created_at).toLocaleDateString()}
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;