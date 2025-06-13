// File: src/api/axiosConfig.js
import axios from 'axios';
// You'll need a way to call logout from your AuthContext if refresh fails.
// This is tricky directly from here. One way is to dispatch a custom event.
// Or, your AuthContext could also attempt refresh periodically or on app load if token is near expiry.

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken'); // Function to get refresh token

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor (should be fine as is)
apiClient.interceptors.request.use(
  (config) => {
    const publicPaths = ['/token/', '/token/refresh/']; // Note: /users/register/ removed as it might sometimes be protected by other means or not exist as an API endpoint
    // If /users/register/ is truly public and shouldn't have a token, keep it.
    // But often, registration doesn't need token exclusion if it's a public POST.
    // The main concern is not sending an *expired* token.

    // Let's adjust to only add token if it exists and path is not for initial token obtain/refresh
    if (!publicPaths.some(path => config.url.endsWith(path))) {
      const token = getAccessToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        // console.log('Interceptor: Token added for URL:', config.url);
      } else {
        // console.log('Interceptor: No token found in localStorage for URL:', config.url);
      }
    } else {
      // console.log('Interceptor: Public path (token/refresh), token not added for URL:', config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === RESPONSE INTERCEPTOR - TOKEN REFRESH LOGIC ===
let isRefreshing = false; // Flag to prevent multiple refresh attempts
let failedQueue = []; // Queue of requests that failed with 401

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
  (response) => { // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  async (error) => { // Any status codes that falls outside the range of 2xx cause this function to trigger
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry request, and not the refresh token request itself
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/token/refresh/') {
      if (isRefreshing) {
        // If already refreshing, add this request to a queue to be retried later
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest); // Retry with new token
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true; // Mark this request as retried
      isRefreshing = true; // Set refreshing flag

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          console.log('Attempting to refresh token...');
          // Use a new axios instance or global axios for refresh request
          // to avoid circular interceptor calls if apiClient itself is used
          const rs = await axios.post('http://127.0.0.1:8000/api/token/refresh/', {
            refresh: refreshToken,
          });

          const { access } = rs.data;
          localStorage.setItem('accessToken', access); // Update stored access token

          // Update the default Authorization header for subsequent apiClient requests
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          // Update the header of the original failed request
          originalRequest.headers['Authorization'] = `Bearer ${access}`;

          processQueue(null, access); // Process queued requests with new token
          isRefreshing = false;
          console.log('Token refreshed successfully. Retrying original request.');
          return apiClient(originalRequest); // Retry the original request with the new token
        } catch (_error) {
          processQueue(_error, null); // Reject queued requests
          isRefreshing = false;
          console.error('Token refresh failed:', _error.response?.data || _error.message);
          // CRITICAL: Dispatch logout action or redirect to login
          // This is where you'd ideally call your AuthContext's logout function.
          // Since we can't directly call context hooks here, we might:
          // 1. Dispatch a custom event that AuthProvider listens to.
          // 2. Redirect directly (less ideal as context state might not update immediately).
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // window.location.href = '/login'; // Forces a full page reload and context reset
          console.log("User should be logged out or redirected to login.");
          return Promise.reject(_error);
        }
      } else {
        console.log("No refresh token available. Cannot refresh.");
        isRefreshing = false; // Reset flag even if no refresh token
        // Dispatch logout or redirect
        localStorage.removeItem('accessToken');
        // window.location.href = '/login';
        return Promise.reject(error); // Reject the original error
      }
    }
    isRefreshing = false; // Ensure flag is reset for non-401 errors or already retried requests
    return Promise.reject(error);
  }
);
// === END OF RESPONSE INTERCEPTOR ===

export default apiClient;