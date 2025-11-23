import React, { useState } from 'react';
import { logout } from '../api/apiUtils';
import BasicAlertBox from './BasicAlertBox';

const LogoutButton = ({ className = "" }) => {
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const handleLogout = async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Logout failed:', error);
        // Fallback: force logout even if API call fails
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
      }
  };

  const openLogoutAlert = () => {
    setShowLogoutAlert(true);
  };

  return (
    <>
    <button
        onClick={openLogoutAlert}
      className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ${className}`}
    >
        Logout
    </button>

      <BasicAlertBox
        open={showLogoutAlert}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to login again to access your account."
        type="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutAlert(false)}
        confirmText="Logout"
        cancelText="Cancel"
      />
    </>
  );
};

export default LogoutButton; 