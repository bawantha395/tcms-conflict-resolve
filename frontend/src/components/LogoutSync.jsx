import React, { useEffect } from 'react';

const LogoutSync = () => {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'logout' && e.newValue === 'true') {
        // Clear all auth data from both storages
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
        
        // Redirect to login
        window.location.href = '/login';
      }
    };

    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default LogoutSync; 