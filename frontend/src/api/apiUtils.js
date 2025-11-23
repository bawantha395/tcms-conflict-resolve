import api from './axiosConfig';

// Generic API functions
export const apiGet = async (endpoint) => {
  try {
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Request failed');
  }
};

export const apiPost = async (endpoint, data) => {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Request failed');
  }
};

export const apiPut = async (endpoint, data) => {
  try {
    const response = await api.put(endpoint, data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Request failed');
  }
};

export const apiDelete = async (endpoint) => {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Request failed');
  }
};

// Helper function to get the appropriate storage
const getStorage = () => {
  const usePersistentStorage = sessionStorage.getItem('usePersistentStorage');
  return usePersistentStorage === 'true' ? localStorage : sessionStorage;
};

// Auth utilities
export const isAuthenticated = () => {
  const token = getAuthToken();
  return token && !isTokenExpired();
};

export const getAuthToken = () => {
  const storage = getStorage();
  return storage.getItem('authToken');
};

export const getRefreshToken = () => {
  const storage = getStorage();
  return storage.getItem('refreshToken');
};

export const getUserData = () => {
  const storage = getStorage();
  const userData = storage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
};

export const logout = async () => {
  const refreshToken = getRefreshToken();
  
  if (refreshToken) {
    try {
      const { logout: logoutApi } = await import('./auth');
      await logoutApi(refreshToken);
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  }
  
  // Clear both storages to be safe
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userData');
  localStorage.removeItem('rememberedUser');
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('tokenExpiry');
  
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('userData');
  sessionStorage.removeItem('usePersistentStorage');
  sessionStorage.removeItem('tokenExpiry');
  
  // Signal logout to other tabs
  localStorage.setItem('logout', 'true');
  
  // Redirect to login
  window.location.href = '/login';
};

// Check if token is expired
export const isTokenExpired = () => {
  const storage = getStorage();
  const token = storage.getItem('authToken');
  if (!token) return true;
  
  // Check if it's a JWT token (contains dots)
  if (token.includes('.')) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  } else {
    // For simple hex tokens (like from teacher backend), check token expiry from storage
    const tokenExpiry = storage.getItem('tokenExpiry');
    if (!tokenExpiry) return true;
    
    try {
      const expiryTime = new Date(tokenExpiry).getTime();
      const currentTime = Date.now();
      return currentTime >= expiryTime;
    } catch (error) {
      return true;
    }
  }
};

// Auto logout if token is expired
export const checkTokenExpiry = () => {
  if (isTokenExpired()) {
    logout();
  }
};

// Error handling utilities
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    return error.response.data?.message || defaultMessage;
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || defaultMessage;
  }
}; 