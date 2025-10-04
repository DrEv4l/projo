// File: src/components/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { FaWrench, FaBolt, FaPaintBrush, FaBroom, FaSearch, FaUserPlus, FaSignInAlt, FaBook, FaStar } from 'react-icons/fa';

// Import a background image for the hero section.
// Find a suitable free-to-use image from a site like Unsplash or Pexels,
// and place it in a new 'src/assets/' folder.
import heroBg from '../assets/hero-background.jpg'; 

const LandingPage = () => {
    const featuredServices = [
        { name: 'Plumbing', description: 'Leaky faucets, clogged drains, and more.', icon: <FaWrench size={40} className="text-primary"/> },
        { name: 'Electrical', description: 'Wiring, fixture installation, and safety checks.', icon: <FaBolt size={40} className="text-primary"/> },
        { name: 'Painting', description: 'Interior and exterior painting services.', icon: <FaPaintBrush size={40} className="text-primary"/> },
        { name: 'Cleaning', description: 'Residential and commercial cleaning.', icon: <FaBroom size={40} className="text-primary"/> },
    ];

    const heroStyle = {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    return (
        <Container fluid className="p-0">
            {/* Hero Section */}
            <Row className="justify-content-center text-center text-white m-0" style={heroStyle}>
                <Col md={8} className="py-5 px-4" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h1 className="display-3 fw-bold">Find Skilled Local Pros, Fast.</h1>
                    <p className="lead my-4">
                        Your one-stop platform to connect with reliable blue-collar service providers for all your home and business needs.
                    </p>
                    <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                        <Button as={Link} to="/signup" variant="primary" size="lg" className="px-4 gap-3">
                            <FaUserPlus className="me-2" />Get Started
                        </Button>
                        <Button as={Link} to="/login" variant="outline-light" size="lg" className="px-4">
                            <FaSignInAlt className="me-2" />Login
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Featured Services Section */}
            <Container className="py-5">
                <Row className="text-center mb-5">
                    <Col><h2 className="fw-bold">Services We Offer</h2></Col>
                </Row>
                <Row xs={1} md={2} lg={4} className="g-4">
                    {featuredServices.map(service => (
                        <Col key={service.name}>
                            <Card className="h-100 shadow-sm text-center border-0 custom-card-hover">
                                <Card.Body className="p-4">
                                    <div className="mb-3">{service.icon}</div>
                                    <Card.Title as="h3">{service.name}</Card.Title>
                                    <Card.Text className="text-muted">{service.description}</Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Container>

            {/* How It Works Section */}
            <Container fluid className="bg-white py-5">
                <Container>
                    <Row className="text-center mb-5">
                        <Col><h2 className="fw-bold">How It Works</h2></Col>
                    </Row>
                    <Row className="text-center">
                        <Col md={4} className="mb-4">
                            <FaSearch size={50} className="text-primary mb-3"/>
                            <h4>1. Search</h4>
                            <p className="text-muted px-3">Browse categories or search for the specific service you need. View profiles and read reviews from other customers.</p>
                        </Col>
                        <Col md={4} className="mb-4">
                            <FaBook size={50} className="text-primary mb-3"/>
                            <h4>2. Book</h4>
                            <p className="text-muted px-3">Select a provider, choose a time, and submit your booking request directly through the platform.</p>
                        </Col>
                        <Col md={4} className="mb-4">
                            <FaStar size={50} className="text-primary mb-3"/>
                            <h4>3. Rate</h4>
                            <p className="text-muted px-3">After the job is done, rate your provider to help build a trustworthy and reliable community.</p>
                        </Col>
                    </Row>
                </Container>
            </Container>
        </Container>
    );
};

export default LandingPage;