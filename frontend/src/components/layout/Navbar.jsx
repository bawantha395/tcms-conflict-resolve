import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSun, FaMoon, FaSignOutAlt, FaBars } from 'react-icons/fa';
import CustomButton from '../CustomButton';
import CustomButton2 from '../CustomButton2';
import BasicAlertBox from '../BasicAlertBox';
import { logout } from '../../api/apiUtils';

const Navbar = ({ onLogout, onToggleSidebar, isSidebarOpen, customHeaderElements, customTitle, customSubtitle, isMobile, isLocked }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
    // Optionally, add logic to toggle dark mode in your app
  };

  return (
    <nav 
      className={`fixed top-0 right-0 z-50 transition-all duration-300
        ${isScrolled 
          ? 'bg-white/20 backdrop-blur-sm shadow-lg' 
          : 'bg-white/30 backdrop-blur-sm shadow-lg'
        }
        ${isMobile 
          ? 'left-0' 
          : isLocked
            ? isSidebarOpen 
              ? 'left-64' 
              : 'left-16'
            : isSidebarOpen 
              ? 'left-64' 
              : 'left-16'
        }`}
    >
      <div className="w-full px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Left side - Logo/Brand and Mobile Menu Button */}
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-700 mr-3"
              aria-label="Toggle sidebar"
            >
              <FaBars className="h-5 w-5" />
            </button>
            
            {/* Custom Title and Branding */}
            {customTitle && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎓</span>
                <div>
                  <h1 className="text-lg font-bold text-gray-800">{customTitle}</h1>
                  {customSubtitle && (
                    <div className="text-sm text-gray-600">{customSubtitle}</div>
                  )}
                </div>
              </div>
            )}
            
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {/* Custom Header Elements */}
            {customHeaderElements && (
              <div className="flex items-center space-x-2">
                {customHeaderElements}
              </div>
            )}
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-700"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
            </button>
            
            {/* Enhanced Logout Button */}
            <CustomButton 
              onClick={onLogout} 
              className=" p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-700"
              title="Logout"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span></span>
            </CustomButton>
          </div>
        </div>
      </div>

    </nav>
  );
};

// Render the alert box outside the nav component to ensure proper positioning
const NavbarWithAlert = ({ onLogout, onToggleSidebar, isSidebarOpen, customHeaderElements, customTitle, customSubtitle, isMobile, isLocked }) => {
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
      <Navbar 
        onLogout={openLogoutAlert} 
        onToggleSidebar={onToggleSidebar} 
        isSidebarOpen={isSidebarOpen}
        customHeaderElements={customHeaderElements}
        customTitle={customTitle}
        customSubtitle={customSubtitle}
        isMobile={isMobile}
        isLocked={isLocked}
      />
      
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

export default NavbarWithAlert;
export { Navbar }; 