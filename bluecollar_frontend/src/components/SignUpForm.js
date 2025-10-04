// File: src/components/SignUpForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';
import { Form, Button, Card, Row, Col, Alert, ButtonGroup, Spinner } from 'react-bootstrap';

const SignUpForm = () => {
  const [userType, setUserType] = useState('customer');
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', password2: '',
    first_name: '', last_name: '',
    business_name: '', phone_number: '', bio: '',
    services_offered_ids: []
  });
  
  const [allCategories, setAllCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true); // State for category loading
  
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false); // This is for form submission
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true); // Start loading
      try {
        const response = await apiClient.get('/categories/');
        setAllCategories(response.data.results || response.data);
      } catch (err) {
        console.error("Error fetching categories for signup form:", err);
        // Optionally set an error state for categories if they fail to load
      }
      setLoadingCategories(false); // Finish loading
    };
    fetchCategories();
  }, []); // Runs once on mount

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleServiceChange = (id, checked) => {
      setFormData(prevData => {
          const currentServices = prevData.services_offered_ids;
          if (checked) {
              return { ...prevData, services_offered_ids: [...currentServices, id] };
          } else {
              return { ...prevData, services_offered_ids: currentServices.filter(serviceId => serviceId !== id) };
          }
      });
  };

  const isProviderSignup = userType === 'provider';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    setLoading(true);

    const url = isProviderSignup ? '/users/register/provider/' : '/users/register/';
    
    const payload = isProviderSignup ? {
        username: formData.username, email: formData.email, password: formData.password,
        password2: formData.password2, first_name: formData.first_name, last_name: formData.last_name,
        business_name: formData.business_name, phone_number: formData.phone_number, bio: formData.bio,
        services_offered_ids: formData.services_offered_ids
    } : {
        username: formData.username, email: formData.email, password: formData.password,
        password2: formData.password2, first_name: formData.first_name, last_name: formData.last_name
    };

    try {
      await apiClient.post(url, payload);
      const successMsg = isProviderSignup
        ? 'Application submitted! An admin will review your profile shortly.'
        : 'Registration successful! Please log in.';
      setSuccessMessage(successMsg);
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
        if (error.response?.data) {
            const errorData = error.response.data;
            const flatErrors = Object.keys(errorData).map(key =>
              `${key.replace(/_/g, ' ')}: ${Array.isArray(errorData[key]) ? errorData[key].join(' ') : errorData[key]}`
            ).join(' | ');
            setErrors({ general: flatErrors || "Please correct the errors below." });
        } else {
            setErrors({ general: 'An unexpected error occurred. Please try again.' });
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="justify-content-center mt-5">
      <Col md={8} lg={6}>
        <Card className="p-4 shadow">
          <Card.Body>
            <h2 className="text-center mb-4 fw-bold">Create an Account</h2>
            
            <ButtonGroup className="d-flex mb-4">
              <Button variant={!isProviderSignup ? 'primary' : 'outline-primary'} onClick={() => setUserType('customer')}>
                I'm a Customer
              </Button>
              <Button variant={isProviderSignup ? 'primary' : 'outline-primary'} onClick={() => setUserType('provider')}>
                I'm a Service Provider
              </Button>
            </ButtonGroup>

            {successMessage && <Alert variant="success">{successMessage}</Alert>}
            {errors.general && <Alert variant="danger">{errors.general}</Alert>}

            <Form onSubmit={handleSubmit} noValidate>
              <h4 className="mb-3 border-bottom pb-2">Account Information</h4>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>First Name</Form.Label><Form.Control type="text" name="first_name" onChange={handleChange} disabled={loading}/></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Last Name</Form.Label><Form.Control type="text" name="last_name" onChange={handleChange} disabled={loading}/></Form.Group></Col>
              </Row>
              <Form.Group className="mb-3"><Form.Label>Username</Form.Label><Form.Control type="text" name="username" onChange={handleChange} required disabled={loading}/></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Email address</Form.Label><Form.Control type="email" name="email" onChange={handleChange} required disabled={loading}/></Form.Group>
              <Row>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Password</Form.Label><Form.Control type="password" name="password" onChange={handleChange} required disabled={loading}/></Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Confirm Password</Form.Label><Form.Control type="password" name="password2" onChange={handleChange} required disabled={loading}/></Form.Group></Col>
              </Row>

              {isProviderSignup && (
                <>
                  <hr className="my-4"/>
                  <h4 className="mb-3 border-bottom pb-2">Provider Details</h4>
                  <p className="text-muted small mb-3">These details will be reviewed by an administrator.</p>
                  
                  <Form.Group className="mb-3"><Form.Label>Business Name</Form.Label><Form.Control type="text" name="business_name" onChange={handleChange} required={isProviderSignup} /></Form.Group>
                  <Form.Group className="mb-3"><Form.Label>Contact Phone</Form.Label><Form.Control type="tel" name="phone_number" onChange={handleChange} required={isProviderSignup} /></Form.Group>
                  <Form.Group className="mb-3"><Form.Label>About / Bio (Optional)</Form.Label><Form.Control as="textarea" rows={3} name="bio" onChange={handleChange} /></Form.Group>

                  <Form.Group className="mb-3 border rounded p-3 bg-light">
                      <Form.Label className="fw-bold">Services Provided (Optional)</Form.Label>
                      <div className="d-flex flex-wrap gap-3">
                          {/* === THIS IS THE EDITED SECTION === */}
                          {loadingCategories ? (
                              <div className="d-flex align-items-center text-muted">
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  <span>Loading services...</span>
                              </div>
                          ) : allCategories.length > 0 ? (
                              allCategories.map(category => (
                                  <Form.Check
                                      key={category.id}
                                      type="checkbox"
                                      id={`category-signup-${category.id}`}
                                      label={category.name}
                                      checked={formData.services_offered_ids.includes(category.id)}
                                      onChange={(e) => handleServiceChange(category.id, e.target.checked)}
                                      disabled={loading}
                                  />
                              ))
                          ) : (
                              <p className="text-muted small mb-0">No service categories available yet.</p>
                          )}
                          {/* === END OF EDITED SECTION === */}
                      </div>
                  </Form.Group>
                </>
              )}

              <div className="d-grid mt-4">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? <><Spinner as="span" size="sm" /> Submitting...</> : 'Create Account'}
                </Button>
              </div>
            </Form>
            <div className="text-center mt-3">
                <small className="text-muted">Already have an account? <Link to="/login">Log In</Link></small>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignUpForm;