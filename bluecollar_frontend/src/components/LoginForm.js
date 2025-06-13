// src/components/LoginForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import apiClient from '../api/axiosConfig';

// Adjust this URL based on your Django settings and CORS configuration
const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '', // Or email, depending on your backend login config
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth(); // Get the login function from context

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    try {
      const response = await apiClient.post('/token/', {
        username: formData.username, // Django SimpleJWT default expects 'username'
        password: formData.password,
      });
      console.log('Login successful:', response.data);
      

      // Store tokens in localStorage (or sessionStorage)
      // For more robust state management, consider Context API or Redux/Zustand later
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);

      // Use the login function from context
      login(response.data.access, response.data.refresh);

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (err) {
      if (err.response && err.response.data) {
        console.error('Login error:', err.response.data);
        // SimpleJWT often returns a 'detail' field for auth errors
        setError(err.response.data.detail || 'Login failed. Please check your credentials.');
      } else {
        console.error('An unexpected error occurred:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          {/* If your backend supports login with email, you might change the type to 'email' and name to 'email'
              and adjust the payload in axios.post accordingly if your DRF settings for SimpleJWT use email field.
              By default, TokenObtainPairSerializer uses 'username'. */}
          <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginForm;
