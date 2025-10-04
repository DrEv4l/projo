// File: src/components/BookingDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaComments, FaCalendarAlt, FaMapMarkerAlt, FaUser, FaHardHat } from 'react-icons/fa';
import ChatWindow from './ChatWindow';

const BookingDetails = () => {
    const { bookingId } = useParams(); // Gets the ID from the URL (e.g., /bookings/3)
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        const fetchBookingDetails = async () => {
            if (!bookingId) return;
            setLoading(true);
            setError('');
            try {
                const response = await apiClient.get(`/bookings/${bookingId}/`);
                setBooking(response.data);
            } catch (err) {
                console.error("Error fetching booking details:", err);
                if (err.response && (err.response.status === 404 || err.response.status === 403)) {
                    setError('Booking not found or you are not authorized to view it.');
                } else {
                    setError('Failed to load booking details.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchBookingDetails();
    }, [bookingId]);

    const getStatusBadge = (status) => {
        const statusMap = {
            PENDING: 'secondary', CONFIRMED: 'info', IN_PROGRESS: 'primary',
            COMPLETED: 'success', CANCELLED_BY_USER: 'warning',
            CANCELLED_BY_PROVIDER: 'warning', REJECTED_BY_PROVIDER: 'danger',
        };
        return <Badge bg={statusMap[status] || 'dark'}>{status?.replace(/_/g, ' ') || 'Unknown'}</Badge>;
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger" className="text-center">{error}</Alert>;
    if (!booking) return <Alert variant="warning">Booking data not available.</Alert>;

    // Prepare variables for the chat window
    const roomName = `booking_${booking.id}`;
    const currentUserId = currentUser ? currentUser.user_id : null;

    return (
        <Row className="justify-content-center">
            <Col md={10} lg={8}>
                <Card className="shadow-sm">
                    <Card.Header as="h3" className="d-flex justify-content-between align-items-center">
                        <span>Booking Details #{booking.id}</span>
                        {getStatusBadge(booking.status)}
                    </Card.Header>
                    <Card.Body>
                        <Card.Title as="h5">Service Request</Card.Title>
                        <Card.Text className="bg-light p-3 rounded">{booking.service_description}</Card.Text>
                        <hr />
                        <Row>
                            <Col md={6}>
                                <p><strong><FaHardHat className="me-2" />Provider:</strong> {booking.provider_business_name || booking.provider_username}</p>
                                <p><strong><FaUser className="me-2" />Customer:</strong> {booking.customer.username}</p>
                            </Col>
                            <Col md={6}>
                                <p><strong><FaCalendarAlt className="me-2" />Date:</strong> {new Date(booking.booking_datetime).toLocaleString()}</p>
                                <p><strong><FaMapMarkerAlt className="me-2" />Address:</strong> {booking.address_for_service}</p>
                            </Col>
                        </Row>
                        {booking.customer_notes && (
                            <>
                                <hr />
                                <h6>Your Notes:</h6>
                                <p className="text-muted fst-italic">"{booking.customer_notes}"</p>
                            </>
                        )}
                        {booking.provider_notes && (
                            <>
                                <hr />
                                <h6>Provider's Notes:</h6>
                                <p className="text-muted fst-italic">"{booking.provider_notes}"</p>
                            </>
                        )}
                    </Card.Body>
                    <Card.Footer className="text-center">
                        <Button onClick={() => setShowChat(!showChat)} variant="primary">
                            <FaComments className="me-2" />{showChat ? 'Hide Chat' : 'Open Chat'}
                        </Button>
                    </Card.Footer>
                </Card>
                {showChat && currentUserId && (
                    <div className="mt-4">
                        <ChatWindow
                            roomName={roomName}
                            currentUserId={currentUserId}
                        />
                    </div>
                )}
                 <div className="mt-3">
                    <Link to="/my-bookings">← Back to My Bookings</Link>
                </div>
            </Col>
        </Row>
    );
};

export default BookingDetails;