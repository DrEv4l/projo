// src/components/BookingForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const BookingForm = () => {
  // Get providerUserId from URL if navigating directly, or from location state
  const location = useLocation();
  const navigate = useNavigate();
  const providerInfo = location.state?.providerInfo; // Passed from ProviderProfile page

  const [formData, setFormData] = useState({
    service_description: '',
    booking_datetime: '', // Format: YYYY-MM-DDTHH:MM
    address_for_service: '',
    customer_notes: '',
    // service_category_requested: null, // Optional: if you have a dropdown for this
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!providerInfo || !providerInfo.id) {
      // If providerInfo is not available (e.g., direct navigation or bad state)
      setError("Provider information is missing. Cannot create booking.");
      // Optionally, redirect back or show an error message prominently
      // navigate(-1); // Go back
    }
  }, [providerInfo, navigate]);


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
      provider_profile: providerInfo.id, // Send the provider's user ID (which is PK of ServiceProviderProfile)
    };

    try {
      await apiClient.post('/bookings/create/', payload);
      setSuccess('Booking request submitted successfully! You will be notified once confirmed.');
      setFormData({ service_description: '', booking_datetime: '', address_for_service: '', customer_notes: '' });
      setTimeout(() => {
        navigate('/my-bookings'); // Navigate to a "My Bookings" page
      }, 3000);
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      let errorMsg = 'Failed to submit booking request.';
      if (err.response && err.response.data) {
        // Concatenate DRF error messages
        const errors = err.response.data;
        errorMsg = Object.keys(errors)
          .map(key => `${key}: ${Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key]}`)
          .join(' | ');
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!providerInfo) {
      return (
          <div>
              <h2>Book Service</h2>
              <p style={{color: 'red'}}>Error: Provider information not found. Please go back and select a provider.</p>
              <button onClick={() => navigate(-1)}>Go Back</button>
          </div>
      );
  }

  return (
    <div>
      <h2>Book Service with {providerInfo.name || 'Provider'}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="service_description">Service Description:</label><br/>
          <textarea id="service_description" name="service_description" value={formData.service_description} onChange={handleChange} rows="4" cols="50" required />
        </div>
        <div>
          <label htmlFor="booking_datetime">Preferred Date & Time:</label><br/>
          <input type="datetime-local" id="booking_datetime" name="booking_datetime" value={formData.booking_datetime} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="address_for_service">Address for Service:</label><br/>
          <input type="text" id="address_for_service" name="address_for_service" value={formData.address_for_service} onChange={handleChange} maxLength="255" required />
        </div>
        <div>
          <label htmlFor="customer_notes">Additional Notes (Optional):</label><br/>
          <textarea id="customer_notes" name="customer_notes" value={formData.customer_notes} onChange={handleChange} rows="3" cols="50" />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Request Booking'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;