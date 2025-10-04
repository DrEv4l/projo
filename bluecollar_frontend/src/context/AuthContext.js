// File: src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'));
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const navigate = useNavigate(); // Initialize useNavigate hook

  // This useCallback for logout is important to give it a stable identity
  // for other hooks (like the event listener) to use as a dependency.
  const logout = useCallback(() => {
    console.log("AuthContext: Logging out user.");
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    // We don't navigate here directly, as the component triggering logout
    // or the event listener will handle navigation.
  }, []);

  // This useEffect runs only once on initial app load to check for existing tokens.
  useEffect(() => {
    setLoadingAuth(true);
    const storedAccessToken = localStorage.getItem('accessToken');
    if (storedAccessToken) {
      try {
        const decodedUser = jwtDecode(storedAccessToken);
        const currentTime = Date.now() / 1000;
        if (decodedUser.exp < currentTime) {
          console.log("AuthContext: Token expired on initial load.");
          logout(); // Call logout to clear state
        } else {
          setUser(decodedUser);
          console.log("AuthContext: User session restored from token:", decodedUser);
        }
      } catch (error) {
        console.error("AuthContext: Invalid token on initial load:", error);
        logout(); // Clear invalid token
      }
    }
    setLoadingAuth(false);
  }, [logout]); // logout is a dependency

  // This useEffect listens for the custom logout event from the axios interceptor.
  useEffect(() => {
    const handleLogoutEvent = () => {
      console.log("AuthContext: Received 'logout-event' from interceptor.");
      logout();
      // Force navigation to login on critical auth failure (e.g., refresh token fails).
      navigate('/login', { replace: true });
    };
    
    window.addEventListener('logout-event', handleLogoutEvent);

    // Cleanup: remove the event listener when the AuthProvider unmounts.
    return () => {
      window.removeEventListener('logout-event', handleLogoutEvent);
    };
  }, [logout, navigate]); // Dependencies for this effect

  const login = useCallback((access, refresh) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
    try {
      const decodedUser = jwtDecode(access);
      setUser(decodedUser);
      console.log("AuthContext: User logged in:", decodedUser);
    } catch (error) {
      console.error("AuthContext: Error decoding token on login:", error);
      setUser(null);
    }
  }, []);

  const refreshAuthToken = useCallback(async () => {
    // This function can be called by interceptors if needed, but our interceptor is self-sufficient.
    // It can also be called proactively by other parts of the app if desired.
    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) {
        console.log("AuthContext: No refresh token available to refresh.");
        logout();
        return null;
    }
    try {
      console.log("AuthContext: Attempting token refresh.");
      const response = await axios.post(`${API_URL}/api/token/refresh/`, {
        refresh: currentRefreshToken
      });
      login(response.data.access, currentRefreshToken);
      console.log("AuthContext: Token refreshed successfully.");
      return response.data.access;
    } catch (error) {
      console.error("AuthContext: Proactive token refresh failed:", error.response?.data || error.message);
      logout();
      return null;
    }
  }, [login, logout]);

  // Memoize the context value to prevent unnecessary re-renders in consumer components.
  const contextValue = useMemo(() => ({
    accessToken,
    refreshToken,
    user,
    loadingAuth,
    login,
    logout,
    refreshAuthToken
  }), [accessToken, refreshToken, user, loadingAuth, login, logout, refreshAuthToken]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};