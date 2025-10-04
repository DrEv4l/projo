// File: src/components/Dashboard.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import CustomerDashboard from './CustomerDashboard';
import ProviderDashboard from './ProviderDashboard';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  // Get user info, auth token, and the auth loading status from the context
  const { user, accessToken, loadingAuth } = useAuth();

  // 1. If the context is still performing its initial check for a token,
  //    show a loading state to prevent flashing the wrong content.
  if (loadingAuth) {
    return <p>Loading dashboard...</p>;
  }

  // 2. If auth is loaded and there's no token/user, redirect to login.
  //    (This is a backup for your ProtectedRoute).
  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  // 3. If the user is loaded, check their role and render the correct dashboard.
  if (user.is_provider) {
    return <ProviderDashboard />;
  } else {
    return <CustomerDashboard />;
  }
};

export default Dashboard;