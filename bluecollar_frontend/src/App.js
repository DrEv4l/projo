// src/App.js
import React from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SignUpForm from './components/SignUpForm';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import ProviderProfile from './components/ProviderProfile';
import ProtectedRoute from './components/ProtectedRoute'; // Your v6 ProtectedRoute using <Outlet />
import { useAuth } from './context/AuthContext';
import BookingForm from './components/BookingForm';
import MyBookings from './components/MyBookings';
import ChatWindow from './components/ChatWindow';
import './App.css';

// Placeholder for a "Not Found" component
const NotFound = () => (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>404 - Page Not Found</h2>
        <Link to="/">Go Home</Link>
    </div>
);

// Wrapper component for the chat route to extract params and pass to ChatWindow
// Also, ensure currentUserId is passed if ChatWindow needs it
const ChatPage = () => {
    const { roomNameParam } = useParams();
    const { user } = useAuth(); // Get current user to potentially pass their ID

    // It's good practice to ensure user context is loaded if ChatWindow depends on it
    // For simplicity, assuming user object is available or ChatWindow handles null user.id
    const currentUserId = user ? (user.id || user.user_id) : null; // Adjust 'user.id' based on your user object structure

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
    <div className="App">
      {/* Consider replacing this default header with your own application header/navbar component */}

      <nav style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px', textAlign: 'center' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Home</Link>
        {accessToken ? (
          <>
            <Link to="/dashboard" style={{ marginRight: '15px' }}>Dashboard</Link>
            <Link to="/my-bookings" style={{ marginRight: '15px' }}>My Bookings</Link>
            {/* Example: A general chat link, if you have one. Could be dynamic based on context. */}
            {/* <Link to="/chat/general" style={{ marginRight: '15px' }}>General Chat</Link> */}
            {user && <span style={{ marginRight: '15px' }}>Welcome, {user.username}!</span>}
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/signup" style={{ marginRight: '15px' }}>Sign Up</Link>
            <Link to="/login" style={{ marginRight: '15px' }}>Login</Link>
          </>
        )}
      </nav>
      <hr />

      <div className="content" style={{ padding: '20px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/login" element={<LoginForm />} />

          {/* Protected Routes: All routes nested under ProtectedRoute will require authentication */}
          <Route element={<ProtectedRoute />}> {/* This is the layout route for protected content */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/providers/:providerUserId" element={<ProviderProfile />} />
            <Route path="/book-service" element={<BookingForm />} /> {/* This might need provider info passed via state/params from where it's navigated */}
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/chat/:roomNameParam" element={<ChatPage />} />
            {/* Add other protected routes here, e.g., a BookingDetailsPage */}
            {/* <Route path="/bookings/:bookingId" element={<BookingDetailsPage />} /> */}
          </Route>

          {/* Catch-all Not Found Route - should be the last route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
