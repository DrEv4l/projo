// File: src/App.js
import React from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
// --- React-Bootstrap Imports ---
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import NavDropdown from 'react-bootstrap/NavDropdown'; // IMPORT NavDropdown

// --- Your Component Imports ---
import LandingPage from './components/LandingPage';
import SignUpForm from './components/SignUpForm';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import ProviderProfile from './components/ProviderProfile';
import ProviderProfileEdit from './components/ProviderProfileEdit';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import BookingForm from './components/BookingForm';
import MyBookings from './components/MyBookings';
import BookingDetails from './components/BookingDetails';
import ChatWindow from './components/ChatWindow';
import UserProfileEdit from './components/UserProfileEdit';

// Placeholder for a "Not Found" component
const NotFound = () => (
    <div className="text-center mt-5">
        <h2>404 - Page Not Found</h2>
        <Link to="/">Go Home</Link>
    </div>
);

// Wrapper component for the chat route
const ChatPage = () => {
    const { roomNameParam } = useParams();
    const { user } = useAuth();
    const currentUserId = user ? (user.user_id || user.id) : null;
    return <ChatWindow roomName={roomNameParam} currentUserId={currentUserId} />;
};

function App() {
  const { accessToken, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-light min-vh-100">
      <Navbar bg="white" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold text-primary">
            BlueCollarPro
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto align-items-center">
              {accessToken ? (
                <>
                  <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
                  <Nav.Link as={Link} to="/my-bookings">My Bookings</Nav.Link>
                  
                  {/* === UPDATED PROFILE LINK TO BE A DROPDOWN === */}
                  <NavDropdown title={<span>Welcome, {user?.username}!</span>} id="profile-nav-dropdown" className="ms-3">
                    {/* Link for ALL users to edit basic info */}
                    <NavDropdown.Item as={Link} to="/profile/user/edit">
                      Edit My Info
                    </NavDropdown.Item>
                    
                    {/* Conditional link ONLY for providers */}
                    {user?.is_provider && (
                      <NavDropdown.Item as={Link} to="/profile/provider/edit">
                        Edit Provider Profile
                      </NavDropdown.Item>
                    )}

                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={handleLogout} className="text-danger">
                      Logout
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login">Login</Nav.Link>
                  <Button as={Link} to="/signup" variant="primary" size="sm">
                    Sign Up
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container as="main" className="py-4">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/login" element={<LoginForm />} />

          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/providers/:providerUserId" element={<ProviderProfile />} />
            <Route path="/book-service" element={<BookingForm />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/bookings/:bookingId" element={<BookingDetails />} />
            <Route path="/chat/:roomNameParam" element={<ChatPage />} />
            
            {/* === CORRECTED AND CLARIFIED ROUTES FOR EDITING PROFILES === */}
            <Route path="/profile/user/edit" element={<UserProfileEdit />} />
            <Route path="/profile/provider/edit" element={<ProviderProfileEdit />} />
          </Route>

          {/* Catch-all Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;