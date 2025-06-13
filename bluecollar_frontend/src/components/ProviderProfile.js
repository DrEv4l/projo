// src/components/ProviderProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Add useNavigate
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axiosConfig';

const ProviderProfile = () => {
  const { providerUserId } = useParams(); // Get providerUserId from URL params
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Initialize navigate
  const { user: currentUser } = useAuth(); 

  useEffect(() => {
    const fetchProviderProfile = async () => {
      setLoading(true);
      setError('');
      try {
        // The backend API uses user_id as the lookup for provider profiles
        const response = await apiClient.get(`/providers/${providerUserId}/`);
        setProvider(response.data);
      } catch (err) {
        console.error("Error fetching provider profile:", err);
        if (err.response && err.response.status === 404) {
            setError('Service provider not found.');
        } else {
            setError('Failed to load provider profile. Please ensure the backend is returning review data.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (providerUserId) {
      fetchProviderProfile();
    }
  }, [providerUserId]); // Re-fetch if providerUserId changes
  
  const handleBookServiceClick = () => {
    if (provider) {
      navigate(`/book-service`, { // Or a more specific path like /providers/${providerUserId}/book
        state: {
          providerInfo: {
            id: provider.user.id, // This is the ServiceProviderProfile PK
            name: provider.business_name || provider.user.username,
          }
        }
      });
    }
  };

  const handleChatWithProviderClick = () => {
    if (!currentUser) {
      alert("Please log in to chat with the provider.");
      navigate('/login');
      return;
    }
    if (provider && provider.user && currentUser.user_id) { // Ensure provider.user and currentUser.user_id exist
      // provider.user.id is the provider's user ID
      // currentUser.user_id is the logged-in customer's user ID (from JWT payload)
      const userId1 = parseInt(currentUser.user_id, 10);
      const userId2 = parseInt(provider.user.id, 10);

      // Create a consistent room name by ordering IDs
      const roomName = userId1 < userId2 ? `chat_user${userId1}_user${userId2}` : `chat_user${userId2}_user${userId1}`;

      // Navigate to the chat page, passing roomName and potentially other info
      navigate(`/chat/${roomName}`, {
        state: {
          chatWithUsername: provider.user.username || provider.business_name,
          // You might also pass providerUserId and currentUserId if ChatWindow needs them explicitly
          // and can't derive them from roomName or AuthContext alone.
        }
      });
    } else {
      alert("Provider information or your user information is incomplete.");
    }
  };

  

  if (loading) {
    return <p>Loading provider profile...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!provider) {
    return <p>No provider data available.</p>; // Should be caught by error state generally
  }



  return (
    <div>
      <h2>{provider.business_name || provider.user.username}</h2>
      {/* provider.user.profile_picture_url ? <img src={provider.user.profile_picture_url} alt="Profile" /> : <p>No profile picture</p> */}
      <p><strong>Contact:</strong> {provider.phone_number || 'Not provided'}</p>
      <p><strong>Email:</strong> {provider.user.email}</p>
      {/* <p><strong>Years of Experience:</strong> {provider.years_of_experience || 'N/A'}</p> */}
      
      <h3>About</h3>
      <p>{provider.bio || 'No biography provided.'}</p>

      <h3>Services Offered</h3>
      {provider.services_offered && provider.services_offered.length > 0 ? (
        <ul>
          {provider.services_offered.map(service => (
            <li key={service.id}>{service.name}</li>
          ))}
        </ul>
      ) : (
        <p>No specific services listed.</p>
      )}
      
      {/* <h3>Reviews</h3> */}
      {/* Placeholder for reviews list - will be implemented later */}
      {/* <p>Average Rating: {provider.average_rating || 'Not rated yet'}</p> */}
      {/* <p>Reviews will be displayed here.</p> */}

      <hr />
      {/* Placeholder buttons */}
      <div style={{ marginTop: '20px' }}>
        <button onClick={handleBookServiceClick} style={{ marginRight: '10px' }}>Book Service</button>
        <button onClick={handleChatWithProviderClick}>Chat with Provider</button>
      </div>
      <br/>
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
};

export default ProviderProfile;