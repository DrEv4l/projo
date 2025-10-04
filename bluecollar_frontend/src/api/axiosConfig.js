// File: src/api/axiosConfig.js
import axios from 'axios';

// Get the base API URL from environment variables, with a fallback for local development
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

// Helper functions to get tokens from localStorage
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor ---
// This runs BEFORE each request is sent.
apiClient.interceptors.request.use(
  (config) => {
    // List of public URLs that don't need an auth token.
    const publicPaths = ['/token/', '/token/refresh/', '/users/register/', '/users/register/provider/'];

    // Check if the request URL is one of the public paths.
    // config.url will be relative to the baseURL (e.g., '/token/').
    if (!publicPaths.includes(config.url)) {
      const token = getAccessToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor ---
// This runs AFTER a response is received, and is mainly for handling token refresh.

// A flag to prevent multiple token refresh requests from firing at the same time.
let isRefreshing = false;
// A queue to hold requests that failed due to an expired token, to be retried later.
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response.
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check for the specific condition: a 401 Unauthorized error,
    // which is not for the refresh token endpoint itself, and not a request that has already been retried.
    if (error.response?.status === 401 && originalRequest.url !== '/token/refresh/' && !originalRequest._retry) {
      if (isRefreshing) {
        // If a refresh is already in progress, add this failed request to the queue.
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest); // Retry the request with the new token
        });
      }

      originalRequest._retry = true; // Mark this request so we don't try to refresh it again.
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          console.log('Interceptor: Access token expired. Attempting to refresh...');
          // Use a new, clean axios instance for the refresh request to avoid circular interceptor logic.
          const rs = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access: newAccessToken } = rs.data;
          
          // IMPORTANT: Update localStorage first.
          localStorage.setItem('accessToken', newAccessToken);

          // Update the default header for all future apiClient requests
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          // Update the header of the original failed request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Process any queued requests with the new token
          processQueue(null, newAccessToken);
          
          console.log('Interceptor: Token refreshed successfully. Retrying original request.');
          return apiClient(originalRequest); // Retry the original request

        } catch (_error) {
          console.error('Interceptor: Token refresh failed.', _error.response?.data || _error.message);
          // If refresh fails, reject all queued requests and log the user out.
          processQueue(_error, null);

          // --- LOGOUT LOGIC ---
          // This part is crucial for security.
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          
          // Dispatch a custom event that the AuthProvider can listen for to update its state.
          // This is a clean way to communicate from a non-React file to your React context.
          window.dispatchEvent(new CustomEvent('logout-event'));
          // --------------------

          return Promise.reject(_error);
        } finally {
          isRefreshing = false;
        }
      } else {
        console.log("Interceptor: No refresh token available. User needs to log in again.");
        isRefreshing = false;
        // If there's no refresh token, there's nothing we can do. The user is logged out.
        window.dispatchEvent(new CustomEvent('logout-event'));
      }
    }

    // For any other errors, just pass them along.
    return Promise.reject(error);
  }
);

export default apiClient;