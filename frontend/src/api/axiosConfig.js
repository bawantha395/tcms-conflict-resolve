import axios from 'axios';

// Helper function to get the appropriate storage
const getStorage = () => {
  const usePersistentStorage = sessionStorage.getItem('usePersistentStorage');
  return usePersistentStorage === 'true' ? localStorage : sessionStorage;
};

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8081',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from appropriate storage
    const storage = getStorage();
    const token = storage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const storage = getStorage();
        const refreshToken = storage.getItem('refreshToken');
        
        if (refreshToken) {
          const { refreshToken: refreshTokenApi } = await import('./auth');
          const response = await refreshTokenApi(refreshToken);
          
          if (response.success) {
            // Store new access token in appropriate storage
            storage.setItem('authToken', response.accessToken);
            storage.setItem('tokenExpiry', new Date(Date.now() + 15 * 60 * 1000).toISOString());
            
            // Update the original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${response.accessToken}`;
            
            // Retry the original request
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // If refresh fails, logout
      const storage = getStorage();
      storage.removeItem('authToken');
      storage.removeItem('refreshToken');
      storage.removeItem('userData');
      storage.removeItem('tokenExpiry');
      
      // Also clear localStorage items
      localStorage.removeItem('rememberedUser');
      localStorage.removeItem('rememberMe');
      
      window.location.href = '/login';
    }
    
    // Handle other errors
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api; 