import axios from 'axios';

const BACKEND_PROD_URL = 'https://poultry-farm-billing.onrender.com/api';

function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return BACKEND_PROD_URL;
  }
  return (envUrl || '/api').replace(/\/+$/, '');
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized and Blob errors
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle Blob error response when responseType is 'blob'
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const json = JSON.parse(text);
        return Promise.reject(new Error(json.message || 'Server error generating response'));
      } catch (e) {
        // Not JSON, continue to fallback
      }
    }

    return Promise.reject(
      new Error(error.response?.data?.message || error.message || 'An unexpected error occurred')
    );
  }
);

export default api;
