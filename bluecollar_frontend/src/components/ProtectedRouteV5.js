// File: src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { accessToken, loadingAuth } = useAuth(); // Get auth token and loading status

  // Show a loading indicator while the auth state is being determined
  if (loadingAuth) {
    return <div>Loading session...</div>;
  }

  // If auth is loaded and there is no token, redirect to the login page
  if (!accessToken) {
    // You can pass the original location in state to redirect back after login
    // but for simplicity, we'll just redirect to /login.
    return <Navigate to="/login" replace />;
  }

  // If a token exists, render the child route's element via the <Outlet>
  return <Outlet />;
};

export default ProtectedRoute;