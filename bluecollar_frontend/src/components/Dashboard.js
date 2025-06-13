// src/components/Dashboard.js (or rename to DashboardPage.js and move to a 'pages' folder if you refactor later)
import React from 'react';
import { useAuth } from '../context/AuthContext';
import CustomerDashboard from './CustomerDashboard'; // You'll create this
import ProviderDashboard from './ProviderDashboard'; // You'll create this
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, accessToken } = useAuth();

  // This check should ideally be handled by ProtectedRoute, but good for belt-and-suspenders
  if (!accessToken || !user) {
    // User not loaded yet or not authenticated
    // ProtectedRoute should handle redirection, but you can also do it here
    // Or show a loading indicator if user is null but token exists (meaning user state is still loading)
    return <Navigate to="/login" />;
  }

  if (user.is_provider) {
    return <ProviderDashboard />;
  } else {
    return <CustomerDashboard />;
  }
};

export default Dashboard;