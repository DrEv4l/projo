// src/components/SignUpForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000'; // Your Django backend URL

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '', // For password confirmation
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    setSuccessMessage('');

    try {
      // The registration endpoint expects these fields
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
      };
      const response = await axios.post(`${API_URL}/api/users/register/`, payload);
      console.log('Sign up successful:', response.data);
      setSuccessMessage('Registration successful! Please proceed to login.');
      // Optionally, clear the form
      setFormData({
        username: '', email: '', password: '', password2: '', first_name: '', last_name: '',
      });
      // Redirect to login page after a short delay or on user action
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Redirect after 2 seconds

    } catch (error) {
      if (error.response && error.response.data) {
        console.error('Sign up error:', error.response.data);
        // DRF typically returns errors as an object where keys are field names
        setErrors(error.response.data);
      } else {
        console.error('An unexpected error occurred:', error);
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {errors.general && <p style={{ color: 'red' }}>{errors.general}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
          {errors.username && <p style={{ color: 'red' }}>{errors.username.join(', ')}</p>}
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          {errors.email && <p style={{ color: 'red' }}>{errors.email.join(', ')}</p>}
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
          {errors.password && <p style={{ color: 'red' }}>{errors.password.join(', ')}</p>}
        </div>
        <div>
          <label htmlFor="password2">Confirm Password:</label>
          <input type="password" id="password2" name="password2" value={formData.password2} onChange={handleChange} required />
          {errors.password2 && <p style={{ color: 'red' }}>{errors.password2.join(', ')}</p>}
        </div>
        <div>
          <label htmlFor="first_name">First Name (Optional):</label>
          <input type="text" id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} />
          {errors.first_name && <p style={{ color: 'red' }}>{errors.first_name.join(', ')}</p>}
        </div>
        <div>
          <label htmlFor="last_name">Last Name (Optional):</label>
          <input type="text" id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} />
          {errors.last_name && <p style={{ color: 'red' }}>{errors.last_name.join(', ')}</p>}
        </div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default SignUpForm;