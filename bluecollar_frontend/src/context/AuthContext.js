// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode'; // Install: npm install jwt-decode
import axios from 'axios'; // Make sure axios is installed and imported

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [user, setUser] = useState(null); // To store decoded user info from token

  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken) {
      try {
        const decodedUser = jwtDecode(storedAccessToken); // Decode the token
        // Check if token is expired (optional but good practice)
        const currentTime = Date.now() / 1000;
        if (decodedUser.exp < currentTime) {
          console.log("Access token expired");
          logout(); // Or attempt refresh
        } else {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setUser(decodedUser); // Set user from token
        }
      } catch (error) {
        console.error("Invalid token:", error);
        logout(); // Clear invalid token
      }
    }
  }, []); // Runs once on component mount

  const login = (access, refresh) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
    try {
      const decodedUser = jwtDecode(access);
      setUser(decodedUser);
    } catch (error) {
      console.error("Error decoding token on login:", error);
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    // Optionally, redirect to login page or homepage
    // window.location.href = '/login'; // Simple redirect, consider useNavigate for better SPA behavior
  };

  // Uncomment and implement the token refresh logic
  const refreshAuthToken = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/token/refresh/`, {
        refresh: refreshToken
      });
      login(response.data.access, refreshToken);
      return response.data.access;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ accessToken, refreshToken, user, login, logout, refreshAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
