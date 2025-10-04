// File: src/components/ProviderProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import { Card, Button, Row, Col, Spinner, Alert, ListGroup, Image } from 'react-bootstrap'; // Import Image
import { FaStar, FaPhone, FaEnvelope, FaComments, FaBook, FaUserCircle } from 'react-icons/fa'; // Import FaUserCircle for placeholder

const StarRatingDisplay = ({ rating }) => {
    if (rating == null) return <span className="text-muted fst-italic">Not rated yet</span>;
    const numericRating = parseFloat(rating);
    const starElements = Array.from({ length: 5 }, (_, i) => (
        <FaStar key={i} color={i < numericRating ? '#ffc107' : '#e4e5e9'} />
    ));
    return <>{starElements} <span className="ms-2">({numericRating.toFixed(1)})</span></>;
};

const ProviderProfile = () => {
  const { providerUserId } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); 

  useEffect(() => {
    const fetchProviderProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get(`/providers/${providerUserId}/`);
        setProvider(response.data);
      } catch (err) {
        console.error("Error fetching provider profile:", err);
        setError(err.response?.status === 404 ? 'Service provider not found.' : 'Failed to load provider profile.');
      } finally {
        setLoading(false);
      }
    };
    if (providerUserId) {
      fetchProviderProfile();
    }
  }, [providerUserId]);
  
  const handleBookServiceClick = () => {
    if (provider) {
      navigate(`/book-service`, {
        state: { providerInfo: { id: provider.user.id, name: provider.business_name || provider.user.username } }
      });
    }
  };

  const handleChatWithProviderClick = () => { /* ... (Your chat logic is fine) ... */ };

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!provider) return <Alert variant="warning">No provider data available.</Alert>;

  const canBookOrChat = currentUser && !currentUser.is_provider;

  return (
    <div>
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow-lg">
            <Card.Header as="h2" className="text-center p-4 bg-light">
                {provider.business_name || provider.user.username}
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={4} className="text-center mb-4 mb-md-0">
                  {/* --- UPDATED PHOTO SECTION to display the image --- */}
                  {provider.profile_picture ? (
                    <Image 
                      src={provider.profile_picture} // Django provides the full URL
                      alt={provider.business_name || provider.user.username}
                      roundedCircle 
                      style={{width: 150, height: 150, objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}
                    />
                  ) : (
                    <div style={{width: 150, height: 150, margin: '0 auto'}}>
                      <FaUserCircle size="100%" color="#e9ecef" />
                    </div>
                  )}
                  {/* --- END OF UPDATED PHOTO SECTION --- */}
                  <div className="mt-3">
                    <StarRatingDisplay rating={provider.average_rating} />
                    <div className="text-muted">({provider.reviews_received?.length || 0} reviews)</div>
                  </div>
                </Col>
                <Col md={8}>
                  <Card.Title as="h4">About</Card.Title>
                  <Card.Text>{provider.bio || 'No biography provided.'}</Card.Text>
                  <hr />
                  <p><FaPhone className="me-2 text-muted" /> {provider.phone_number || 'Not provided'}</p>
                  <p><FaEnvelope className="me-2 text-muted" /> {provider.user.email}</p>
                  <hr />
                  <h5 className="mt-4">Services Offered</h5>
                  <ListGroup variant="flush">
                    {provider.services_offered?.length > 0 ? (
                      provider.services_offered.map(service => (
                        <ListGroup.Item key={service.id}>{service.name}</ListGroup.Item>
                      ))
                    ) : (
                      <ListGroup.Item>No specific services listed.</ListGroup.Item>
                    )}
                  </ListGroup>
                </Col>
              </Row>
              {canBookOrChat && (
                <div className="text-center mt-4 pt-3 border-top">
                  <Button onClick={handleBookServiceClick} variant="primary" size="lg" className="me-3">
                    <FaBook className="me-2" />Book This Provider
                  </Button>
                  <Button onClick={handleChatWithProviderClick} variant="success" size="lg">
                    <FaComments className="me-2" />Chat Now
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col md={10} lg={8}>
          <h3 className="mb-3">Customer Reviews</h3>
          {/* ... (Your reviews mapping is fine) ... */}
        </Col>
      </Row>
      <div className="text-center mt-4">
        <Link to="/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default ProviderProfile;