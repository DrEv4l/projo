// File: src/components/CustomerDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Row, Col, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';
import { FaSearch, FaWrench, FaBolt, FaPaintBrush, FaBroom, FaPlus } from 'react-icons/fa';

const categoryIcons = {
  default: <FaPlus className="me-2" />,
  Plumbing: <FaWrench className="me-2" />,
  Electrical: <FaBolt className="me-2" />,
  Painting: <FaPaintBrush className="me-2" />,
  Cleaning: <FaBroom className="me-2" />,
};

const CustomerDashboard = () => {
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories/');
        setCategories(response.data.results || response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (selectedCategoryId) {
      params.append('category', selectedCategoryId);
    }
    if (searchTerm) {
      params.append('search', searchTerm);
    }
    try {
      const response = await apiClient.get(`/providers/?${params.toString()}`);
      setProviders(response.data.results || response.data);
    } catch (err) {
      console.error("Error fetching providers:", err);
      setError('Could not load service providers.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, searchTerm]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchProviders();
    }, 300);
    return () => clearTimeout(timerId);
  }, [fetchProviders]);

  if (error && !loading) return <Alert variant="danger">{error}</Alert>;
  
  const selectedCategoryName = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId)?.name : '';

  return (
    <div>
      <h2 className="mb-3">Welcome, {user?.username}! Find a Service</h2>
      <Link to="/my-bookings">View My Bookings</Link>
      <hr className="my-4" />

      <Card className="p-3 mb-4 shadow-sm">
        <Row className="g-3 align-items-center">
          <Col lg={7} className="border-lg-end">
            <h5 className="mb-2">Filter by Category</h5>
            <div className="d-flex flex-wrap gap-2">
              {categories.map(category => (
                <Button key={category.id} variant={selectedCategoryId === category.id ? 'primary' : 'outline-primary'}
                        onClick={() => setSelectedCategoryId(category.id)} size="sm">
                  {categoryIcons[category.name] || categoryIcons.default} {category.name}
                </Button>
              ))}
              {selectedCategoryId && (
                <Button variant="outline-secondary" size="sm" onClick={() => setSelectedCategoryId(null)}>
                  Clear Filter
                </Button>
              )}
            </div>
          </Col>
          <Col lg={5}>
            <h5 className="mb-2">Search by Keyword</h5>
            <Form onSubmit={(e) => e.preventDefault()}>
              <InputGroup>
                <Form.Control type="text" placeholder="e.g., 'plumber', business name..."
                              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Button variant="outline-secondary"><FaSearch /></Button>
              </InputGroup>
            </Form>
          </Col>
        </Row>
      </Card>
      
      <h4>{loading ? 'Searching...' : `Showing ${providers.length} Providers ${selectedCategoryName ? `for ${selectedCategoryName}` : ''}`}</h4>
      
      {loading ? (
        <div className="text-center mt-4"><Spinner animation="border" /></div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4 mt-2">
          {providers.length > 0 ? (
            providers.map(provider => (
              <Col key={provider.user.id}>
                <Card className="h-100 shadow-sm custom-card-hover">
                  <Card.Body className="d-flex flex-column">
                    <Card.Title as="h5" className="fw-bold">{provider.business_name || provider.user.username}</Card.Title>
                    {provider.average_rating != null && (
                      <Card.Subtitle className="mb-2 text-muted">Rating: {provider.average_rating.toFixed(1)} ★</Card.Subtitle>
                    )}
                    <Card.Text className="text-muted flex-grow-1">
                      {provider.bio ? `${provider.bio.substring(0, 90)}...` : 'No bio available.'}
                    </Card.Text>
                    <Button as={Link} to={`/providers/${provider.user.id}`} variant="primary" className="mt-auto">
                      View Profile & Book
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))
          ) : (
            <Col><Alert variant="info">No providers match your search criteria.</Alert></Col>
          )}
        </Row>
      )}
    </div>
  );
};

export default CustomerDashboard;