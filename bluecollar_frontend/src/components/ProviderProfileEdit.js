// File: src/components/ProviderProfileEdit.js
import React, { useState, useEffect } from 'react';
import apiClient from '../api/axiosConfig';
import { Form, Button, Card, Row, Col, Alert, Spinner, Image } from 'react-bootstrap';

const ProviderProfileEdit = () => {
    const [profileData, setProfileData] = useState({
        business_name: '',
        bio: '',
        phone_number: '',
    });
    const [selectedServices, setSelectedServices] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [profileResponse, categoriesResponse] = await Promise.all([
                    apiClient.get('/providers/me/'),
                    apiClient.get('/categories/')
                ]);
                
                const profile = profileResponse.data;
                const categories = categoriesResponse.data.results || categoriesResponse.data;

                setProfileData({
                    business_name: profile.business_name || '',
                    bio: profile.bio || '',
                    phone_number: profile.phone_number || '',
                });
                
                setSelectedServices(profile.services_offered.map(service => service.id));
                setAllCategories(categories);
                setProfilePicturePreview(profile.profile_picture); // Set existing picture URL

            } catch (err) {
                console.error("Error fetching initial data for profile edit:", err);
                setError("Could not load your profile data. Please try again.");
            }
            setLoading(false);
        };
        fetchInitialData();
    }, []);

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleServiceChange = (categoryId) => {
        setSelectedServices(prevSelected =>
            prevSelected.includes(categoryId)
                ? prevSelected.filter(id => id !== categoryId)
                : [...prevSelected, categoryId]
        );
    };

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePictureFile(file);
            setProfilePicturePreview(URL.createObjectURL(file)); // Show a preview of the new image
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        
        // When sending files, we must use FormData
        const formData = new FormData();
        formData.append('business_name', profileData.business_name);
        formData.append('phone_number', profileData.phone_number);
        formData.append('bio', profileData.bio);
        
        selectedServices.forEach(id => {
            formData.append('services_offered_ids', id);
        });

        // Only append the picture if a new one was selected
        if (profilePictureFile) {
            formData.append('profile_picture', profilePictureFile);
        }

        try {
            await apiClient.patch('/providers/me/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setSuccess("Profile updated successfully!");
            if (profilePictureFile) setProfilePictureFile(null); // Clear file input state after successful upload
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error("Error updating profile:", err.response?.data);
            setError("Failed to update profile. Please check your entries.");
        }
        setSaving(false);
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;

    return (
        <Row className="justify-content-center">
            <Col md={8} lg={6}>
                <Card className="p-4 shadow">
                    <Card.Body>
                        <h2 className="text-center mb-4 fw-bold">Edit Your Provider Profile</h2>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3 text-center">
                                <Form.Label as="h5">Profile Picture</Form.Label>
                                {profilePicturePreview ? (
                                    <Image src={profilePicturePreview} roundedCircle thumbnail style={{width: '150px', height: '150px', objectFit: 'cover'}} className="mb-2 d-block mx-auto" />
                                ) : (
                                    <div className="mb-2 text-muted">(No photo)</div>
                                )}
                                <Form.Control
                                    type="file"
                                    name="profile_picture"
                                    onChange={handlePictureChange}
                                    accept="image/png, image/jpeg"
                                    disabled={saving}
                                />
                            </Form.Group>
                            <hr/>
                            <Form.Group className="mb-3" controlId="formBusinessName">
                                <Form.Label>Business Name</Form.Label>
                                <Form.Control type="text" name="business_name" value={profileData.business_name} onChange={handleChange} disabled={saving} />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="formPhoneNumber">
                                <Form.Label>Contact Phone Number</Form.Label>
                                <Form.Control type="tel" name="phone_number" value={profileData.phone_number} onChange={handleChange} disabled={saving} />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="formBio">
                                <Form.Label>About / Bio</Form.Label>
                                <Form.Control as="textarea" rows={5} name="bio" value={profileData.bio} onChange={handleChange} disabled={saving} />
                            </Form.Group>
                            <hr />
                            <Form.Group className="mb-3">
                                <Form.Label as="h5">Your Services</Form.Label>
                                <p className="text-muted small">Select all categories that apply to your business.</p>
                                <div className="d-flex flex-wrap gap-3">
                                {allCategories.length > 0 ? (
                                    allCategories.map(category => (
                                        <Form.Check key={category.id} type="checkbox" id={`category-${category.id}`}
                                            label={category.name}
                                            checked={selectedServices.includes(category.id)}
                                            onChange={() => handleServiceChange(category.id)}
                                            disabled={saving} />
                                    ))
                                ) : (
                                    <p>No service categories found.</p>
                                )}
                                </div>
                            </Form.Group>
                            <div className="d-grid mt-4">
                                <Button variant="primary" type="submit" disabled={saving}>
                                    {saving ? <><Spinner as="span" size="sm" /> Saving Changes...</> : 'Save Changes'}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default ProviderProfileEdit;