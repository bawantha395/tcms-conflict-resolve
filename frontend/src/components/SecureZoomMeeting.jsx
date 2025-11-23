import React, { useState, useEffect } from 'react';
import { FaTimes, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash, FaComments, FaUsers, FaCog, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { getUserData } from '../api/apiUtils';
import { trackZoomAttendance, trackJoinButtonClick } from '../api/attendance';

const SecureZoomMeeting = ({ zoomLink, className, onClose, isOpen, enableNewWindowJoin = true, enableOverlayJoin = true, classData = null }) => {
  console.log('SecureZoomMeeting - Props received:', { enableNewWindowJoin, enableOverlayJoin });
  console.log('SecureZoomMeeting - Condition check:', { 
    notNewWindow: !enableNewWindowJoin, 
    notOverlay: !enableOverlayJoin, 
    bothFalse: !enableNewWindowJoin && !enableOverlayJoin 
  });
  
  // Add watermark animation styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes watermark-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetingId, setMeetingId] = useState(null);
  const [password, setPassword] = useState(null);

  useEffect(() => {
    if (zoomLink && isOpen) {
      extractZoomInfo(zoomLink);
    }
  }, [zoomLink, isOpen]);

  const extractZoomInfo = (link) => {
    try {
      // Extract meeting ID and password from zoom link
      // Example: https://zoom.us/j/123456789?pwd=abcdefgh
      const url = new URL(link);
      const pathParts = url.pathname.split('/');
      const extractedMeetingId = pathParts[pathParts.length - 1];
      
      // Extract password from query parameters
      const extractedPassword = url.searchParams.get('pwd') || '';
      
      setMeetingId(extractedMeetingId);
      setPassword(extractedPassword);
      setIsLoading(false);
    } catch (err) {
      setError('Invalid zoom link format');
      setIsLoading(false);
    }
  };

  const generateSecureEmbedUrl = () => {
    if (!meetingId) return null;
    
    // Get student information
    const userData = getUserData();
    const studentId = userData?.userid || 'STUDENT';
    
    // Create a secure embed URL that doesn't expose the original link
    let embedUrl = `https://zoom.us/wc/join/${meetingId}`;
    
    // Add parameters
    const params = new URLSearchParams();
    
    if (password) {
      params.append('pwd', password);
    }
    
    // Add student ID as the name for auto-population
    params.append('uname', encodeURIComponent(studentId));
    
    // Add additional parameters for better iframe support
    params.append('embed', '1');
    params.append('no_driving_mode', '1');
    params.append('no_register', '1');
    
    if (params.toString()) {
      embedUrl += `?${params.toString()}`;
    }
    
    return embedUrl;
  };

  const [useIframe, setUseIframe] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  const handleJoinMeeting = async () => {
    const embedUrl = generateSecureEmbedUrl();
    if (embedUrl) {
      // 🎯 TRACK JOIN BUTTON CLICK (EVERY CLICK IS RECORDED)
      console.log('🔥 JOIN BUTTON CLICKED - Starting tracking...');
      console.log('📋 Debug info:', { 
        hasClassData: !!classData, 
        classId: classData?.id,
        meetingId: meetingId,
        zoomLink: zoomLink
      });
      
      try {
        if (classData) {
          const userData = getUserData();
          console.log('👤 User data retrieved:', userData);
          
          // Check for both 'id' and 'userid' properties to handle different user data formats
          const studentId = userData?.id || userData?.userid;
          
          if (userData && studentId) {
            // 📊 TRACK EVERY JOIN BUTTON CLICK (separate from attendance)
            const studentName = userData?.username || userData?.name || userData?.studentName || 
                               `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                               userData?.fullName || `Student ${userData?.id || userData?.userid}`;
                               
            const clickData = {
              studentName: studentName,
              meetingId: meetingId,
              zoomLink: zoomLink,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
              browserInfo: {
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled
              }
            };
            
            console.log('🖱️ Tracking join button click:', clickData);
            const clickResult = await trackJoinButtonClick(classData.id, studentId, clickData);
            console.log('✅ Join click tracked:', clickResult);
            
            // 🎯 TRACK ATTENDANCE (ONE PER DAY - will update if duplicate)
            console.log('📊 Tracking attendance for student:', studentId, 'in class:', classData.id);
            const result = await trackZoomAttendance(userData, classData);
            console.log('✅ Attendance tracked successfully:', result);
          } else {
            console.warn('⚠️ No user data found or missing user ID. UserData:', userData);
          }
        } else {
          console.warn('⚠️ No class data provided to component');
        }
      } catch (error) {
        console.error('❌ Error tracking:', error);
        // Don't prevent joining even if tracking fails
      }
      
      if (useIframe) {
        // Use iframe approach - more secure but may have limitations
        setUseIframe(true);
      } else {
        // Open in a new window with specific dimensions and no toolbar
        const popup = window.open(
          embedUrl,
          'zoom_meeting',
          'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
        );
        
        if (popup) {
          // Focus the popup
          popup.focus();
        } else {
          alert('Please allow popups for this site to join the meeting.');
        }
      }
    }
  };

  const handleIframeJoin = async () => {
    // 🎯 TRACK JOIN BUTTON CLICK (EVERY CLICK IS RECORDED) - SAME AS handleJoinMeeting
    console.log('🔥 OVERLAY JOIN BUTTON CLICKED - Starting tracking...');
    console.log('📋 Debug info:', { 
      hasClassData: !!classData, 
      classId: classData?.id,
      meetingId: meetingId,
      zoomLink: zoomLink
    });
    
    try {
      if (classData) {
        const userData = getUserData();
        console.log('👤 User data retrieved:', userData);
        
        // Check for both 'id' and 'userid' properties to handle different user data formats
        const studentId = userData?.id || userData?.userid;
        
        if (userData && studentId) {
          // 📊 TRACK EVERY JOIN BUTTON CLICK (separate from attendance)
          const studentName = userData?.username || userData?.name || userData?.studentName || 
                             `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() ||
                             userData?.fullName || `Student ${userData?.id || userData?.userid}`;
                             
          const clickData = {
            studentName: studentName,
            meetingId: meetingId,
            zoomLink: zoomLink,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            browserInfo: {
              platform: navigator.platform,
              language: navigator.language,
              cookieEnabled: navigator.cookieEnabled
            }
          };
          
          console.log('🖱️ Tracking overlay join button click:', clickData);
          const clickResult = await trackJoinButtonClick(classData.id, studentId, clickData);
          console.log('✅ Overlay join click tracked:', clickResult);
          
          // 🎯 TRACK ATTENDANCE (ONE PER DAY - will update if duplicate)
          console.log('📊 Tracking attendance for student:', studentId, 'in class:', classData.id);
          const result = await trackZoomAttendance(userData, classData);
          console.log('✅ Overlay attendance tracked successfully:', result);
        } else {
          console.warn('⚠️ No user data found or missing user ID. UserData:', userData);
        }
      } else {
        console.warn('⚠️ No class data provided to component');
      }
    } catch (error) {
      console.error('❌ Error tracking overlay join:', error);
      // Don't prevent joining even if tracking fails
    }
    
    setUseIframe(true);
  };

  const handleClose = () => {
    setUseIframe(false);
    setIsMinimized(false);
    setPosition({ x: 0, y: 0 });
    setInitialPosition({ x: 0, y: 0 });
    onClose();
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return; // Don't drag if clicking buttons
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep the overlay within viewport bounds
    const maxX = window.innerWidth - (isMinimized ? 384 : 800); // 384px for minimized, 800px for normal
    const maxY = window.innerHeight - (isMinimized ? 96 : 600); // 96px for minimized, 600px for normal
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Set initial position when overlay opens
  useEffect(() => {
    if (useIframe && !initialPosition.x && !initialPosition.y) {
      const centerX = (window.innerWidth - (isMinimized ? 384 : 800)) / 2;
      const centerY = (window.innerHeight - (isMinimized ? 96 : 600)) / 2;
      setPosition({ x: centerX, y: centerY });
      setInitialPosition({ x: centerX, y: centerY });
    }
  }, [useIframe, isMinimized, initialPosition]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
      };
    }
  }, [isDragging, dragOffset, isMinimized]);

  // Handle escape key to close modal and exit maximize window
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        console.log('ESC key pressed in SecureZoomMeeting');
        
        // Check for maximized meeting container
        const maximizedContainer = document.querySelector('.maximized');
        if (maximizedContainer) {
          console.log('Found maximized container, exiting...');
          const maximizeButton = maximizedContainer.querySelector('button');
          if (maximizeButton) {
            console.log('Clicking maximize button');
            maximizeButton.click();
            return; // Don't close modal if we're just exiting maximize
          }
        }
        
        // Close modal if not in maximize mode
        if (useIframe) {
          handleClose();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [useIframe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setUseIframe(false);
      setIsMinimized(false);
      setPosition({ x: 0, y: 0 });
      setInitialPosition({ x: 0, y: 0 });
    };
  }, []);

  if (!isOpen) return null;

  // If using iframe, show the embedded meeting as an overlay
  if (useIframe) {
    const embedUrl = generateSecureEmbedUrl();
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FaVideo className="text-2xl" />
                <div>
                  <h2 className="text-2xl font-bold">Live Class Meeting</h2>
                  <p className="text-blue-100">{className}</p>
                  <div className="text-yellow-200 text-sm mt-1">
                    🕐 Live Session • Click "Join Meeting" to participate
                  </div>
                  <div className="text-green-200 text-sm mt-1">
                    👤 Auto Name: {getUserData()?.userid || 'STUDENT'} • No manual entry needed
                  </div>
              </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FaTimesCircle size={24} />
              </button>
            </div>
          </div>
          
          {/* Security Warning */}
          <div className="bg-red-50 border border-red-200 p-4 mx-6 mt-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <FaExclamationTriangle className="text-lg" />
              <div>
                <div className="font-semibold">Security Notice</div>
                <div className="text-sm">
                  This meeting is protected. Recording, downloading, or screen capture is prohibited and may result in disciplinary action.
                </div>
              </div>
            </div>
          </div>

          {/* Meeting Container with Student Overlay */}
          <div className="p-6">
            <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
              {/* Student Identification Overlay */}
              <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-mono">
                <div>Student ID: {getUserData()?.userid || 'Unknown'}</div>
                <div>Name: {getUserData()?.firstName || getUserData()?.fullName || getUserData()?.name || 'Ba'} {getUserData()?.lastName || 'Rathnayake'}</div>
                <div>Class: {className}</div>
                <div>Time: {new Date().toLocaleString()}</div>
                <div>Session: Live Meeting</div>
              </div>
              
              {/* Continuous Watermark - Student ID */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-5">
                <div 
                  className="text-white text-opacity-30 text-6xl font-bold transform -rotate-45 select-none"
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    animation: 'watermark-pulse 3s ease-in-out infinite'
                  }}
                >
                  {getUserData()?.userid || 'STUDENT'}
                </div>
              </div>
              
              {/* Additional Watermarks for Better Coverage */}
              <div className="absolute top-1/4 left-1/4 pointer-events-none z-5">
                <div className="text-white text-opacity-15 text-2xl font-bold transform -rotate-30 select-none">
                  {getUserData()?.userid || 'STUDENT'}
                </div>
              </div>
              <div className="absolute bottom-1/4 right-1/4 pointer-events-none z-5">
                <div className="text-white text-opacity-15 text-2xl font-bold transform rotate-30 select-none">
                  {getUserData()?.userid || 'STUDENT'}
                </div>
              </div>
              
              {/* TCMS SECURED Badge */}
              <div className="absolute top-4 right-4 z-10 bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold">
                TCMS SECURED
              </div>
              
              {/* Maximize Window Button */}
              <div className="absolute top-14 right-4 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const meetingContainer = e.target.parentElement.parentElement;
                    const isMaximized = meetingContainer.classList.contains('maximized');
                    
                    if (!isMaximized) {
                      // Maximize
                      meetingContainer.classList.add('maximized');
                      meetingContainer.style.position = 'fixed';
                      meetingContainer.style.top = '0';
                      meetingContainer.style.left = '0';
                      meetingContainer.style.width = '100vw';
                      meetingContainer.style.height = '100vh';
                      meetingContainer.style.zIndex = '9999';
                      meetingContainer.style.backgroundColor = 'black';
                      meetingContainer.style.borderRadius = '0';
                      e.target.innerHTML = '⛶ Exit Maximize';
                      e.target.title = 'Click to exit maximize mode (or press ESC)';
                    } else {
                      // Exit maximize
                      meetingContainer.classList.remove('maximized');
                      meetingContainer.style.position = 'relative';
                      meetingContainer.style.top = '';
                      meetingContainer.style.left = '';
                      meetingContainer.style.width = '';
                      meetingContainer.style.height = '';
                      meetingContainer.style.zIndex = '';
                      meetingContainer.style.backgroundColor = '';
                      meetingContainer.style.borderRadius = '';
                      e.target.innerHTML = '⛶ Maximize Window';
                      e.target.title = 'Click to maximize meeting window';
                    }
                  }}
                  className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-opacity-90 transition-all maximize-button"
                  title="Click to maximize meeting window"
                >
                  ⛶ Maximize Window
                </button>
              </div>
              
              {/* Join Meeting Button */}
              
              {/* Zoom Meeting iframe */}
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allow="camera; microphone; fullscreen; speaker; display-capture"
                title="Zoom Meeting"
              />
            </div>
            
            {/* Meeting Information */}
            <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <FaVideo className="text-blue-600" /> Meeting Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>Meeting Status:</strong> <span className="text-green-600">Ready to Join</span></div>
                <div><strong>Student:</strong> {getUserData()?.firstName || 'Ba'} {getUserData()?.lastName || 'Rathnayake'}</div>
                <div><strong>Student ID:</strong> <span className="text-blue-600 font-mono">{getUserData()?.userid || 'STUDENT'}</span></div>
                <div><strong>Auto Name:</strong> <span className="text-green-600">Will use Student ID</span></div>
                <div><strong>Class:</strong> {className}</div>
                <div><strong>Session Type:</strong> Live Zoom Meeting</div>
              </div>
              <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                <div className="text-sm text-gray-700">
                  <strong>Meeting Rules:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Your Student ID ({getUserData()?.userid || 'STUDENT'}) will be automatically used as your name</li>
                    <li>• Keep your camera and microphone on during class</li>
                    <li>• Participate actively and follow teacher instructions</li>
                    <li>• Recording or downloading is strictly prohibited</li>
                    <li>• Use the chat feature for questions and discussions</li>
                    <li>• Use maximize window button for better viewing experience</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <FaVideo className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Join Class Meeting</h2>
              <p className="text-sm text-gray-600">{className}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing secure meeting room...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <FaTimes className="text-4xl mx-auto mb-2" />
                <p className="font-semibold">Error</p>
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Instructions */}
                              <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCog className="text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Instructions</span>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Click "Join Meeting" to access your class</li>
                    <li>• Allow camera and microphone access when prompted</li>
                    <li>• Enter your name when joining the meeting</li>
                    <li>• Choose your preferred join method below</li>
                  </ul>
                </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <FaMicrophone className="text-green-600" />
                  <span className="text-sm">Audio Available</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <FaVideo className="text-green-600" />
                  <span className="text-sm">Video Available</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <FaComments className="text-green-600" />
                  <span className="text-sm">Chat Available</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <FaUsers className="text-green-600" />
                  <span className="text-sm">Screen Share</span>
                </div>
              </div>

              {/* Join Options */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Choose Join Method:</h4>
                <div className="space-y-3">
                  {enableNewWindowJoin && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded border">
                    <input
                      type="radio"
                      id="popup"
                      name="joinMethod"
                      value="popup"
                        defaultChecked={enableNewWindowJoin}
                      className="text-blue-600"
                    />
                    <label htmlFor="popup" className="flex-1">
                      <div className="font-medium">New Window (Recommended)</div>
                      <div className="text-sm text-gray-600">Opens in a separate window with full features</div>
                    </label>
                  </div>
                  )}
                  {enableOverlayJoin && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded border">
                    <input
                      type="radio"
                      id="iframe"
                      name="joinMethod"
                      value="iframe"
                        defaultChecked={!enableNewWindowJoin && enableOverlayJoin}
                      className="text-blue-600"
                    />
                    <label htmlFor="iframe" className="flex-1">
                      <div className="font-medium">Overlay View</div>
                      <div className="text-sm text-gray-600">Opens as an overlay on this page</div>
                    </label>
                  </div>
                  )}
                  {!enableNewWindowJoin && !enableOverlayJoin && (
                    <div className="text-center p-4 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-600 font-medium">No join methods are currently enabled for this class.</p>
                      <p className="text-sm text-red-500 mt-1">Please contact your administrator.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    const method = document.querySelector('input[name="joinMethod"]:checked').value;
                    if (method === 'iframe') {
                      handleIframeJoin();
                    } else {
                      handleJoinMeeting();
                    }
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaVideo className="text-lg" />
                  Join Meeting
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecureZoomMeeting; 