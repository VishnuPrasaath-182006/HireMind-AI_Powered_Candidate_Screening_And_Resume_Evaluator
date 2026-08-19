import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes timeout for large batch operations
});

// Automatically attach Bearer JWT Token to all API calls
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure FormData requests never have a conflicting Content-Type header
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      }
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const reqUrl = error.config?.url || '';
      if (!reqUrl.includes('/api/auth/signin') && !reqUrl.includes('/api/auth/signup')) {
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth') {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('user_profile');
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
