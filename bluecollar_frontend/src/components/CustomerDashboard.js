// src/components/CustomerDashboard.js (NEW FILE)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axiosConfig';

const CustomerDashboard = () => {
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await apiClient.get('/categories/');
        setCategories(response.data.results || response.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError('Could not load service categories.');
      }
      setLoadingCategories(false);
    };
    fetchCategories();
  }, []);

  // Fetch providers when a category is selected or initially
  useEffect(() => {
    const fetchProviders = async () => {
      if (!selectedCategoryId && categories.length > 0) { // Default to first category or all providers
        // For now, let's not select a category by default unless explicitly done
        // setSelectedCategoryId(categories[0].id);
        // return;
      }

      setLoadingProviders(true);
      setError('');
      let url = '/providers/';
      if (selectedCategoryId) {
        url += `?category=${selectedCategoryId}`;
      }

      try {
        const response = await apiClient.get(url);
        setProviders(response.data.results || response.data);
      } catch (err) {
        console.error("Error fetching providers:", err);
        // This is where your Dashboard.js:56 error was happening
        setError('Could not load service providers.');
        setProviders([]); // Clear providers on error
      }
      setLoadingProviders(false);
    };

    // Fetch providers if categories are loaded or if a category is selected
    // To avoid fetching providers without categories, you might want to trigger this
    // more explicitly, e.g., after categories load or when a user selects one.
    // For now, let's fetch all initially, then filter.
    fetchProviders();
  }, [selectedCategoryId, categories]); // Refetch if selectedCategoryId or categories list changes

  if (loadingCategories) return <p>Loading dashboard...</p>;
  if (error) return <p style={{color: 'red'}}>{error}</p>;

  return (
    <div>
      <h2>Welcome, Customer! Find a Service</h2>
      <Link to="/my-bookings">View My Bookings</Link>
      <hr />

      <h3>Service Categories</h3>
      {categories.length === 0 && <p>No service categories available at the moment.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap' }}>
        {categories.map(category => (
          <li key={category.id} style={{ margin: '5px' }}>
            <button onClick={() => setSelectedCategoryId(category.id)}>
              {category.name}
            </button>
          </li>
        ))}
        {selectedCategoryId && <button onClick={() => {setSelectedCategoryId(null); setProviders([]); /* Optionally refetch all providers */}}>Show All Providers</button>}
      </ul>
      <hr />

      <h3>Service Providers {selectedCategoryId ? `(in ${categories.find(c=>c.id === selectedCategoryId)?.name || ''})` : '(All)'}</h3>
      {loadingProviders && <p>Loading providers...</p>}
      {!loadingProviders && providers.length === 0 && <p>No providers found {selectedCategoryId ? 'for this category' : 'yet'}.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {providers.map(provider => (
          <div key={provider.user.id} style={{ border: '1px solid #eee', padding: '15px', width: '300px', borderRadius: '5px' }}>
            <h4>{provider.business_name || provider.user.username}</h4>
            <p>{provider.bio?.substring(0, 100)}...</p>
            <p>Services: {provider.services_offered?.join(', ') || 'N/A'}</p>
            <Link to={`/providers/${provider.user.id}`}>View Profile & Book</Link>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CustomerDashboard;