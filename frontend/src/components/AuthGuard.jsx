import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUserData, checkTokenExpiry } from '../api/apiUtils';
import teacherSidebarSections from '../pages/dashboard/teacherDashboard/TeacherDashboardSidebar';

const AuthGuard = ({ children, requiredRole = null }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      // Check if token is expired
      checkTokenExpiry();
      
      const authenticated = isAuthenticated();
      const user = getUserData();
      
      setIsAuth(authenticated);
      setUserRole(user?.role || null);
      setIsLoading(false);
    };

    checkAuth();
  }, [location.pathname]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3da58a]"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and user doesn't have it, redirect to appropriate dashboard
  if (requiredRole && userRole !== requiredRole) {
    // Allow teacher_staff to access routes that require 'teacher'
    if (requiredRole === 'teacher' && userRole === 'teacher_staff') {
      // treat as authorized — fall through to render children
    } else {
      // If teacher_staff, choose landing based on the sidebar requiredPermission
      const user = getUserData();
      const getTeacherStaffLanding = (userObj) => {
        const perms = userObj?.permissions || {};
        // iterate sidebar sections and items in-order; only consider items with explicit requiredPermission
        for (const section of teacherSidebarSections) {
          if (!section.items) continue;
          for (const item of section.items) {
            const required = item.requiredPermission;
            if (required && typeof required === 'string') {
              if (perms[required]) return item.path;
            }
            // skip items without requiredPermission (these are teacher/admin-only)
          }
        }
  // fallback to teacher dashboard
  return '/teacherdashboard';
      };

      switch (userRole) {
        case 'admin':
          return <Navigate to="/admindashboard" replace />;
        case 'teacher':
          return <Navigate to="/teacherdashboard" replace />;
        case 'student':
          return <Navigate to="/studentdashboard" replace />;
        case 'teacher_staff':
          return <Navigate to={getTeacherStaffLanding(user)} replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }
  }

  return children;
};

export default AuthGuard; 