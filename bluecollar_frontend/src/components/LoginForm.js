// File: src/components/LoginForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';
import { Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';

const LoginForm = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/token/', {
        username: formData.username,
        password: formData.password,
      });
      login(response.data.access, response.data.refresh);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMsg);
      console.error('Login error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="justify-content-center mt-5">
      <Col md={6} lg={4}>
        <Card className="p-4 shadow">
          <Card.Body>
            <h2 className="text-center mb-4 fw-bold">Login</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formUsername">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Form.Group>
              
              <div className="d-grid mt-4">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Logging in...' : 'Sign In'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default LoginForm;