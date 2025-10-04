// File: src/components/BookingForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
// --- React-Bootstrap Imports ---
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';

const BookingForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const providerInfo = location.state?.providerInfo;

  const [formData, setFormData] = useState({
    service_description: '',
    booking_datetime: '',
    address_for_service: '',
    customer_notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerInfo || !providerInfo.id) {
      setError("Provider information is missing. Please select a provider from the dashboard.");
    }
  }, [providerInfo]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerInfo || !providerInfo.id) {
        setError("Cannot submit booking: Provider ID is missing.");
        return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      ...formData,
      provider_profile: providerInfo.id,
    };

    try {
      await apiClient.post('/bookings/create/', payload);
      setSuccess('Booking request submitted successfully! You will be notified once confirmed.');
      setFormData({ service_description: '', booking_datetime: '', address_for_service: '', customer_notes: '' });
      setTimeout(() => {
        navigate('/my-bookings');
      }, 3000);
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      let errorMsg = 'Failed to submit booking request.';
      if (err.response && err.response.data) {
        const errors = err.response.data;
        errorMsg = Object.keys(errors)
          .map(key => `${key.replace(/_/g, ' ')}: ${Array.isArray(errors[key]) ? errors[key].join(' ') : errors[key]}`)
          .join(' | ');
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!providerInfo) {
      return (
        <Alert variant="danger" className="text-center">
          <Alert.Heading>Error: Provider Not Specified</Alert.Heading>
          <p>Provider information was not found. Please go back to the dashboard and select a provider to book.</p>
          <hr />
          <div className="d-flex justify-content-center">
            <Button as={Link} to="/dashboard" variant="outline-danger">Go to Dashboard</Button>
          </div>
        </Alert>
      );
  }

  return (
    <Row className="justify-content-center mt-4">
      <Col md={8} lg={6}>
        <Card className="p-4 shadow">
          <Card.Body>
            <h2 className="text-center mb-4 fw-bold">Book Service with {providerInfo.name}</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formServiceDescription">
                <Form.Label>Service Description</Form.Label>
                <Form.Control as="textarea" rows={4} name="service_description" value={formData.service_description} onChange={handleChange} required disabled={loading || success} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formBookingDatetime">
                <Form.Label>Preferred Date & Time</Form.Label>
                <Form.Control type="datetime-local" name="booking_datetime" value={formData.booking_datetime} onChange={handleChange} required disabled={loading || success} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formAddress">
                <Form.Label>Address for Service</Form.Label>
                <Form.Control type="text" name="address_for_service" value={formData.address_for_service} onChange={handleChange} required disabled={loading || success} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formCustomerNotes">
                <Form.Label>Additional Notes (Optional)</Form.Label>
                <Form.Control as="textarea" rows={3} name="customer_notes" value={formData.customer_notes} onChange={handleChange} disabled={loading || success} />
              </Form.Group>
              <div className="d-grid mt-4">
                <Button variant="primary" type="submit" disabled={loading || success}>
                  {loading ? <><Spinner as="span" animation="border" size="sm" /> Submitting...</> : 'Request Booking'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default BookingForm;