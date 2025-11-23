import React, { useState, useEffect, useRef } from 'react';
import { getUserData } from '../../api/apiUtils';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaGraduationCap, FaSearch, FaStar, FaClock } from 'react-icons/fa';

const Sidebar = ({ items, onToggle, isMobile, isOpen: externalIsOpen, isLocked = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 });
  const sidebarRef = useRef(null);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Swipe gesture handling
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e) => {
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      // Swipe from left edge to open sidebar
      if (isRightSwipe && touchStart < 50 && !isOpen) {
        toggleSidebar();
        triggerHaptic();
      }
      // Swipe right to close sidebar
      else if (isLeftSwipe && isOpen) {
        toggleSidebar();
        triggerHaptic();
      }

      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, touchStart, touchEnd, isOpen]);

  // Haptic feedback for mobile
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const toggleSidebar = () => {
    const newState = !isOpen;
    if (externalIsOpen !== undefined) {
      onToggle(newState);
    } else {
      setInternalIsOpen(newState);
      onToggle(newState);
    }
    triggerHaptic();
  };

  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const filterMenuItems = (items, searchTerm) => {
    if (!searchTerm) return items;
    
    return items.map(section => ({
      ...section,
      items: section.items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(section => section.items.length > 0);
  };

  const filteredItems = filterMenuItems(items, searchTerm);

  // Helper to find a sidebar item (from the `items` prop) by path
  const findSidebarItem = (path) => {
    if (!items || !Array.isArray(items)) return null;
    for (const section of items) {
      if (!section.items) continue;
      for (const it of section.items) {
        if (it.path === path) return it;
      }
    }
    return null;
  };

  // Helper to determine if current user is allowed to see a given path
  const canAccessPath = (path) => {
    try {
      const user = getUserData();
      if (!user) return true; // no user info -> show by default
      // teachers and admins see everything
      if (user.role && (user.role.toLowerCase() === 'teacher' || user.role.toLowerCase() === 'admin')) return true;
      // for teacher_staff, consult the sidebar item's requiredPermission
      if (user.role && user.role.toLowerCase() === 'teacher_staff') {
        const item = findSidebarItem(path);
        if (!item) return false; // deny if item is unknown
        const required = item.requiredPermission;
        // if a requiredPermission string exists, require it; otherwise DENY for teacher_staff
        if (required && typeof required === 'string') {
          const perms = user.permissions || {};
          return Boolean(perms[required]);
        }
        // For teacher_staff we require an explicit requiredPermission; items with no requiredPermission
        // are considered admin/teacher-only and are not shown to teacher_staff
        return false;
      }
      // other roles: show by default
      return true;
    } catch (e) {
      return true;
    }
  };

  // Resolve dynamic route params like ":examId" from storage (or prompt)
  const resolvePath = (rawPath) => {
    if (!rawPath || typeof rawPath !== 'string') return rawPath;
    if (!rawPath.includes(':examId')) return rawPath;

    const stored = sessionStorage.getItem('currentExamId') || localStorage.getItem('currentExamId');
    if (stored) return rawPath.replace(':examId', String(stored));
    return null; // signal that we don't have an exam id yet
  };

  

  // Mock notification data (in real app, this would come from API)
  const getNotificationCount = (path) => {
    const notifications = {
      '/student/my-payments': 3,
      '/student/notifications': 5,
      '/student/my-classes': 1
    };
    return notifications[path] || 0;
  };

  // Mock status indicators (in real app, this would come from API)
  const getItemStatus = (path) => {
    const statuses = {
      '/student/my-payments': 'warning', // payment due
      '/student/notifications': 'info', // new notifications
      '/student/my-classes': 'success' // class starting soon
    };
    return statuses[path] || null;
  };

  // Tooltip handlers
  const handleMouseEnter = (e, text) => {
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        show: true,
        text,
        x: rect.right + 10,
        y: rect.top + rect.height / 2
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, text: '', x: 0, y: 0 });
  };

  return (
    <>
      {/* Mobile Overlay with enhanced blur effect */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-1px z-40 lg:hidden animate-fadeIn"
          onClick={toggleSidebar}
        />
      )}
      
      
      {/* Enhanced Sidebar with Glassmorphism */}
      <aside
          ref={sidebarRef}
          className={`fixed top-0 left-0 h-screen backdrop-blur-4xl bg-gray-50/5 border-r border-white/40 shadow-2xl transition-all duration-500 ease-in-out z-50
            ${isOpen ? 'w-62' : 'w-17'}
            ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
            ${isMobile ? 'lg:translate-x-0' : ''}
            ${isMobile ? 'w-62' : ''}
            ${isLocked ? 'blur-sm pointer-events-none select-none' : ''}`}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(40px) saturate(250%) contrast(130%) brightness(110%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
        <div className="h-full overflow-y-auto sidebar-scroll">
          {/* Enhanced Glassmorphism Top bar */}
          <div className="h-16 flex items-center justify-center px-4 border-b border-white/30 relative"
               style={{
                 background: 'rgba(255, 255, 255, 0.08)',
                 backdropFilter: 'blur(25px) saturate(200%) contrast(120%)',
                 boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.05)'
               }}>
            {/* Enhanced Glassmorphism Close button */}
            <button
              onClick={toggleSidebar}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl shadow-lg hover:scale-110 transition-all duration-200 active:scale-95"
              style={{ 
                zIndex: 2,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px) saturate(200%) contrast(120%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
              }}
            >
              {isOpen ? <FaTimes className="h-5 w-5 text-gray-700" /> : <FaBars className="h-5 w-5 text-gray-700" />}
            </button>
            {/* Glassmorphism TCMS branding */}
            {isOpen && (
              <div className="flex items-center gap-3 animate-fadeInUp">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-200"
                     style={{
                       background: 'rgba(61, 165, 138, 0.8)',
                       backdropFilter: 'blur(50px) saturate(150%)',
                       border: '1px solid rgba(255, 255, 255, 0.2)'
                     }}>
                  <FaGraduationCap className="text-white text-xl" />
                </span>
                <h1 className="text-xl font-bold text-gray-800">TCMS</h1>
              </div>
            )}
          </div>

          {/* Enhanced Glassmorphism Search Bar */}
                {isOpen && (
            <div className="p-4 border-b border-white/30"
                 style={{
                   background: 'rgba(255, 255, 255, 0.05)',
                   backdropFilter: 'blur(15px) saturate(180%) contrast(110%)'
                 }}>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <input 
                  type="text" 
                  placeholder="Search menu..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-gray-800 placeholder-gray-500 rounded-xl transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(20px) saturate(200%) contrast(120%)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                />
              </div>
                  </div>
                )}

          
          {/* Enhanced Navigation */}
          <nav className="p-4">
            {filteredItems.map((section, sectionIdx) => (
              <div key={sectionIdx} className="mb-6 animate-fadeInUp" style={{ animationDelay: `${sectionIdx * 150}ms` }}>
                {isOpen && (
                  <button
                    onClick={() => toggleSection(section.section)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors duration-200"
                  >
                    <span>{section.section}</span>
                    <span className={`transform transition-transform duration-200 ${collapsedSections[section.section] ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                )}
                <div className={`space-y-1 ${collapsedSections[section.section] ? 'hidden' : ''}`}>
                  {section.items.map((item, itemIdx) => {
                    // If current user is teacher_staff and doesn't have permission for this path, skip rendering
                    if (!canAccessPath(item.path)) return null;
                    const notificationCount = getNotificationCount(item.path);
                    const itemStatus = getItemStatus(item.path);
                    
                    return (
                      <button
                        key={itemIdx}
                        onClick={() => {
                          let path = resolvePath(item.path);
                          if (!path && item.path && item.path.includes(':examId')) {
                            // Ask once if no stored exam id
                            try {
                              const entered = prompt('Enter Exam ID to view results');
                              if (entered && String(entered).trim()) {
                                const val = String(entered).trim();
                                sessionStorage.setItem('currentExamId', val);
                                path = item.path.replace(':examId', val);
                              }
                            } catch {}
                          }
                          if (path) navigate(path);
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, item.name)}
                        onMouseLeave={handleMouseLeave}
                        className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md active:scale-[0.98] relative
                          ${location.pathname === item.path
                            ? 'text-white shadow-lg'
                            : 'text-gray-700 hover:text-gray-900'
                          }
                          ${isOpen ? 'justify-start' : 'justify-center'}
                        `}
                        style={{
                          background: location.pathname === item.path 
                            ? 'rgba(59, 130, 246, 0.7)' 
                            : 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: location.pathname === item.path 
                            ? 'blur(25px) saturate(250%) contrast(130%)' 
                            : 'blur(15px) saturate(180%) contrast(110%)',
                          border: location.pathname === item.path 
                            ? '1px solid rgba(255, 255, 255, 0.4)' 
                            : '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: location.pathname === item.path 
                            ? '0 8px 25px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.1)' 
                            : '0 2px 10px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                          animationDelay: `${(sectionIdx * 150) + (itemIdx * 50)}ms`
                        }}
                      >
                        <span className={`${isOpen ? 'mr-3' : 'mx-auto'} ${location.pathname === item.path ? 'text-white' : 'text-gray-500'} relative`}>
                          {item.icon}
                          {/* Status indicator dot */}
                          {itemStatus && (
                            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                              itemStatus === 'success' ? 'bg-green-500' :
                              itemStatus === 'warning' ? 'bg-yellow-500' :
                              itemStatus === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                            }`}></span>
                          )}
                        </span>
                        {isOpen && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="font-semibold">{item.name}</span>
                            {/* Notification badge */}
                            {notificationCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                                {notificationCount > 9 ? '9+' : notificationCount}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Notification badge for collapsed state */}
                        {!isOpen && notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Transparent Blur Glass Tooltip */}
      {tooltip.show && !isOpen && (
        <div
          className="fixed z-[60] px-4 py-3 text-sm font-semibold text-gray-800 bg-white/20 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 animate-fadeIn"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateY(-50%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          <div className="relative">
            {tooltip.text}
            {/* Transparent glass arrow */}
            <div className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-0 h-0">
              <div className="border-r-4 border-r-white/20 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
              <div className="absolute top-0 left-0 w-0 h-0 border-r-4 border-r-white/10 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -8px, 0);
          }
          70% {
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out forwards;
          opacity: 0;
        }
        
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        
        /* Smooth scrolling for sidebar content */
        .sidebar-scroll {
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 2px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
      `}</style>
    </>
  );
};

export default Sidebar; 