import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserData } from '../api/apiUtils';

const PublicRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const user = getUserData();
      
      setIsAuth(authenticated);
      setUserRole(user?.role || null);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3da58a]"></div>
      </div>
    );
  }

  // If authenticated, redirect to appropriate dashboard
  if (isAuth) {
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admindashboard" replace />;
      case 'teacher':
        return <Navigate to="/teacherdashboard" replace />;
      case 'student':
        return <Navigate to="/studentdashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default PublicRoute; 