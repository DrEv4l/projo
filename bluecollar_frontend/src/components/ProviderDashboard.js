// File: src/components/ProviderDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';

const ProviderDashboard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState({ pendingBookings: 0, activeBookings: 0, completedBookings: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBookingSummary = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await apiClient.get('/bookings/');
                const bookings = response.data.results || response.data;
                const pending = bookings.filter(b => b.status === 'PENDING').length;
                const active = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS').length;
                const completed = bookings.filter(b => b.status === 'COMPLETED').length;
                setSummary({ pendingBookings: pending, activeBookings: active, completedBookings: completed });
            } catch (err) {
                console.error("Error fetching provider dashboard summary:", err);
                setError("Could not load your dashboard summary.");
            } finally {
                setLoading(false);
            }
        };

        if (user && user.is_provider) {
            fetchBookingSummary();
        }
    }, [user]);

    if (loading) return <div className="text-center"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div>
            <h2 className="mb-4">Provider Dashboard</h2>
            <p className="lead">Welcome back, <strong>{user?.username}!</strong></p>
            
            <Row className="my-4 text-center">
                <Col md={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title as="h1" className="fw-bold text-info">{summary.pendingBookings}</Card.Title>
                            <Card.Text>Pending Bookings</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title as="h1" className="fw-bold text-primary">{summary.activeBookings}</Card.Title>
                            <Card.Text>Active Bookings</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title as="h1" className="fw-bold text-success">{summary.completedBookings}</Card.Title>
                            <Card.Text>Completed Jobs</Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <div className="mt-4 d-flex justify-content-center gap-3">
                <Link to="/my-bookings" className="btn btn-primary btn-lg">
                    Manage All Bookings
                </Link>
                
                {/* === CORRECTED LINK to provider-specific edit page === */}
                <Link to="/profile/provider/edit" className="btn btn-outline-secondary btn-lg">
                    Edit Provider Profile
                </Link>
            </div>
        </div>
    );
};

export default ProviderDashboard;