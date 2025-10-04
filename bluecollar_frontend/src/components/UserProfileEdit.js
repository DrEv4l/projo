// File: src/components/UserProfileEdit.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const UserProfileEdit = () => {
    const { user: authUser } = useAuth(); // Get user from context to pre-fill info
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                // Fetch the user's own profile data
                const response = await apiClient.get('/users/me/profile/');
                setFormData({
                    first_name: response.data.first_name || '',
                    last_name: response.data.last_name || '',
                });
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setError("Could not load your profile.");
            }
            setLoading(false);
        };
        // Ensure user is loaded in context before fetching
        if (authUser) {
            fetchProfile();
        }
    }, [authUser]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            // Send a PATCH request with the updated data
            await apiClient.patch('/users/me/profile/', formData);
            setSuccess("Profile updated successfully!");
            // Note: The JWT token won't reflect the name change until a new token is issued.
            // This is usually fine, as the UI can rely on its own state.
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error("Error updating profile:", err.response?.data);
            setError("Failed to update profile.");
        }
        setSaving(false);
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

    return (
        <Row className="justify-content-center">
            <Col md={8} lg={6}>
                <Card className="p-4 shadow">
                    <Card.Body>
                        <h2 className="text-center mb-4 fw-bold">Edit Your Profile</h2>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formFirstName">
                                <Form.Label>First Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="formLastName">
                                <Form.Label>Last Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <div className="d-grid mt-4">
                                <Button variant="primary" type="submit" disabled={saving}>
                                    {saving ? <><Spinner as="span" size="sm" /> Saving...</> : 'Save Changes'}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default UserProfileEdit;