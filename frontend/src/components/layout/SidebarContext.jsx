import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children, defaultOpen = true }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if device is mobile - only run once on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // Only set initial sidebar state on first load
      if (!isInitialized) {
        if (mobile) {
          setIsSidebarOpen(false);
        } else {
          setIsSidebarOpen(defaultOpen);
        }
        setIsInitialized(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isInitialized, defaultOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const setSidebarOpen = (open) => {
    setIsSidebarOpen(open);
  };

  const value = {
    isSidebarOpen,
    isMobile,
    toggleSidebar,
    setSidebarOpen
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
