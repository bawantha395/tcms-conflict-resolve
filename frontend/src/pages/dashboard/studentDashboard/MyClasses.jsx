import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BasicCard from '../../../components/BasicCard';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import SecureZoomMeeting from '../../../components/SecureZoomMeeting';
import { getStudentCard, getCardTypeInfo, getCardStatus, isCardValid } from '../../../utils/cardUtils';
import { getStudentEnrollments, markAttendance, requestForgetCard, requestLatePayment, convertEnrollmentToMyClass, getPaymentHistoryForClass } from '../../../api/enrollments';
import { trackZoomAttendance, trackJoinButtonClick, getStudentAttendance } from '../../../api/attendance';
import { getUserData } from '../../../api/apiUtils';
import { getMaterialsByClass, downloadMaterial } from '../../../api/materials';
import { getRecordingsByClass, downloadRecording, getStreamingUrl } from '../../../api/recordings';
import { FaCalendar, FaClock, FaMoneyBill, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaEye, FaCreditCard, FaMapMarkerAlt, FaVideo, FaUsers, FaFileAlt, FaDownload, FaPlay, FaHistory, FaQrcode, FaBarcode, FaBell, FaBook, FaGraduationCap, FaUserClock, FaExclamationCircle, FaInfoCircle, FaStar, FaCalendarAlt, FaUserGraduate, FaChartLine, FaShieldAlt, FaSearch, FaCog, FaSync, FaTicketAlt, FaCalendarWeek, FaTasks, FaFilePdf, FaFileWord, FaFilePowerpoint, FaUpload, FaRedo, FaPauseCircle, FaExpand, FaUser } from 'react-icons/fa';
import BasicAlertBox from '../../../components/BasicAlertBox';




const MyClasses = ({ onLogout }) => {
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
  const [myClasses, setMyClasses] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('status');
  const [selectedClassForDetails, setSelectedClassForDetails] = useState(null);
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [forgetCardRequest, setForgetCardRequest] = useState('');
  const [latePaymentRequest, setLatePaymentRequest] = useState('');
  const [showForgetCardModal, setShowForgetCardModal] = useState(false);
  const [showLatePaymentModal, setShowLatePaymentModal] = useState(false);
  const [selectedClassForRequest, setSelectedClassForRequest] = useState(null);
  const [showSecureZoomModal, setShowSecureZoomModal] = useState(false);
  const [selectedClassForZoom, setSelectedClassForZoom] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedClassForVideo, setSelectedClassForVideo] = useState(null);
  const [videoTimeRemaining, setVideoTimeRemaining] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', type: 'info', title: '' });
  const navigate = useNavigate();
  const [hallBookings, setHallBookings] = useState([]);
  
  // Materials state
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Recordings state
  const [recordings, setRecordings] = useState([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [showRecordingPlayer, setShowRecordingPlayer] = useState(false);
  const [downloadingRecordingId, setDownloadingRecordingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);

  // Attendance data state
  const [attendanceData, setAttendanceData] = useState({});

  // Prevent screen recording and video capture attempts
  useEffect(() => {
    if (showRecordingPlayer) {
      // Disable keyboard shortcuts that might be used for recording
      const handleKeyDown = (e) => {
        // Prevent common screen recording shortcuts
        if (
          (e.metaKey && e.shiftKey && (e.key === '5' || e.key === '4')) || // Mac screenshot/recording
          (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) || // Windows screenshot
          e.key === 'PrintScreen' // Print screen
        ) {
          e.preventDefault();
          setAlertBox({
            open: true,
            message: '⚠️ Screen recording and screenshots are not allowed for protected content.',
            type: 'warning',
            title: 'Action Blocked'
          });
        }
      };

      // Add warning message on video load
      const videoWarningTimer = setTimeout(() => {
        setAlertBox({
          open: true,
          message: 'This video is protected with watermarks containing your student ID. Unauthorized sharing is prohibited and will be tracked.',
          type: 'info',
          title: '🔒 Protected Content'
        });
      }, 1000);

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(videoWarningTimer);
      };
    }
  }, [showRecordingPlayer]);

useEffect(() => {
  if (selectedClassForDetails) {
    const classId = selectedClassForDetails.id;
    
    // Fetch actual enrollment count for this class
    fetch(`http://localhost:8087/routes.php/get_enrollments_by_class?classId=${classId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Count only active enrollments
          const activeEnrollments = data.data.filter(e => e.status === 'active');
          setSelectedClassForDetails(prev => ({
            ...prev,
            currentStudents: activeEnrollments.length
          }));
        }
      })
      .catch(err => {
        console.error('Error fetching enrollment count:', err);
      });
    
    // Load hall bookings
    fetch(`http://localhost:8088/hallbook.php?list=1`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.halls)) {
          const classObj = myClasses.find(c => c.id === selectedClassForDetails.className);
          const className = classObj ? classObj.className : selectedClassForDetails.className;
          console.log('Selected className:', className);
          console.log('Hall bookings class_names:', data.halls.map(h => h.class_name));
          const bookings = data.halls.filter(
            h => {
              // Safe null/undefined check for class_name
              if (!h.class_name || !className) return false;
              const hallClassName = String(h.class_name).trim().toLowerCase();
              const targetClassName = String(className).trim().toLowerCase();
              const targetClassNameAlt = String(selectedClassForDetails.className || '').trim().toLowerCase();
              
              return hallClassName === targetClassName ||
                     hallClassName === targetClassNameAlt ||
                     String(h.class_name) === String(selectedClassForDetails.id);
            }
          );
          setHallBookings(bookings);
        }
      })
      .catch(err => {
        console.error('Error fetching hall bookings:', err);
        setHallBookings([]);
      });
    
    // Load materials for this class
    loadMaterials(classId);
    
    // Load recordings for this class
    loadRecordings(classId);
  }
}, [selectedClassForDetails?.id, myClasses]);
  


  useEffect(() => {
  loadMyClasses();
  createEnrollmentRecords();
  loadAttendanceData();
}, []);

  // Timer effect for video access
  useEffect(() => {
    if (showVideoModal && selectedClassForVideo) {
      const timer = setInterval(() => {
        if (!isClassCurrentlyScheduled(selectedClassForVideo)) {
          // Class time has ended, close video
          setShowVideoModal(false);
          setSelectedClassForVideo(null);
          setVideoTimeRemaining(null);
          setAlertBox({
            open: true,
            title: 'Class Time Ended',
            message: 'Class time has ended. Video access has been closed.',
            type: 'warning'
          });
        } else {
          // Update remaining time
          const now = new Date();
          const [endHours, endMinutes] = selectedClassForVideo.schedule.endTime.split(':').map(Number);
          const classEndTime = new Date();
          classEndTime.setHours(endHours, endMinutes, 0, 0);
          const remaining = Math.max(0, Math.floor((classEndTime - now) / (1000 * 60)));
          setVideoTimeRemaining(remaining);
        }
      }, 1000); // Check every second

      return () => clearInterval(timer);
    }
  }, [showVideoModal, selectedClassForVideo]);

    useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        console.log('ESC key pressed');
        
        // Check for maximized video container
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
        
        // Also check if video modal is open and close it
        if (showVideoModal) {
          console.log('Closing video modal');
          setShowVideoModal(false);
          setSelectedClassForVideo(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showVideoModal]);
  const loadMyClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get logged-in user data
      const userData = getUserData();
      if (!userData || !userData.userid) {
        setError('No logged-in user found. Please login again.');
        setMyClasses([]);
        return;
      }
      
      const studentId = userData.userid;
      
      // Get student's stream from user data
      const studentStream = userData.stream;
      
      // Fetch enrollments from backend API
      const response = await getStudentEnrollments(studentId);
      
      if (response.success && response.data) {

        // Convert enrollments to MyClasses format and filter by stream
        const convertedClasses = response.data
          .filter(enrollment => {
            // If student has no stream set, show all classes
            if (!studentStream) return true;
            
            // If student has "Other" stream, show only Other stream classes
            if (studentStream === 'Other') {
              return enrollment.stream === 'Other';
            }
            
            // If student has specific stream, show only classes that match their stream
            return enrollment.stream === studentStream;
          })
          .map(enrollment => {
          const myClass = convertEnrollmentToMyClass(enrollment);
          
          // Get student's card for this class
          const studentCard = getStudentCard(studentId, myClass.id);
          const cardInfo = studentCard ? getCardTypeInfo(studentCard.cardType) : null;
          const cardStatus = getCardStatus(studentCard);
          const cardValidity = isCardValid(studentCard);
          
            // Add card information
          myClass.studentCard = studentCard;
          myClass.cardInfo = cardInfo;
          myClass.cardStatus = cardStatus;
          myClass.cardValidity = cardValidity;
          
          // Add missing fields with defaults
          myClass.schedule = myClass.schedule || { day: '', startTime: '', endTime: '', frequency: 'weekly' };
          myClass.fee = myClass.fee || 0;
          myClass.maxStudents = myClass.maxStudents || 50;
          // Don't override status - let it come from the enrollment data
          // myClass.status = myClass.status || 'active';
          myClass.currentStudents = myClass.currentStudents || 0;
          myClass.className = myClass.className || 'Unnamed Class';
          myClass.subject = myClass.subject || 'Unknown Subject';
          myClass.teacher = myClass.teacher || 'Unknown Teacher';
          myClass.stream = myClass.stream || 'Unknown Stream';
          myClass.deliveryMethod = myClass.deliveryMethod || 'online';
          myClass.courseType = myClass.courseType || 'theory';
          myClass.paymentStatus = myClass.paymentStatus || 'pending';

          // Use actual payment tracking data from database (already set by convertEnrollmentToMyClass)
          // The paymentTracking object is now properly populated from the database
          // No need to override it here

          myClass.attendance = myClass.attendance || [];
          myClass.paymentHistory = myClass.paymentHistory || [];
          
          return myClass;
        });
        
        setMyClasses(convertedClasses);
      } else {
        setError(response.message || 'Failed to load classes from server');
        setMyClasses([]);
      }
    } catch (err) {
      setError('Failed to load classes. Please refresh the page.');
      setMyClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Create enrollment records for each class (now handled by backend)
  const createEnrollmentRecords = async () => {
    try {
      // Get logged-in user data
      const userData = getUserData();
      if (!userData || !userData.userid) {
        return;
      }
      
      const studentId = userData.userid;
      
      // Get existing enrollments from backend
      const response = await getStudentEnrollments(studentId);
      
      if (response.success && response.data) {
        // Enrollments are already created in backend when payment is processed
        // This function is kept for backward compatibility but doesn't need to do anything
        return;
      }
    } catch (err) {
      // Silent fail - enrollments are created automatically during payment
    }
  };

  // Load materials for a specific class
  const loadMaterials = async (classId) => {
    if (!classId) return;
    
    try {
      setLoadingMaterials(true);
      const data = await getMaterialsByClass(classId);
      
      if (data.success) {
        setMaterials(data.materials || []);
      } else {
        console.error('Failed to load materials:', data.message);
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Load recordings for a class
  const loadRecordings = async (classId) => {
    if (!classId) return;
    
    try {
      setLoadingRecordings(true);
      const data = await getRecordingsByClass(classId);
      
      if (data.success) {
        setRecordings(data.recordings || []);
      } else {
        console.error('Failed to load recordings:', data.message);
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Load attendance data for a student
  const loadAttendanceData = async () => {
    try {
      const userData = getUserData();
      if (!userData || !userData.userid) {
        console.error('No user data found');
        return;
      }
      
      const studentId = userData.userid;
      console.log('📊 Fetching attendance for student:', studentId);
      const response = await getStudentAttendance(studentId);
      
      console.log('📊 Attendance API response:', response);
      
      if (response.success && response.data) {
        // Group attendance by class_id
        const attendanceByClass = {};
        response.data.forEach(record => {
          const classId = record.class_id;
          if (!attendanceByClass[classId]) {
            attendanceByClass[classId] = [];
          }
          attendanceByClass[classId].push(record);
        });
        
        console.log('📊 Grouped attendance by class:', attendanceByClass);
        setAttendanceData(attendanceByClass);
      } else {
        console.log('📊 No attendance data returned');
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setAttendanceData({});
    }
  };

  // Handle recording playback
  const handleWatchRecording = (recording) => {
    setSelectedRecording(recording);
    setShowRecordingPlayer(true);
  };

  // Handle recording download with progress
  const handleDownloadRecording = async (recording) => {
    const userData = getUserData();
    if (!userData || !userData.userid) {
      alert('Please log in to download recordings');
      return;
    }

    // Prevent multiple simultaneous downloads
    if (downloadingRecordingId) {
      setAlertBox({
        open: true,
        message: 'Please wait for the current download to complete',
        type: 'warning',
        title: 'Download in Progress'
      });
      return;
    }

    try {
      setDownloadingRecordingId(recording.id);
      setDownloadProgress(0);

      // Show initial processing message
      setAlertBox({
        open: true,
        message: '🔄 Creating watermarked video... This may take 5-10 minutes for large videos. Please be patient.',
        type: 'info',
        title: 'Processing Watermarks'
      });

      const studentName = userData.fullname || userData.fullName || userData.name || userData.firstName || userData.username || 'Student';
      
      // Simulate progress while waiting for backend
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return 90; // Cap at 90% until actual download completes
          return prev + 5;
        });
      }, 300);

      const blob = await downloadRecording(
        recording.id,
        userData.userid,
        studentName
      );

      clearInterval(progressInterval);
      setDownloadProgress(100);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = recording.file_name || `recording_${recording.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setAlertBox({
        open: true,
        message: '✅ Recording downloaded successfully! Check your downloads folder.',
        type: 'success',
        title: 'Download Complete'
      });

      // Reset after a delay
      setTimeout(() => {
        setDownloadingRecordingId(null);
        setDownloadProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Error downloading recording:', error);
      setDownloadingRecordingId(null);
      setDownloadProgress(0);
      setAlertBox({
        open: true,
        message: error.message || 'Failed to download recording',
        type: 'error',
        title: 'Download Failed'
      });
    }
  };

  // Handle material download - Direct download, password required to open PDF
  const handleDownloadMaterial = async (material) => {
    const userData = getUserData();
    if (!userData || !userData.userid) {
      setAlertBox({
        open: true,
        message: 'Please log in to download materials.',
        type: 'warning',
        title: 'Authentication Required'
      });
      return;
    }

    try {
      setIsDownloading(true);

      // Get student name with multiple fallbacks
      const studentName = userData.fullname || userData.fullName || userData.name || userData.firstName || userData.username || 'Student';

      // Call download API with student credentials
      const blob = await downloadMaterial(
        material.id,
        userData.userid,
        studentName
      );
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.file_name || material.filename || `material_${material.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Show success message
      setAlertBox({
        open: true,
        message: `Download successful! The file has been saved to your device.\n\nNote: Some PDFs may be password-protected. Use your Student ID as the password: ${userData.userid}`,
        type: 'success',
        title: 'Download Complete'
      });
      
      // Reload materials to update download count
      if (selectedClassForDetails) {
        loadMaterials(selectedClassForDetails.id);
      }
    } catch (error) {
      console.error('Error downloading material:', error);
      setAlertBox({
        open: true,
        message: error.message || 'Failed to download material. Please try again.',
        type: 'danger',
        title: 'Download Failed'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Listen for payment updates
  useEffect(() => {
    const handlePaymentUpdate = () => {
      console.log('🔄 MyClasses: Received refreshMyClasses event');
      loadMyClasses();
    };

    const handlePaymentCompleted = (event) => {
      console.log('🔄 MyClasses: Received paymentCompleted event', event.detail);
      loadMyClasses();
    };

    const handleStorageChange = () => {
      console.log('🔄 MyClasses: Received storage change event');
      loadMyClasses();
    };

    window.addEventListener('refreshMyClasses', handlePaymentUpdate);
    window.addEventListener('paymentCompleted', handlePaymentCompleted);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('refreshMyClasses', handlePaymentUpdate);
      window.removeEventListener('paymentCompleted', handlePaymentCompleted);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showDetailsModal) {
        setShowDetailsModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDetailsModal]);

  // Payment Tracking Utility Functions
  const getPaymentTrackingStatus = (cls) => {
    // CRITICAL: Check payment status for special statuses FIRST
    // Late Pay = Permission granted for TODAY only - allow access
    if (cls.paymentStatus === 'late_pay') {
      console.log('⏰ LATE PAY PERMISSION detected - Access granted for today');
      return {
        canAccess: true,
        status: 'late-pay',
        message: 'Late pay permission - Access granted for today only',
        daysRemaining: 0,
        nextPaymentDate: null,
        gracePeriodEndDate: null,
        freeDays: 0,
        paymentTrackingEnabled: false,
        isLatePay: true
      };
    }
    
    // Free Card (overdue) = No payment needed - always has access
    // Half Card (partial) = Only half payment needed - check if half is paid
    if (cls.paymentStatus === 'overdue') {
      // Free Card - No payment required
      console.log('🎁 FREE CARD detected - No payment required');
      return {
        canAccess: true,
        status: 'free-card',
        message: 'Free Card - No payment required',
        daysRemaining: 999,
        nextPaymentDate: null,
        gracePeriodEndDate: null,
        freeDays: 0,
        paymentTrackingEnabled: false,
        isFreeCard: true
      };
    }
    
    if (cls.paymentStatus === 'partial') {
      // Half Card - Half payment required
      const paidAmount = parseFloat(cls.paidAmount || 0);
      const totalFee = parseFloat(cls.total_fee || cls.fee || 0);
      const halfFee = totalFee / 2;
      const hasPaidHalf = paidAmount >= halfFee;
      
      console.log('💳 HALF CARD detected - Half payment:', {
        paidAmount,
        totalFee,
        halfFee,
        hasPaidHalf
      });
      
      if (hasPaidHalf) {
        return {
          canAccess: true,
          status: 'half-card',
          message: `Half Card - ${paidAmount.toFixed(2)} paid of ${halfFee.toFixed(2)} required`,
          daysRemaining: 999,
          nextPaymentDate: null,
          gracePeriodEndDate: null,
          freeDays: 0,
          paymentTrackingEnabled: false,
          isHalfCard: true
        };
      } else {
        return {
          canAccess: false,
          status: 'payment-required',
          message: `Half Card - Need ${(halfFee - paidAmount).toFixed(2)} more (50% payment required)`,
          daysRemaining: 0,
          nextPaymentDate: null,
          gracePeriodEndDate: null,
          freeDays: 0,
          paymentTrackingEnabled: false,
          isHalfCard: true
        };
      }
    }
    
    // CRITICAL FIX: Parse payment tracking correctly - it comes as JSON string from backend
    let hasPaymentTracking = false;
    try {
      if (typeof cls.paymentTracking === 'string') {
        const parsed = JSON.parse(cls.paymentTracking);
        hasPaymentTracking = parsed.enabled === true;
      } else if (typeof cls.paymentTracking === 'object' && cls.paymentTracking !== null) {
        hasPaymentTracking = cls.paymentTracking.enabled === true;
      } else {
        hasPaymentTracking = cls.paymentTracking === true;
      }
    } catch (e) {
      console.error('Error parsing paymentTracking:', e);
      hasPaymentTracking = false;
    }
    
    console.log('🔍 Payment Tracking Check for', cls.className, ':', hasPaymentTracking, 'Raw:', cls.paymentTracking);
    
    // Both enabled and disabled payment tracking have monthly payments, but different grace periods
    const today = new Date(); // Use current date
    
    // If payment status is 'paid' but no payment history, create a basic payment record
    if (cls.paymentStatus === 'paid' && (!cls.paymentHistory || cls.paymentHistory.length === 0)) {
      // Get free days from class configuration
      const freeDays = cls.paymentTrackingFreeDays || 7;
      
      // CRITICAL FIX: Use stored nextPaymentDate if available, otherwise calculate 1st of next month
      let nextPaymentDate;
      if (cls.nextPaymentDate) {
        // Use the stored next payment date from database
        nextPaymentDate = new Date(cls.nextPaymentDate);
        console.log('📅 Using stored nextPaymentDate from database:', cls.nextPaymentDate);
      } else {
        // INDUSTRY STANDARD: Next payment is always 1st of next month, regardless of when class was purchased
        // This ensures consistent billing cycles and proper grace period calculation
        nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        console.log('📅 Calculated nextPaymentDate (1st of next month):', nextPaymentDate);
      }
      
      if (hasPaymentTracking) {
        // Payment tracking enabled: has grace period
        const gracePeriodEndDate = new Date(nextPaymentDate);
        gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + freeDays);
        
        if (today <= gracePeriodEndDate) {
          const daysRemaining = Math.ceil((gracePeriodEndDate - today) / (1000 * 60 * 60 * 24));
          console.log('✅ Grace period active - Days remaining:', daysRemaining, 'Grace ends:', gracePeriodEndDate);
          return { 
            canAccess: true, 
            status: 'paid', 
            message: `Payment completed (${daysRemaining} days remaining in grace period)`,
            daysRemaining: daysRemaining,
            nextPaymentDate: nextPaymentDate,
            gracePeriodEndDate: gracePeriodEndDate,
            freeDays: freeDays,
            paymentTrackingEnabled: true
          };
        } else {
          // Grace period expired
          console.log('❌ Grace period EXPIRED - Payment was due:', nextPaymentDate, 'Grace ended:', gracePeriodEndDate);
          return {
            canAccess: false,
            status: 'payment-required',
            message: 'Payment required - grace period expired',
            nextPaymentDate: nextPaymentDate,
            gracePeriodEndDate: gracePeriodEndDate,
            freeDays: freeDays,
            paymentTrackingEnabled: true
          };
        }
      } else {
        // Payment tracking disabled: no grace period, payment due immediately on next payment date
        if (today < nextPaymentDate) {
          const daysRemaining = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
          return { 
            canAccess: true, 
            status: 'paid', 
            message: `Payment completed (${daysRemaining} days until next payment)`,
            daysRemaining: daysRemaining,
            nextPaymentDate: nextPaymentDate,
            gracePeriodEndDate: nextPaymentDate,
            freeDays: 0,
            paymentTrackingEnabled: false
          };
        } else {
          // Payment overdue (no grace period)
          console.log('❌ Payment OVERDUE (no grace) - Payment was due:', nextPaymentDate);
          return {
            canAccess: false,
            status: 'payment-required',
            message: 'Payment required - payment overdue',
            nextPaymentDate: nextPaymentDate,
            gracePeriodEndDate: nextPaymentDate,
            freeDays: 0,
            paymentTrackingEnabled: false
          };
        }
      }
    }
    
    // Check if there's a payment history
    if (!cls.paymentHistory || cls.paymentHistory.length === 0) {
      // CRITICAL FIX: Even with no payment history, return next payment date if available
      const nextPaymentDate = cls.nextPaymentDate ? new Date(cls.nextPaymentDate) : null;
      
      return { 
        canAccess: false, 
        status: 'no-payment', 
        message: 'No payment history - payment required',
        nextPaymentDate: nextPaymentDate,
        paymentTrackingEnabled: hasPaymentTracking
      };
    }

    // Get the latest payment
    const latestPayment = cls.paymentHistory[cls.paymentHistory.length - 1];
    const paymentDate = new Date(latestPayment.date);
    
    // Check if payment tracking is enabled in the payment record
    const paymentTrackingEnabled = latestPayment.paymentTrackingEnabled !== undefined ? latestPayment.paymentTrackingEnabled : hasPaymentTracking;
    
    // Get free days from payment history or class configuration
    const freeDays = latestPayment.freeDays || cls.paymentTrackingFreeDays || 7;
    
    // CRITICAL FIX: Use next payment date from multiple sources in priority order
    let nextPaymentDate;
    if (latestPayment.nextPaymentDate) {
      // First priority: Use next payment date from payment history
      nextPaymentDate = new Date(latestPayment.nextPaymentDate);
      console.log('📅 Using nextPaymentDate from payment history:', latestPayment.nextPaymentDate);
    } else if (cls.nextPaymentDate) {
      // Second priority: Use stored next payment date from class enrollment
      nextPaymentDate = new Date(cls.nextPaymentDate);
      console.log('📅 Using nextPaymentDate from enrollment:', cls.nextPaymentDate);
    } else {
      // INDUSTRY STANDARD: Next payment is always 1st of next month, regardless of payment date
      // This ensures consistent billing cycles and proper grace period calculation
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      console.log('📅 Calculated nextPaymentDate (1st of next month):', nextPaymentDate);
    }
    
    // Calculate grace period end date based on payment tracking setting
    let gracePeriodEndDate;
    if (paymentTrackingEnabled) {
      // Payment tracking enabled: next payment date + free days
      gracePeriodEndDate = new Date(nextPaymentDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + freeDays);
    } else {
      // Payment tracking disabled: no grace period (payment due immediately on next payment date)
      gracePeriodEndDate = new Date(nextPaymentDate);
    }
    
    // Check if today is within the grace period
    if (today <= gracePeriodEndDate) {
      const daysRemaining = Math.ceil((gracePeriodEndDate - today) / (1000 * 60 * 60 * 24));
      const nextPaymentDay = nextPaymentDate.getDate();
      const nextPaymentMonth = nextPaymentDate.toLocaleDateString('en-US', { month: 'long' });
      
      if (paymentTrackingEnabled) {
      return { 
        canAccess: true, 
        status: 'paid', 
          message: `Payment completed (${daysRemaining} days remaining in grace period)`,
        daysRemaining: daysRemaining,
        nextPaymentDate: nextPaymentDate,
          gracePeriodEndDate: gracePeriodEndDate,
          freeDays: freeDays,
          paymentTrackingEnabled: true
        };
      } else {
        return { 
          canAccess: true, 
          status: 'paid', 
          message: `Payment completed (${daysRemaining} days until next payment)`,
          daysRemaining: daysRemaining,
          nextPaymentDate: nextPaymentDate,
          gracePeriodEndDate: gracePeriodEndDate,
          freeDays: 0,
          paymentTrackingEnabled: false
        };
      }
    }

    // If we're past the grace period, payment is required
    return { 
      canAccess: false, 
      status: 'payment-required', 
      message: 'Payment required - grace period expired',
      paymentTrackingEnabled: paymentTrackingEnabled
    };
  };

  const getPaymentTrackingInfo = (cls) => {
    const trackingStatus = getPaymentTrackingStatus(cls);
    const freeDays = trackingStatus.freeDays || cls.paymentTrackingFreeDays || 7;
    const today = new Date(); // Use current date
    const currentDay = today.getDate();
    
    // If payment tracking is disabled, return simplified info
    if (!trackingStatus.paymentTrackingEnabled) {
      return {
        ...trackingStatus,
        freeDays: 0,
        currentDay,
        isFreePeriod: true,
        daysRemaining: 0,
        nextPaymentDate: cls.nextPaymentDate ? new Date(cls.nextPaymentDate) : trackingStatus.nextPaymentDate, // CRITICAL FIX: Use cls.nextPaymentDate
        lastPaymentDate: cls.paymentHistory && cls.paymentHistory.length > 0 
          ? new Date(cls.paymentHistory[cls.paymentHistory.length - 1].date) 
          : null,
        testDate: null
      };
    }
    
    return {
      ...trackingStatus,
      freeDays,
      currentDay,
      isFreePeriod: currentDay <= freeDays,
      daysRemaining: Math.max(0, freeDays - currentDay + 1),
      nextPaymentDate: cls.nextPaymentDate ? new Date(cls.nextPaymentDate) : trackingStatus.nextPaymentDate,
      lastPaymentDate: cls.paymentHistory && cls.paymentHistory.length > 0 
        ? new Date(cls.paymentHistory[cls.paymentHistory.length - 1].date) 
        : null,
      testDate: null
    };
  };

  // Get image based on subject
  const getClassImage = (subject) => {
    if (!subject) return '/assets/nfts/Nft1.png';
    const imageMap = {
      'Physics': '/assets/nfts/Nft1.png',
      'Chemistry': '/assets/nfts/Nft2.png',
      'Mathematics': '/assets/nfts/Nft3.png',
      'Biology': '/assets/nfts/Nft4.png',
      'English': '/assets/nfts/Nft5.png',
      'ICT': '/assets/nfts/Nft6.png'
    };
    return imageMap[subject] || '/assets/nfts/Nft1.png';
  };

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
    const [hour, minute] = timeStr.split(':');
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
    } catch (err) {
      return timeStr;
    }
  };

  // Format day for display
  const formatDay = (day) => {
    if (!day) return '';
    return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  };

  const getTimeUntilClass = (cls) => {
    if (!cls.schedule || !cls.schedule.startTime) return null;
    
    const now = new Date();
    const [hours, minutes] = cls.schedule.startTime.split(':').map(Number);
    const classStartTime = new Date();
    classStartTime.setHours(hours, minutes, 0, 0);
    
    const timeDiff = (classStartTime - now) / (1000 * 60); // minutes
    
    if (timeDiff < -15) return null; // Class already started more than 15 minutes ago
    if (timeDiff > 15) return null; // Class starts more than 15 minutes from now
    
    if (timeDiff < 0) {
      return `Started ${Math.abs(Math.round(timeDiff))} minutes ago`;
    } else if (timeDiff === 0) {
      return 'Starting now';
    } else {
      return `Starts in ${Math.round(timeDiff)} minutes`;
    }
  };

  // Get payment status info with enhanced details - CRITICAL: Check grace period too
  const getPaymentStatusInfo = (cls) => {
    const paymentTrackingInfo = getPaymentTrackingInfo(cls);
    const status = cls.paymentStatus;
    const nextPaymentDate = cls.nextPaymentDate;
    const nextPayment = new Date(nextPaymentDate);
    const today = new Date();
    const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    
    // CRITICAL: Check for special card types first
    if (paymentTrackingInfo.isFreeCard) {
      return { 
        color: 'text-purple-600', 
        icon: <FaCheckCircle />, 
        text: 'Free Card',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    }
    
    if (paymentTrackingInfo.isHalfCard) {
      if (paymentTrackingInfo.canAccess) {
        return { 
          color: 'text-blue-600', 
          icon: <FaCheckCircle />, 
          text: 'Half Card (Paid)',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      } else {
        return { 
          color: 'text-orange-600', 
          icon: <FaExclamationTriangle />, 
          text: 'Half Card (50% Required)',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      }
    }
    
    // CRITICAL FIX: If grace period expired, show Payment Required instead of Paid
    if (!paymentTrackingInfo.canAccess && (paymentTrackingInfo.status === 'payment-required' || paymentTrackingInfo.status === 'grace-period-expired')) {
      return { 
        color: 'text-red-600', 
        icon: <FaTimesCircle />, 
        text: 'Payment Required',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    
    switch (status) {
      case 'paid':
        return { 
          color: 'text-green-600', 
          icon: <FaCheckCircle />, 
          text: 'Paid',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'pending':
        return { 
          color: 'text-yellow-600', 
          icon: <FaExclamationTriangle />, 
          text: daysUntilPayment > 0 ? `Due in ${daysUntilPayment} days` : 'Due Today',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'overdue':
        return { 
          color: 'text-red-600', 
          icon: <FaTimesCircle />, 
          text: `Overdue by ${Math.abs(daysUntilPayment)} days`,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'late_pay':
        return { 
          color: 'text-orange-600', 
          icon: <FaUserClock />, 
          text: 'Late Payment Approved',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      default:
        return { 
          color: 'text-gray-600', 
          icon: <FaClock />, 
          text: 'Unknown',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Get delivery method info
  const getDeliveryMethodInfo = (method) => {
    switch (method) {
      case 'online':
        return { color: 'text-purple-600', icon: <FaVideo />, text: 'Online Only' };
      case 'physical':
        return { color: 'text-orange-600', icon: <FaMapMarkerAlt />, text: 'Physical Only' };
      case 'hybrid1':
        return { color: 'text-indigo-600', icon: <FaUsers />, text: 'Hybrid (Physical + Online)' };
      case 'hybrid2':
        return { color: 'text-green-600', icon: <FaVideo />, text: 'Hybrid (Physical + Recorded)' };
      case 'hybrid3':
        return { color: 'text-blue-600', icon: <FaVideo />, text: 'Hybrid (Online + Recorded)' };
      case 'hybrid4':
        return { color: 'text-teal-600', icon: <FaUsers />, text: 'Hybrid (Physical + Online + Recorded)' };
      case 'hybrid':
        return { color: 'text-indigo-600', icon: <FaUsers />, text: 'Hybrid' };
      default:
        return { color: 'text-gray-600', icon: <FaUsers />, text: method || 'Unknown' };
    }
  };

  // Get course type info
  const getCourseTypeInfo = (type) => {
    switch (type) {
      case 'theory':
        return { color: 'text-blue-600', icon: <FaBook />, text: 'Theory' };
      case 'revision':
        return { color: 'text-green-600', icon: <FaGraduationCap />, text: 'Revision' };
      case 'both':
        return { color: 'text-purple-600', icon: <FaBook />, text: 'Theory + Revision' };
      default:
        return { color: 'text-gray-600', icon: <FaBook />, text: type || 'Unknown' };
    }
  };

  // Get class status info
  const getClassStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { color: 'text-green-600', icon: <FaCheckCircle />, text: 'Active', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
      case 'inactive':
        return { color: 'text-red-600', icon: <FaTimesCircle />, text: 'Inactive', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      case 'suspended':
        return { color: 'text-orange-600', icon: <FaPauseCircle />, text: 'Suspended', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
      case 'completed':
        return { color: 'text-blue-600', icon: <FaGraduationCap />, text: 'Completed', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
      case 'dropped':
        return { color: 'text-red-600', icon: <FaTimesCircle />, text: 'Dropped', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
      default:
        return { color: 'text-gray-600', icon: <FaClock />, text: 'Unknown', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
  };

  // Get class priority/urgency for display based on delivery method
  const getClassPriority = (cls) => {
    // Priority based on delivery method:
    // HIGH: Online only (online, hybrid1, hybrid3, hybrid4)
    // MEDIUM: Recorded/Hybrid (hybrid2)
    // LOW: Physical only (physical)
    
    // Check delivery method first
    if (cls.deliveryMethod === 'online') {
      return { priority: 'high', text: 'Online', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    }
    
    if (cls.deliveryMethod === 'hybrid1') {
      // Physical + Online
      return { priority: 'high', text: 'Hybrid (Online)', color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
    }
    
    if (cls.deliveryMethod === 'hybrid3') {
      // Online + Recorded
      return { priority: 'high', text: 'Online + Recorded', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    }
    
    if (cls.deliveryMethod === 'hybrid4') {
      // Physical + Online + Recorded
      return { priority: 'high', text: 'All Methods', color: 'text-teal-600', bgColor: 'bg-teal-50' };
    }
    
    if (cls.deliveryMethod === 'hybrid2') {
      // Physical + Recorded
      return { priority: 'medium', text: 'Recorded', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
    
    if (cls.deliveryMethod === 'physical') {
      return { priority: 'low', text: 'Physical', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    }
    
    // Default fallback
    return { priority: 'low', text: 'Physical', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  // Get numeric priority for sorting
  const getClassPriorityValue = (cls) => {
    const priority = getClassPriority(cls);
    switch (priority.priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  // Debug function to log sorting information
  const debugSorting = (classes, sortBy) => {
    console.log(`🔍 Sorting ${classes.length} classes by: ${sortBy}`);
    classes.slice(0, 3).forEach((cls, index) => {
      console.log(`  ${index + 1}. ${cls.className} - Priority: ${getClassPriorityValue(cls)}, Status: ${cls.paymentStatus}, Due: ${cls.nextPaymentDate}`);
    });
  };

  // Filter and sort classes
  const filteredAndSortedClasses = myClasses
        .filter(cls => {
      // Tab filtering
    if (selectedTab === 'all') return true;
    if (selectedTab === 'live') {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      // Check if delivery method supports online classes
      if (!['online', 'hybrid1', 'hybrid3', 'hybrid4'].includes(cls.deliveryMethod)) return false;
      if (!cls.schedule.day || !cls.schedule.startTime) return false;
      
      const now = new Date();
      const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today];
      
      // Only show classes scheduled for today
      if (cls.schedule.day !== todayName) return false;
      
      // Parse class start time
      const [hours, minutes] = cls.schedule.startTime.split(':').map(Number);
      const classStartTime = new Date();
      classStartTime.setHours(hours, minutes, 0, 0);
      
      // Calculate time difference in minutes
      const timeDiff = (classStartTime - now) / (1000 * 60);
      
      // Show if class starts within 2 hours before or is currently running (within 1 hour of start)
      // This makes the live tab more useful by showing upcoming classes
      return timeDiff >= -120 && timeDiff <= 60;
    }
    if (selectedTab === 'today') {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today.getDay()];
      return cls.schedule.day === todayName;
    }
    if (selectedTab === 'tomorrow') {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const tomorrowName = dayNames[tomorrow.getDay()];
      return cls.schedule.day === tomorrowName;
    }
    if (selectedTab === 'this-week') {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today.getDay()];
      return cls.schedule.day === todayName || cls.schedule.frequency === 'weekly';
    }
    if (selectedTab === 'this-month') {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      return cls.schedule.frequency === 'weekly' || cls.schedule.frequency === 'bi-weekly' || cls.schedule.frequency === 'monthly';
    }
    if (selectedTab === 'no-schedule') {
      return cls.schedule && cls.schedule.frequency === 'no-schedule';
    }
    if (selectedTab === 'payment-due') {
      // Check if payment is due from month start to paid day
      if (!cls.nextPaymentDate) return false;
      
      const nextPayment = new Date(cls.nextPaymentDate);
      const today = new Date();
      
      // Check if payment is overdue
      if (nextPayment <= today && cls.paymentStatus !== 'paid') return true;
      
      // Check if it's a monthly payment and we're in the payment period
      if (cls.paymentTracking && (cls.paymentTracking.enabled || cls.paymentTracking === true)) {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const paymentDay = new Date(cls.nextPaymentDate);
        
        // If we're between month start and payment day, and payment status is not paid
        if (today >= monthStart && today <= paymentDay && cls.paymentStatus !== 'paid') {
          return true;
        }
      }
      
      return false;
    }
    return false;
    })
    .filter(cls => {
      // Search filtering
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        cls.className?.toLowerCase().includes(searchLower) ||
        cls.subject?.toLowerCase().includes(searchLower) ||
        cls.teacher?.toLowerCase().includes(searchLower) ||
        cls.stream?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.className || '';
          const nameB = b.className || '';
          return nameA.localeCompare(nameB);
        case 'purchased-date':
          // Sort by enrollment date (assuming we have this data)
          const dateA = a.enrollmentDate ? new Date(a.enrollmentDate) : new Date(0);
          const dateB = b.enrollmentDate ? new Date(b.enrollmentDate) : new Date(0);
          // Handle invalid dates
          if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
          if (isNaN(dateA.getTime())) return 1;
          if (isNaN(dateB.getTime())) return -1;
          return dateB - dateA; // Most recent first
        case 'payment-due':
          // Sort by payment due date
          const dueA = a.nextPaymentDate ? new Date(a.nextPaymentDate) : new Date(9999, 11, 31);
          const dueB = b.nextPaymentDate ? new Date(b.nextPaymentDate) : new Date(9999, 11, 31);
          // Handle invalid dates
          if (isNaN(dueA.getTime()) && isNaN(dueB.getTime())) return 0;
          if (isNaN(dueA.getTime())) return 1;
          if (isNaN(dueB.getTime())) return -1;
          return dueA - dueB; // Earliest due date first
        case 'status':
        default:
          return getClassPriorityValue(b) - getClassPriorityValue(a);
      }
  });

  // Debug sorting results
  if (filteredAndSortedClasses.length > 0) {
    debugSorting(filteredAndSortedClasses, sortBy);
  }

  // Handle make payment
  const handleMakePayment = (cls) => {
    const paymentTrackingInfo = getPaymentTrackingInfo(cls);
    const gracePeriodExpired = !paymentTrackingInfo.canAccess;
    
    navigate(`/student/checkout/${cls.id}`, { 
      state: { 
        type: 'renewal',
        gracePeriodExpired: gracePeriodExpired,
        daysRemaining: paymentTrackingInfo.daysRemaining || 0
      } 
    });
  };

  // Handle view details - modern modal approach
  const handleViewDetails = async (cls) => {
    // Prevent access when admin deactivated the class
    if (cls.status === 'inactive') {
      setAlertBox({
        open: true,
        title: 'Class Inactive',
        message: 'This class has been deactivated by the administrator. You cannot view details until it is reactivated.',
        type: 'danger'
      });
      return;
    }
    // Check enrollment status first
    if (cls.enrollmentStatus === 'suspended') {
      setAlertBox({
        open: true,
        title: 'Access Suspended',
        message: 'Access to this class has been suspended. Please contact the administrator for more information.',
        type: 'danger'
      });
      return;
    }
    
    if (cls.enrollmentStatus === 'dropped') {
      setAlertBox({
        open: true,
        title: 'Course Dropped',
        message: 'You have dropped this course. No access is available.',
        type: 'warning'
      });
      return;
    }
    
    // Check payment tracking and grace period
    const paymentTrackingInfo = getPaymentTrackingInfo(cls);
    if (!paymentTrackingInfo.canAccess) {
      if (paymentTrackingInfo.status === 'payment-required') {
        setAlertBox({
          open: true,
          title: 'Payment Required',
          message: 'Payment required - grace period has expired. Please make payment to restore access to this class.',
          type: 'danger'
        });
      } else if (paymentTrackingInfo.status === 'no-payment') {
        setAlertBox({
          open: true,
          title: 'Payment Required',
          message: 'No payment history found. Please make payment to access this class.',
          type: 'danger'
        });
      } else {
        setAlertBox({
          open: true,
          title: 'Access Restricted',
          message: 'Access restricted due to payment issues. Please contact the administrator.',
          type: 'danger'
        });
      }
      return;
    }
    
    // Fetch payment history for this class
    try {
      const userData = getUserData();
      const paymentHistory = await getPaymentHistoryForClass(userData.userid, cls.id);
      
      // Extract price breakdown from first payment (initial enrollment payment)
      let priceBreakdown = {
        basePrice: cls.fee, // Use class fee as base price
        purchasePrice: cls.total_fee || cls.paidAmount || cls.fee,
        promoDiscount: 0,
        theoryStudentDiscount: 0,
        speedPostFee: 0
      };

      // Parse payment notes to extract discounts and fees
      if (paymentHistory && paymentHistory.length > 0) {
        // Get the first payment (enrollment payment) which should have the breakdown
        const firstPayment = paymentHistory[0];
        
        if (firstPayment.notes) {
          const notes = firstPayment.notes;
          
          // Extract Promo discount: "Promo: 500"
          const promoMatch = notes.match(/Promo:\s*(\d+)/i);
          if (promoMatch) {
            priceBreakdown.promoDiscount = parseInt(promoMatch[1]);
          }
          
          // Extract Theory Discount: "Theory Discount: 200"
          const theoryMatch = notes.match(/Theory Discount:\s*(\d+)/i);
          if (theoryMatch) {
            priceBreakdown.theoryStudentDiscount = parseInt(theoryMatch[1]);
          }
          
          // Extract Speed Post fee: "Speed Post: 225"
          const speedPostMatch = notes.match(/Speed Post:\s*(\d+)/i);
          if (speedPostMatch) {
            priceBreakdown.speedPostFee = parseInt(speedPostMatch[1]);
          }
          
          // Use the actual payment amount as purchase price
          if (firstPayment.amount) {
            priceBreakdown.purchasePrice = firstPayment.amount;
          }
        }
      }
      
      // Update the class with payment history and price breakdown
      const updatedClass = {
        ...cls,
        paymentHistory: paymentHistory,
        ...priceBreakdown // Spread the price breakdown fields
      };
      
      setSelectedClassForDetails(updatedClass);
      setDetailsActiveTab('overview');
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      // Still show the class details even if payment history fails to load
    setSelectedClassForDetails(cls);
    setDetailsActiveTab('overview');
    setShowDetailsModal(true);
    }
  };

  // Handle join class
  const handleJoinClass = (cls) => {
    // Prevent access when admin deactivated the class
    if (cls.status === 'inactive') {
      setAlertBox({
        open: true,
        title: 'Class Inactive',
        message: 'This class has been deactivated by the administrator. You cannot join or access materials until it is reactivated.',
        type: 'danger'
      });
      return;
    }
    // Check enrollment status first
    if (cls.enrollmentStatus === 'suspended') {
      setAlertBox({
        open: true,
        title: 'Access Suspended',
        message: 'Access to this class has been suspended. Please contact the administrator for more information.',
        type: 'danger'
      });
      return;
    }
    
    if (cls.enrollmentStatus === 'completed') {
      setAlertBox({
        open: true,
        title: 'Course Completed',
        message: 'This course has been completed. No further access is available.',
        type: 'info'
      });
      return;
    }
    
    if (cls.enrollmentStatus === 'dropped') {
      setAlertBox({
        open: true,
        title: 'Course Dropped',
        message: 'You have dropped this course. No access is available.',
        type: 'warning'
      });
      return;
    }
    
    // Check payment tracking and grace period
    const paymentTrackingInfo = getPaymentTrackingInfo(cls);
    if (!paymentTrackingInfo.canAccess) {
      if (paymentTrackingInfo.status === 'payment-required') {
        setAlertBox({
          open: true,
          title: 'Payment Required',
          message: 'Payment required - grace period has expired. Please make payment to restore access to this class.',
          type: 'danger'
        });
      } else if (paymentTrackingInfo.status === 'no-payment') {
        setAlertBox({
          open: true,
          title: 'Payment Required',
          message: 'No payment history found. Please make payment to access this class.',
          type: 'danger'
        });
      } else {
        setAlertBox({
          open: true,
          title: 'Access Restricted',
          message: 'Access restricted due to payment issues. Please contact the administrator.',
          type: 'danger'
        });
      }
      return;
    }
    
    if (cls.deliveryMethod === 'online' || cls.deliveryMethod === 'hybrid1' || cls.deliveryMethod === 'hybrid3' || cls.deliveryMethod === 'hybrid4') {
      // Check if recorded video is available - if so, disable zoom
      if (cls.videoUrl) {
        setAlertBox({
          open: true,
          title: 'Recorded Video Available',
          message: 'Recorded video is available for this class. Live zoom sessions are disabled when recorded video is available. Please use the video player for the best learning experience.',
          type: 'info'
        });
        return;
      }
      
      if (cls.zoomLink) {
        // Use secure zoom meeting modal instead of opening link directly
        setSelectedClassForZoom(cls);
        setShowSecureZoomModal(true);
      } else {
        setAlertBox({
          open: true,
          title: 'Zoom Not Available',
          message: 'Zoom link not available for this class.',
          type: 'warning'
        });
      }
    } else {
      setAlertBox({
        open: true,
        title: 'Physical Class',
        message: 'This is a physical class. Please attend at the specified location.',
        type: 'info'
      });
    }
  };

  // Check if class is currently scheduled (within class time window)
  const isClassCurrentlyScheduled = (cls) => {
    if (!cls.schedule || !cls.schedule.day || !cls.schedule.startTime || !cls.schedule.endTime) return false;
    
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today];
    
    // Check if today matches the class day
    if (cls.schedule.day !== todayName) return false;
    
    // Parse class start and end times
    const [startHours, startMinutes] = cls.schedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = cls.schedule.endTime.split(':').map(Number);
    
    const classStartTime = new Date();
    classStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const classEndTime = new Date();
    classEndTime.setHours(endHours, endMinutes, 0, 0);
    
    // Return true if current time is within class time window
    return now >= classStartTime && now <= classEndTime;
  };

  // Calculate video start time based on when student joins
  const getVideoStartTime = (cls) => {
    if (!cls.schedule || !cls.schedule.startTime) return 0;
    
    const now = new Date();
    const [startHours, startMinutes] = cls.schedule.startTime.split(':').map(Number);
    const classStartTime = new Date();
    classStartTime.setHours(startHours, startMinutes, 0, 0);
    
    // Calculate how many seconds have passed since class started
    const secondsPassed = Math.max(0, (now - classStartTime) / 1000);
    
    return Math.floor(secondsPassed);
  };

  // Format time in MM:SS format
  const formatTimeMMSS = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get time until class starts or ends
  const getClassTimeStatus = (cls) => {
    if (!cls.schedule || !cls.schedule.day || !cls.schedule.startTime || !cls.schedule.endTime) return null;
    
    const now = new Date();
    const today = now.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today];
    
    if (cls.schedule.day !== todayName) return null;
    
    const [startHours, startMinutes] = cls.schedule.startTime.split(':').map(Number);
    const [endHours, endMinutes] = cls.schedule.endTime.split(':').map(Number);
    
    const classStartTime = new Date();
    classStartTime.setHours(startHours, startMinutes, 0, 0);
    
    const classEndTime = new Date();
    classEndTime.setHours(endHours, endMinutes, 0, 0);
    
    const timeToStart = (classStartTime - now) / (1000 * 60); // minutes
    const timeToEnd = (classEndTime - now) / (1000 * 60); // minutes
    
    if (timeToStart > 0) {
      if (timeToStart < 60) {
        return `Class starts in ${Math.round(timeToStart)} minutes`;
      } else {
        return `Class starts in ${Math.floor(timeToStart / 60)}h ${Math.round(timeToStart % 60)}m`;
      }
    } else if (timeToEnd > 0) {
      if (timeToEnd < 60) {
        return `Class ends in ${Math.round(timeToEnd)} minutes`;
      } else {
        return `Class ends in ${Math.floor(timeToEnd / 60)}h ${Math.round(timeToEnd % 60)}m`;
      }
    } else {
      return 'Class has ended for today';
    }
  };

  // Handle video viewing
  const handleVideoView = async (cls) => {
    // Check enrollment status first
    if (cls.enrollmentStatus === 'suspended') {
      setAlertBox({
        open: true,
        title: 'Access Suspended',
        message: 'Access to this class has been suspended. Please contact the administrator for more information.',
        type: 'danger'
      });
      return;
    }
    
    if (cls.enrollmentStatus === 'completed') {
      setAlertBox({
        open: true,
        title: 'Course Completed',
        message: 'This course has been completed. No further access is available.',
        type: 'info'
      });
      return;
    }
    
    if (cls.enrollmentStatus === 'dropped') {
      setAlertBox({
        open: true,
        title: 'Course Dropped',
        message: 'You have dropped this course. No access is available.',
        type: 'warning'
      });
      return;
    }
    
    // Check payment tracking and grace period
    const paymentTrackingInfo = getPaymentTrackingInfo(cls);
    if (!paymentTrackingInfo.canAccess) {
      if (paymentTrackingInfo.status === 'payment-required') {
        setAlertBox({
          open: true,
          title: 'Payment Required',
          message: 'Payment required - grace period has expired. Please make payment to restore access to this class.',
          type: 'danger'
        });
      } else if (paymentTrackingInfo.status === 'no-payment') {
        setAlertBox({
          open: true,
          title: 'Payment Required',
          message: 'No payment history found. Please make payment to access this class.',
          type: 'danger'
        });
      } else {
        setAlertBox({
          open: true,
          title: 'Access Restricted',
          message: 'Access restricted due to payment issues. Please contact the administrator.',
          type: 'danger'
        });
      }
      return;
    }
    
    // Check if class has video URL
    if (!cls.videoUrl) {
      setAlertBox({
        open: true,
        title: 'No Video Available',
        message: 'No video available for this class.',
        type: 'warning'
      });
      return;
    }
    
    // Check if delivery method supports video
    if (!['hybrid2', 'hybrid3', 'hybrid4'].includes(cls.deliveryMethod)) {
      setAlertBox({
        open: true,
        title: 'Video Not Supported',
        message: 'This class does not support recorded video content.',
        type: 'warning'
      });
      return;
    }
    
    // Check if class is currently scheduled
    if (!isClassCurrentlyScheduled(cls)) {
      const timeStatus = getClassTimeStatus(cls);
      if (timeStatus) {
        setAlertBox({
          open: true,
          title: 'Video Access Restricted',
          message: `Video access is only available during class time. ${timeStatus}`,
          type: 'warning'
        });
      } else {
        setAlertBox({
          open: true,
          title: 'Video Access Restricted',
          message: 'Video access is only available during scheduled class time.',
          type: 'warning'
        });
      }
      return;
    }
    
    // Track recorded video attendance and clicks
    const userData = getUserData();
    if (userData && userData.userid) {
      try {
        // Prepare data for recorded video attendance tracking
        const classData = {
          id: cls.id,
          name: cls.name || 'Unknown Class'
        };

        // Create modified user data with recorded video method
        const userDataWithMethod = {
          ...userData,
          method: 'recorded_video'  // Override method for recorded video
        };

        // Track attendance for recorded video
        await trackZoomAttendance(userDataWithMethod, classData);

        // Prepare click data for engagement metrics
        const clickData = {
          studentName: userData.name || userData.username || userData.firstName || 'Unknown Student',
          className: cls.name || 'Unknown Class',
          method: 'recorded_video',
          clickType: 'watch_now_button',
          timestamp: new Date().toISOString(),
          browserInfo: navigator.userAgent
        };

        // Track join button click for engagement metrics
        await trackJoinButtonClick(cls.id, userData.userid, clickData);

        console.log('Recorded video attendance and click tracked successfully');
      } catch (error) {
        console.error('Error tracking recorded video attendance/clicks:', error);
        // Don't block video access if tracking fails
      }
    }

    // Open video modal
    setSelectedClassForVideo(cls);
    setShowVideoModal(true);
  };

  // Handle attendance marking
  const handleMarkAttendance = async (cls) => {
    try {
      // Get logged-in user data
      const userData = getUserData();
      if (!userData || !userData.userid) {
        setAlertBox({
          open: true,
          title: 'Authentication Error',
          message: 'No logged-in user found. Please login again.',
          type: 'danger'
        });
      return;
    }

      const studentId = userData.userid;
      
      // Get current time in Asia/Colombo timezone
      const now = new Date();
      const colomboTime = now.toLocaleString('sv-SE', { 
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(' ', 'T');
      
      const today = colomboTime.split('T')[0];
      
      // Create attendance data
      const attendanceData = {
      date: today,
      time: colomboTime,
      status: 'present',
      method: 'manual',
        deliveryMethod: cls.deliveryMethod || 'online',
        studentId: studentId,
        studentName: userData.firstName || userData.fullName || 'Unknown Student'
      };
      
      // Mark attendance using backend API
      const response = await markAttendance(cls.id, studentId, attendanceData);
      
      if (response.success) {
        // Refresh the classes data to show updated attendance
        await loadMyClasses();
        setAlertBox({
          open: true,
          title: 'Success',
          message: 'Attendance marked successfully!',
          type: 'success'
        });
      } else {
        setAlertBox({
          open: true,
          title: 'Error',
          message: response.message || 'Failed to mark attendance',
          type: 'danger'
        });
      }
    } catch (error) {
      setAlertBox({
        open: true,
        title: 'Error',
        message: 'Error marking attendance. Please try again.',
        type: 'danger'
      });
    }
  };

  // Handle forget card request
  const handleForgetCardRequest = (cls) => {
    setSelectedClassForRequest(cls);
    setShowForgetCardModal(true);
  };

  // Submit forget card request
  const submitForgetCardRequest = async () => {
    if (selectedClassForRequest) {
      try {
        // Get logged-in user data
        const userData = getUserData();
        if (!userData || !userData.userid) {
          setAlertBox({
            open: true,
            title: 'Authentication Error',
            message: 'No logged-in user found. Please login again.',
            type: 'danger'
          });
          return;
        }
        
        const studentId = userData.userid;
        
        // Request forget card using backend API
        const response = await requestForgetCard(selectedClassForRequest.id, studentId);
        
        if (response.success) {
          // Refresh the classes data to show updated status
          await loadMyClasses();
      setShowForgetCardModal(false);
          setSelectedClassForRequest(null);
          setAlertBox({
            open: true,
            title: 'Success',
            message: 'Forget card request submitted successfully!',
            type: 'success'
          });
        } else {
          setAlertBox({
            open: true,
            title: 'Error',
            message: response.message || 'Failed to submit forget card request',
            type: 'danger'
          });
        }
      } catch (error) {
        setAlertBox({
          open: true,
          title: 'Error',
          message: 'Error submitting forget card request. Please try again.',
          type: 'danger'
        });
      }
    }
  };

  // Handle late payment request
  const handleLatePaymentRequest = (cls) => {
    setSelectedClassForRequest(cls);
    setShowLatePaymentModal(true);
  };

  // Submit late payment request
  const submitLatePaymentRequest = async () => {
    if (selectedClassForRequest) {
      try {
        // Get logged-in user data
        const userData = getUserData();
        if (!userData || !userData.userid) {
          setAlertBox({
            open: true,
            title: 'Authentication Error',
            message: 'No logged-in user found. Please login again.',
            type: 'danger'
          });
          return;
        }
        
        const studentId = userData.userid;
        
        // Request late payment using backend API
        const response = await requestLatePayment(selectedClassForRequest.id, studentId);
        
        if (response.success) {
          // Refresh the classes data to show updated status
          await loadMyClasses();
      setShowLatePaymentModal(false);
          setSelectedClassForRequest(null);
          setAlertBox({
            open: true,
            title: 'Success',
            message: 'Late payment request submitted successfully! You can attend today\'s class.',
            type: 'success'
          });
        } else {
          setAlertBox({
            open: true,
            title: 'Error',
            message: response.message || 'Failed to submit late payment request',
            type: 'danger'
          });
        }
      } catch (error) {
        setAlertBox({
          open: true,
          title: 'Error',
          message: 'Error submitting late payment request. Please try again.',
          type: 'danger'
        });
      }
    }
  };

  // Handle exam access
  const handleExamAccess = (cls) => {
    if (cls.hasExams) {
      navigate(`/student/exams/${cls.id}`, { state: { class: cls } });
    } else {
      setAlertBox({
        open: true,
        title: 'No Exams Available',
        message: 'No exams available for this class yet.',
        type: 'info'
      });
    }
  };

  // Handle tute access
  const handleTuteAccess = (cls) => {
    if (cls.hasTutes) {
      navigate(`/student/tutes/${cls.id}`, { state: { class: cls } });
    } else {
      setAlertBox({
        open: true,
        title: 'No Tutes Available',
        message: 'No tutes available for this class yet.',
        type: 'info'
      });
    }
  };

  // Handle view schedule
  const handleViewSchedule = (cls) => {
    navigate(`/student/schedule/${cls.id}`, { state: { class: cls } });
  };

  // Handle notifications
  const handleNotifications = (cls) => {
    navigate(`/student/notifications/${cls.id}`, { state: { class: cls } });
  };

  const tabOptions = [
    { key: 'all', label: 'All Classes', icon: <FaEye />, count: myClasses.length },
    { key: 'live', label: 'Live Classes', icon: <FaVideo />, count: myClasses.filter(cls => {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      // Check if delivery method supports online classes
      if (!['online', 'hybrid1', 'hybrid3', 'hybrid4'].includes(cls.deliveryMethod)) return false;
      if (!cls.schedule.day || !cls.schedule.startTime) return false;
      
      const now = new Date();
      const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today];
      
      // Only show classes scheduled for today
      if (cls.schedule.day !== todayName) return false;
      
      // Parse class start time
      const [hours, minutes] = cls.schedule.startTime.split(':').map(Number);
      const classStartTime = new Date();
      classStartTime.setHours(hours, minutes, 0, 0);
      
      // Calculate time difference in minutes
      const timeDiff = (classStartTime - now) / (1000 * 60);
      
      // Show if class starts within 2 hours before or is currently running (within 1 hour of start)
      return timeDiff >= -120 && timeDiff <= 60;
    }).length },
    { key: 'today', label: "Today's Classes", icon: <FaCalendar />, count: myClasses.filter(cls => {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today.getDay()];
      return cls.schedule.day === todayName;
    }).length },
    { key: 'tomorrow', label: "Tomorrow's Classes", icon: <FaCalendarAlt />, count: myClasses.filter(cls => {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const tomorrowName = dayNames[tomorrow.getDay()];
      return cls.schedule.day === tomorrowName;
    }).length },
    { key: 'this-week', label: 'This Week Classes', icon: <FaCalendarWeek />, count: myClasses.filter(cls => {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[today.getDay()];
      return cls.schedule.day === todayName || cls.schedule.frequency === 'weekly';
    }).length },
    { key: 'this-month', label: 'This Month Classes', icon: <FaCalendarAlt />, count: myClasses.filter(cls => {
      if (!cls.schedule || cls.schedule.frequency === 'no-schedule') return false;
      return cls.schedule.frequency === 'weekly' || cls.schedule.frequency === 'bi-weekly' || cls.schedule.frequency === 'monthly';
    }).length },
    { key: 'no-schedule', label: 'No Schedule Classes', icon: <FaClock />, count: myClasses.filter(cls => {
      return cls.schedule && cls.schedule.frequency === 'no-schedule';
    }).length },
    { key: 'payment-due', label: 'Payment Due Classes', icon: <FaExclamationTriangle />, count: myClasses.filter(cls => {
      // Check if payment is due from month start to paid day
      if (!cls.nextPaymentDate) return false;
      
      const nextPayment = new Date(cls.nextPaymentDate);
      const today = new Date();
      
      // Check if payment is overdue
      if (nextPayment <= today && cls.paymentStatus !== 'paid') return true;
      
      // Check if it's a monthly payment and we're in the payment period
      if (cls.paymentTracking && (cls.paymentTracking.enabled || cls.paymentTracking === true)) {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const paymentDay = new Date(cls.nextPaymentDate);
        
        // If we're between month start and payment day, and payment status is not paid
        if (today >= monthStart && today <= paymentDay && cls.paymentStatus !== 'paid') {
          return true;
        }
      }
      
      return false;
    }).length }
  ];

  const handleRefresh = async () => {
    await loadMyClasses();
  };

  if (loading) {
    return (
      <DashboardLayout
        userRole="Student"
        sidebarItems={studentSidebarSections}
        onLogout={onLogout}
      >
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your classes...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        userRole="Student"
        sidebarItems={studentSidebarSections}
        onLogout={onLogout}
      >
        <div className="p-6 text-center">
          <div className="text-red-600 mb-4">
            <FaExclamationCircle className="text-4xl mx-auto mb-2" />
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700"
          >
            Refresh Page
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userRole="Student"
      sidebarItems={studentSidebarSections}
      onLogout={onLogout}
    >
      <div className="p-2 sm:p-4 md:p-6">
        {/* Header with Stats */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 text-center">
            {selectedTab === 'live' ? (
              <>
                Live Classes - Today's Online Classes
              </>
            ) : selectedTab === 'today' ? (
              <>
                Today's Classes - {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </>
            ) : selectedTab === 'tomorrow' ? (
              <>
                Tomorrow's Classes - {(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                })()}
              </>
            ) : selectedTab === 'this-week' ? (
              'This Week\'s Classes'
            ) : selectedTab === 'this-month' ? (
              'This Month\'s Classes'
            ) : selectedTab === 'no-schedule' ? (
              'No Schedule Classes'
            ) : selectedTab === 'payment-due' ? (
              'Payment Due Classes'
            ) : (
              'My Classes'
            )}
          </h1>
          {selectedTab === 'live' && (
            <p className="text-center text-gray-600 mb-4">
              Shows online classes scheduled for today within 2 hours before start time
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{myClasses.length}</div>
              <div className="text-sm text-blue-700">Total Classes</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {myClasses.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm text-green-700">Active Classes</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {myClasses.filter(c => {
                  const paymentInfo = getPaymentTrackingInfo(c);
                  // Payment is due if: grace period expired OR payment required status
                  return paymentInfo.status === 'payment-required' || 
                         paymentInfo.status === 'no-payment' ||
                         (!paymentInfo.canAccess && paymentInfo.status !== 'no-tracking');
                }).length}
              </div>
              <div className="text-sm text-yellow-700">Payment Due</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {myClasses.filter(c => {
                  // Parse payment tracking to check if it's enabled
                  let hasPaymentTracking = false;
                  try {
                    if (typeof c.paymentTracking === 'string') {
                      const parsed = JSON.parse(c.paymentTracking);
                      hasPaymentTracking = parsed.enabled === true;
                    } else if (typeof c.paymentTracking === 'object' && c.paymentTracking !== null) {
                      hasPaymentTracking = c.paymentTracking.enabled === true;
                    } else {
                      hasPaymentTracking = c.paymentTracking === true;
                    }
                  } catch (e) {
                    hasPaymentTracking = false;
                  }
                  return hasPaymentTracking;
                }).length}
              </div>
              <div className="text-sm text-purple-700">Payment Tracking</div>
            </div>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search classes by name, subject, teacher, or stream..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="name">Sort by Name</option>
              <option value="purchased-date">Sort by Purchased Date</option>
              <option value="payment-due">Sort by Payment Due</option>
              <option value="status">Sort by Priority</option>
            </select>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              title="Refresh My Classes Data"
            >
              <FaSync /> Refresh Data
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {tabOptions.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 border-2 flex items-center gap-2
                ${selectedTab === tab.key
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-md'
                  : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}
              `}
              onClick={() => setSelectedTab(tab.key)}
            >
              {tab.icon} {tab.label}
              <span className="bg-white text-cyan-600 px-2 py-1 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 gap-y-8">
          {filteredAndSortedClasses.length > 0 ? (
            filteredAndSortedClasses.map((cls) => {
              const paymentStatus = getPaymentStatusInfo(cls);
              const deliveryInfo = getDeliveryMethodInfo(cls.deliveryMethod);
              const courseTypeInfo = getCourseTypeInfo(cls.courseType);
              const classStatus = getClassStatusInfo(cls.status);
              const priority = getClassPriority(cls);
              const paymentTrackingInfo = getPaymentTrackingInfo(cls);
              const nextPaymentDate = cls.nextPaymentDate ? new Date(cls.nextPaymentDate) : null;
              const today = new Date();
              const isPaymentDue = nextPaymentDate && nextPaymentDate <= today && cls.paymentStatus !== 'paid';
              const canAttendToday = paymentTrackingInfo.canAccess && cls.enrollmentStatus === 'active';
              const isInactive = cls.status === 'inactive'; // Class status (controlled by admin)
              const isSuspended = cls.enrollmentStatus === 'suspended'; // Enrollment status
              const isCompleted = cls.enrollmentStatus === 'completed'; // Enrollment status
              const isDropped = cls.enrollmentStatus === 'dropped'; // Enrollment status
              
              const scheduleText = cls.schedule && cls.schedule.frequency === 'no-schedule' ? 
                'No Schedule' :
                cls.schedule && cls.schedule.day && cls.schedule.startTime && cls.schedule.endTime ?
                `${formatDay(cls.schedule.day)} ${formatTime(cls.schedule.startTime)}-${formatTime(cls.schedule.endTime)}` : 
                'Schedule not set';

              // Get time until class starts for live classes
              const timeUntilClass = selectedTab === 'live' ? getTimeUntilClass(cls) : null;

              return (
              <BasicCard
                  key={cls.id}
                  title={
                    <div>
                      <span className="text-sm font-semibold">{cls.className}</span>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <FaUser className="text-gray-400" />
                        {cls.teacher}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        {courseTypeInfo.icon}
                        <strong>Course Type:</strong> {courseTypeInfo.text}
                      </div>
                    </div>
                  }
                  price={
                    (() => {
                      const paymentInfo = getPaymentTrackingInfo(cls);
                      const baseFee = parseFloat(cls.fee || cls.total_fee || 0);
                      const actualFee = parseFloat(cls.total_fee || cls.fee || 0);
                      
                      // Free Card
                      if (paymentInfo.isFreeCard) {
                        return (
                          <div className="text-xs font-semibold">
                            <div className="line-through text-gray-400">LKR {baseFee.toLocaleString()}</div>
                            <div className="text-purple-700">FREE</div>
                          </div>
                        );
                      }
                      
                      // Half Card
                      if (paymentInfo.isHalfCard) {
                        const halfFee = Math.round(actualFee / 2);
                        return (
                          <div className="text-xs font-semibold">
                            <div className="line-through text-gray-400">LKR {baseFee.toLocaleString()}</div>
                            <div className="text-blue-700">LKR {halfFee.toLocaleString()}</div>
                          </div>
                        );
                      }
                      
                      // Discounted Price
                      if (baseFee !== actualFee) {
                        return (
                          <div className="text-xs font-semibold">
                            <div className="line-through text-gray-400">LKR {baseFee.toLocaleString()}</div>
                            <div className="text-green-700">LKR {actualFee.toLocaleString()}</div>
                          </div>
                        );
                      }
                      
                      // Regular Price
                      return (
                        <div className="text-xs font-semibold text-green-600">
                          <div>LKR {actualFee.toLocaleString()}</div>
                        </div>
                      );
                    })()
                  }
                  image={getClassImage(cls.subject)}
                  className={selectedTab === 'live' ? 'border-2 border-red-500 bg-red-50' : ''}
                  description={
                    <div className="text-xs text-gray-600 space-y-1.5">
                      {/* Live Class Alert */}
                      {timeUntilClass && (
                        <div className="bg-red-500 text-white p-2 rounded-lg text-center animate-pulse mb-2">
                          <div className="flex items-center justify-center gap-2 font-bold text-xs">
                            <FaClock />
                            <span>{timeUntilClass}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Critical Alerts */}
                      {isSuspended && (
                        <div className="bg-orange-50 border-l-2 border-orange-500 p-2 rounded mb-2">
                          <div className="flex items-center gap-2 text-orange-700 text-xs font-semibold">
                            <FaExclamationTriangle />
                            <span>Suspended - Contact Admin</span>
                          </div>
                        </div>
                      )}
                      
                      {!paymentTrackingInfo.canAccess && paymentTrackingInfo.status === 'payment-required' && (
                        <div className="bg-red-50 border-l-2 border-red-500 p-2 rounded mb-2">
                          <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
                            <FaExclamationTriangle />
                            <span>Payment Required</span>
                          </div>
                        </div>
                      )}
                      
                      {paymentTrackingInfo.canAccess && paymentTrackingInfo.daysRemaining <= 3 && paymentTrackingInfo.daysRemaining > 0 && paymentTrackingInfo.paymentTrackingEnabled && (
                        <div className="bg-yellow-50 border-l-2 border-yellow-500 p-2 rounded mb-2">
                          <div className="flex items-center gap-2 text-yellow-700 text-xs font-semibold">
                            <FaClock />
                            <span>{paymentTrackingInfo.daysRemaining} Days Left</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Stream & Subject */}
                      <div className="flex items-center gap-1">
                        <FaGraduationCap className="text-gray-400" />
                        <strong>Stream:</strong> {cls.stream}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <FaBook className="text-gray-400" />
                        <strong>Subject:</strong> {cls.subject}
                      </div>
                      
                      {/* Schedule */}
                      <div className="flex items-center gap-1">
                        <FaCalendar className="text-gray-400" />
                        <strong>Schedule:</strong> {scheduleText}
                      </div>
                      
                      {/* Next Payment */}
                      <div className="flex items-center gap-1">
                        <FaMoneyBill className="text-gray-400" />
                        <strong>Next Payment:</strong> {paymentTrackingInfo.nextPaymentDate ? paymentTrackingInfo.nextPaymentDate.toLocaleDateString() : 'Not set'}
                      </div>
                      
                      {/* Delivery Method */}
                      <div className="flex items-center gap-1">
                        <span className={deliveryInfo.color}>{deliveryInfo.icon}</span>
                        <strong>Delivery:</strong> {deliveryInfo.text}
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${paymentStatus.bgColor} ${paymentStatus.color} border ${paymentStatus.borderColor}`}>
                          {paymentStatus.icon}
                          <span>{paymentStatus.text}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${classStatus.bgColor} ${classStatus.color} border ${classStatus.borderColor}`}>
                          {classStatus.icon}
                          <span>{classStatus.text}</span>
                        </span>
                        
                        {/* Join Button */}
                                            <button
                                              onClick={() => handleJoinClass(cls)}
                                              disabled={isSuspended || isCompleted || isDropped || !paymentTrackingInfo.canAccess || cls.videoUrl || cls.status === 'inactive'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                                                isSuspended || isCompleted || isDropped || !paymentTrackingInfo.canAccess || cls.videoUrl || cls.status === 'inactive'
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title={
                            isSuspended ? 'Access suspended' :
                            isCompleted ? 'Course completed' :
                            isDropped ? 'Course dropped' :
                                                !paymentTrackingInfo.canAccess ? 'Payment required' :
                                                cls.videoUrl ? 'Video only' :
                                                cls.status === 'inactive' ? 'Class inactive' :
                                                'Join class'
                          }
                        >
                          <FaPlay className="text-xs" /> 
                                              {isSuspended ? 'Suspended' : 
                           isCompleted ? 'Completed' : 
                           isDropped ? 'Dropped' : 
                           !paymentTrackingInfo.canAccess ? 'Pay' :
                                               cls.videoUrl ? 'Video' :
                                               cls.status === 'inactive' ? 'Inactive' :
                                               'Join'}
                        </button>
                      </div>
                      
                      {/* Additional Features */}
                      {(cls.zoomLink || cls.videoUrl || cls.hasTutes) && (
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          {cls.zoomLink && (cls.deliveryMethod === 'online' || cls.deliveryMethod === 'hybrid1' || cls.deliveryMethod === 'hybrid3' || cls.deliveryMethod === 'hybrid4') && !cls.videoUrl && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <FaVideo />
                              <span>Zoom</span>
                            </div>
                          )}
                          {cls.videoUrl && (cls.deliveryMethod === 'hybrid2' || cls.deliveryMethod === 'hybrid3' || cls.deliveryMethod === 'hybrid4') && (
                            <div className="flex items-center gap-1 text-green-600">
                              <FaVideo />
                              <span>{isClassCurrentlyScheduled(cls) ? 'Live Now' : 'Recording'}</span>
                            </div>
                          )}
                          {cls.hasTutes && (
                            <div className="flex items-center gap-1 text-purple-600">
                              <FaBook />
                              <span>Materials</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  }
                  buttonText="View Details"
                  onButtonClick={() => handleViewDetails(cls)}
                  buttonDisabled={isSuspended || isDropped || !paymentTrackingInfo.canAccess || cls.status === 'inactive'}
                >
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2.5 mt-4">
                      {/* Payment Button - Show when grace period expired OR payment is due */}
                      {((!paymentTrackingInfo.canAccess && (paymentTrackingInfo.status === 'payment-required' || paymentTrackingInfo.status === 'no-payment')) || 
                        (paymentTrackingInfo.canAccess && paymentTrackingInfo.nextPaymentDate && new Date() >= paymentTrackingInfo.nextPaymentDate)) && (
                        <button
                          onClick={() => handleMakePayment(cls)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-md ${
                            !paymentTrackingInfo.canAccess 
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:scale-105 active:scale-100' 
                              : paymentTrackingInfo.daysRemaining <= 3
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 hover:shadow-lg hover:scale-105 active:scale-100'
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:scale-105 active:scale-100'
                          }`}
                          title={
                            paymentTrackingInfo.isLatePay
                              ? 'Late pay permission granted for today - Make payment for continued access'
                              : !paymentTrackingInfo.canAccess 
                              ? 'Make payment to restore access' 
                              : paymentTrackingInfo.daysRemaining <= 3
                              ? 'Make payment to extend grace period'
                              : 'Make payment to renew for next month'
                          }
                        >
                          <FaMoneyBill className="text-xs" /> 
                          {paymentTrackingInfo.isLatePay
                            ? 'Late Pay - Payment Due'
                            : !paymentTrackingInfo.canAccess 
                            ? 'Make Payment' 
                            : paymentTrackingInfo.daysRemaining <= 3 
                            ? 'Pay Early' 
                            : 'Renew Payment'
                          }
                        </button>
                      )}
                      
                      {/* Watch Video Button - Show for classes with video URLs */}
                      {cls.videoUrl && (cls.deliveryMethod === 'hybrid2' || cls.deliveryMethod === 'hybrid3' || cls.deliveryMethod === 'hybrid4') && (
                        <button
                          onClick={() => handleVideoView(cls)}
                          disabled={isSuspended || isCompleted || isDropped || !paymentTrackingInfo.canAccess || !isClassCurrentlyScheduled(cls)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-md ${
                            isSuspended || isCompleted || isDropped || !paymentTrackingInfo.canAccess || !isClassCurrentlyScheduled(cls)
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                              : isClassCurrentlyScheduled(cls)
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 animate-pulse hover:shadow-lg'
                              : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-lg hover:scale-105 active:scale-100'
                          }`}
                          title={
                            isSuspended ? 'Access suspended - contact admin' :
                            isCompleted ? 'Course completed' :
                            isDropped ? 'Course dropped' :
                            !paymentTrackingInfo.canAccess ? 'Payment required - grace period expired' :
                            !isClassCurrentlyScheduled(cls) ? `Video access only during class time. ${getClassTimeStatus(cls) || 'Not scheduled for today'}` :
                            'Watch live video now!'
                          }
                        >
                          <FaVideo className="text-xs" /> 
                          {isSuspended ? 'Suspended' : 
                           isCompleted ? 'Completed' : 
                           isDropped ? 'Dropped' : 
                           !paymentTrackingInfo.canAccess ? 'Payment Required' :
                           !isClassCurrentlyScheduled(cls) ? 'Not Available' :
                           '🕐 Watch Now'}
                        </button>
                      )}
                  </div>
                </BasicCard>
              );
            })
          ) : (
            <div className="text-center text-gray-500 col-span-full mt-8">
              {selectedTab === 'all' && !searchTerm ? 'You have not purchased any classes yet.' : 
               selectedTab === 'live' ? (
                 <div>
                   <div>No live classes starting soon.</div>
                   <div className="text-sm mt-2">
                     Live tab shows online classes scheduled for today within 2 hours before start time.
                   </div>
                   <div className="text-sm mt-1">
                     Try the "Today's Classes" tab to see all classes scheduled for today.
                   </div>
                 </div>
               ) :
               selectedTab === 'today' ? 'No classes scheduled for today.' :
               selectedTab === 'tomorrow' ? 'No classes scheduled for tomorrow.' :
               selectedTab === 'this-week' ? 'No classes scheduled for this week.' :
               selectedTab === 'this-month' ? 'No classes scheduled for this month.' :
               selectedTab === 'no-schedule' ? 'No classes without schedule.' :
               selectedTab === 'payment-due' ? 'No payment due classes.' :
               `No ${selectedTab} classes found.`}
              {searchTerm && <div className="mt-2">Try adjusting your search terms.</div>}
            </div>
          )}
        </div>

        {/* Forget Card Modal */}
        {showForgetCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Request Forget Card</h3>
              <p className="text-gray-700 mb-4 text-base">
                You are requesting a forget card for: <strong className="text-blue-700">{selectedClassForRequest?.className}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                This will allow you to attend the class even if you forgot your ID card.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={submitForgetCardRequest}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-100"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowForgetCardModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Late Payment Modal */}
        {showLatePaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Request Late Payment</h3>
              <p className="text-gray-700 mb-4 text-base">
                You are requesting late payment for: <strong className="text-orange-700">{selectedClassForRequest?.className}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-6 bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
                This will allow you to attend today's class without immediate payment.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={submitLatePaymentRequest}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-5 py-3 rounded-xl font-semibold hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-100"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowLatePaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-5 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Secure Zoom Meeting Modal */}
        {showSecureZoomModal && selectedClassForZoom && (
          <SecureZoomMeeting
            zoomLink={selectedClassForZoom.zoomLink}
            className={selectedClassForZoom.className}
            onClose={() => {
              setShowSecureZoomModal(false);
              setSelectedClassForZoom(null);
            }}
            isOpen={showSecureZoomModal}
            classData={selectedClassForZoom}
            enableNewWindowJoin={(() => {
              const value = Boolean(selectedClassForZoom.enableNewWindowJoin);
              console.log('MyClasses - enableNewWindowJoin:', selectedClassForZoom.enableNewWindowJoin, '->', value);
              return value;
            })()}
            enableOverlayJoin={(() => {
              const value = Boolean(selectedClassForZoom.enableOverlayJoin);
              console.log('MyClasses - enableOverlayJoin:', selectedClassForZoom.enableOverlayJoin, '->', value);
              return value;
            })()}
          />
        )}

        {/* Video Player Modal */}
        {showVideoModal && selectedClassForVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FaVideo className="text-2xl" />
                    <div>
                      <h2 className="text-2xl font-bold">Live Class Video</h2>
                      <p className="text-green-100">{selectedClassForVideo.className} • {selectedClassForVideo.subject}</p>
                      <div className="text-yellow-200 text-sm mt-1">
                        🕐 Currently Scheduled: {selectedClassForVideo.schedule?.day} {selectedClassForVideo.schedule?.startTime}-{selectedClassForVideo.schedule?.endTime}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowVideoModal(false);
                      setSelectedClassForVideo(null);
                    }}
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
                      This video is protected. Recording, downloading, or screen capture is prohibited and may result in disciplinary action.
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Player with Student Overlay */}
              <div className="p-6">
                <div className="bg-black rounded-lg overflow-hidden aspect-video relative">
                  {/* Student Identification Overlay */}
                  <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-mono">
                    <div>Student ID: {getUserData()?.userid || 'Unknown'}</div>
                    <div>Name: {getUserData()?.firstName || getUserData()?.fullName || getUserData()?.name || 'Ba'} {getUserData()?.lastName || 'Rathnayake'}</div>
                    <div>Class: {selectedClassForVideo.className}</div>
                    <div>Time: {new Date().toLocaleString()}</div>
                    <div>Video Start: {formatTimeMMSS(getVideoStartTime(selectedClassForVideo))}</div>
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
                  

                  
                  {/* Anti-Cheat Overlay */}
                  <div className="absolute top-4 right-4 z-10 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                    TCMS SECURED
                  </div>
                  
                  {/* Maximize Window Button */}
                  <div className="absolute bottom-4 left-4 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const videoContainer = e.target.parentElement.parentElement;
                        const isMaximized = videoContainer.classList.contains('maximized');
                        
                        if (!isMaximized) {
                          // Maximize
                          videoContainer.classList.add('maximized');
                          videoContainer.style.position = 'fixed';
                          videoContainer.style.top = '0';
                          videoContainer.style.left = '0';
                          videoContainer.style.width = '100vw';
                          videoContainer.style.height = '100vh';
                          videoContainer.style.zIndex = '9999';
                          videoContainer.style.backgroundColor = 'black';
                          videoContainer.style.borderRadius = '0';
                          e.target.innerHTML = '⛶ Exit Maximize';
                          e.target.title = 'Click to exit maximize mode (or press ESC)';
                        } else {
                          // Exit maximize
                          videoContainer.classList.remove('maximized');
                          videoContainer.style.position = 'relative';
                          videoContainer.style.top = '';
                          videoContainer.style.left = '';
                          videoContainer.style.width = '';
                          videoContainer.style.height = '';
                          videoContainer.style.zIndex = '';
                          videoContainer.style.backgroundColor = '';
                          videoContainer.style.borderRadius = '';
                          e.target.innerHTML = '⛶ Maximize Window';
                          e.target.title = 'Click to maximize video window';
                        }
                      }}
                      className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-opacity-90 transition-all maximize-button"
                      title="Click to maximize video window"
                    >
                      ⛶ Maximize Window
                    </button>
                  </div>
                  
                  {/* Countdown Timer */}
                  {videoTimeRemaining !== null && (
                    <div className="absolute bottom-4 right-4 z-10 bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-bold">
                      ⏰ {Math.floor(videoTimeRemaining / 60)}:{(videoTimeRemaining % 60).toString().padStart(2, '0')} remaining
                    </div>
                  )}
                  
                  <video
                    autoPlay
                    className="w-full h-full"
                    src={selectedClassForVideo.videoUrl}
                    poster="/assets/video-poster.jpg"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onSeeked={(e) => e.preventDefault()}
                    onSeeking={(e) => e.preventDefault()}
                    onRateChange={(e) => e.preventDefault()}
                    onVolumeChange={(e) => e.preventDefault()}
                    style={{
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    onLoadedMetadata={(e) => {
                      // Set video to start from the appropriate time
                      const startTime = getVideoStartTime(selectedClassForVideo);
                      if (startTime > 0) {
                        e.target.currentTime = startTime;
                      }
                      // Auto-play the video with audio
                      e.target.play().catch(err => {
                        console.log('Auto-play prevented by browser, user interaction required');
                        // If auto-play fails, show a message to click to start
                        const videoContainer = e.target.parentElement;
                        const playMessage = document.createElement('div');
                        playMessage.className = 'absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center text-white text-lg font-bold cursor-pointer';
                        playMessage.innerHTML = 'Click to Start Video';
                        playMessage.onclick = () => {
                          e.target.play();
                          playMessage.remove();
                        };
                        videoContainer.appendChild(playMessage);
                      });
                    }}
                    onPlay={(e) => {
                      // Ensure video stays at normal speed
                      e.target.playbackRate = 1.0;
                    }}
                    onPause={(e) => {
                      // Prevent pausing - resume immediately
                      if (!e.target.ended) {
                        e.target.play().catch(err => {
                          console.log('Resume prevented by browser');
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent keyboard shortcuts
                      e.preventDefault();
                    }}
                    onKeyUp={(e) => {
                      // Prevent keyboard shortcuts
                      e.preventDefault();
                    }}
                    onKeyPress={(e) => {
                      // Prevent keyboard shortcuts
                      e.preventDefault();
                    }}

                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                {/* Video Information */}
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Class Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Class:</strong> {selectedClassForVideo.className}</div>
                      <div><strong>Subject:</strong> {selectedClassForVideo.subject}</div>
                      <div><strong>Teacher:</strong> {selectedClassForVideo.teacher}</div>
                      <div><strong>Stream:</strong> {selectedClassForVideo.stream}</div>
                      <div><strong>Schedule:</strong> {selectedClassForVideo.schedule?.day} {selectedClassForVideo.schedule?.startTime}-{selectedClassForVideo.schedule?.endTime}</div>
                      <div><strong>Delivery Method:</strong> {getDeliveryMethodInfo(selectedClassForVideo.deliveryMethod).text}</div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Security & Access Information</h3>
                    <ul className="text-sm space-y-2 text-gray-700">
                      <li>• Video access is restricted to scheduled class time only</li>
                      <li>• Your student ID and name are displayed on the video for security</li>
                      <li>• Recording, downloading, or screen capture is strictly prohibited</li>
                      <li>• Video plays like a live stream - no pause, seek, or speed controls</li>
                      <li>• Video automatically starts and plays at normal speed with audio</li>
                      <li>• Use maximize window button for better viewing experience</li>
                      <li>• Violations may result in immediate suspension of video access</li>
                      <li>• Video will automatically stop when class time ends</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Video Timing Information</h3>
                    <div className="text-sm space-y-2 text-gray-700">
                      <div className="flex items-center gap-2">
                        <FaClock className="text-green-600" />
                        <span><strong>Class Schedule:</strong> {selectedClassForVideo.schedule?.day} {selectedClassForVideo.schedule?.startTime}-{selectedClassForVideo.schedule?.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaVideo className="text-green-600" />
                        <span><strong>Video Start Time:</strong> {formatTimeMMSS(getVideoStartTime(selectedClassForVideo))} (based on when you joined)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaPlay className="text-green-600" />
                        <span><strong>Playback:</strong> Auto-play at normal speed (1x) - no controls available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaExpand className="text-green-600" />
                        <span><strong>Maximize Window:</strong> Click maximize button for better viewing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaInfoCircle className="text-blue-600" />
                        <span><strong>Note:</strong> Video plays like a live stream from when you joined the class session</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Class Details Modal */}
        {showDetailsModal && selectedClassForDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={getClassImage(selectedClassForDetails.subject)} 
                      alt={selectedClassForDetails.subject}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <h2 className="text-2xl font-bold">{selectedClassForDetails.className}</h2>
                      <p className="text-blue-100">{selectedClassForDetails.subject} • {selectedClassForDetails.teacher}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <FaTimesCircle size={24} />
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-8 px-6 overflow-x-auto" style={{
                  scrollbarWidth: 'none', /* Firefox */
                  msOverflowStyle: 'none', /* Internet Explorer 10+ */
                  WebkitScrollbar: { display: 'none' } /* Safari and Chrome */
                }}>
                  {[
                    { id: 'overview', label: 'Overview', icon: <FaInfoCircle /> },
                    { id: 'schedule', label: 'Schedule', icon: <FaCalendar /> },
                    { id: 'payments', label: 'Payments', icon: <FaMoneyBill /> },
                    { id: 'materials', label: 'Materials', icon: <FaFileAlt /> },
                    { id: 'recordings', label: 'Recordings', icon: <FaVideo /> },
                    { id: 'attendance', label: 'Attendance', icon: <FaCheckCircle /> },
                    { id: 'payment-tracking', label: 'Payment Tracking', icon: <FaShieldAlt /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailsActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                        detailsActiveTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {detailsActiveTab === 'overview' && (
                  <div className="space-y-6">
                                         {/* Payment Status Alert */}
                     {(() => {
                       const paymentInfo = getPaymentTrackingInfo(selectedClassForDetails);
                       return (
                         <>
                           {!paymentInfo.canAccess && (
                             <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                               <div className="flex items-center gap-3">
                                 <FaExclamationTriangle className="text-red-600 text-xl" />
                                 <div>
                                   <div className="font-semibold text-red-700 text-lg">Access Restricted</div>
                                   <div className="text-red-600">{paymentInfo.message}</div>
                                   <div className="text-sm text-red-500 mt-1">
                                     Please make payment to restore access to this class.
                                   </div>
                                 </div>
                               </div>
                             </div>
                           )}
                           
                           {paymentInfo.status === 'free-period' && (
                             <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                               <div className="flex items-center gap-3">
                                 <FaCheckCircle className="text-green-600 text-xl" />
                                 <div>
                                   <div className="font-semibold text-green-700 text-lg">Free Access Granted</div>
                                   <div className="text-green-600">{paymentInfo.message}</div>
                                   <div className="text-sm text-green-500 mt-1">
                                     You can access this class during the free period.
                                   </div>
                                 </div>
                               </div>
                             </div>
                           )}
                         </>
                       );
                     })()}

                     {/* Quick Stats */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-blue-50 p-4 rounded-lg">
                         <div className="flex items-center gap-2 text-blue-600 mb-2">
                           <FaCalendar /> <span className="font-semibold">Next Class</span>
                         </div>
                         <p className="text-lg font-bold">
                           {selectedClassForDetails.schedule?.frequency === 'no-schedule' ? 
                             'No Schedule' :
                             `${formatDay(selectedClassForDetails.schedule?.day)} ${formatTime(selectedClassForDetails.schedule?.startTime)}`
                           }
                         </p>
                       </div>
                       <div className="bg-green-50 p-4 rounded-lg">
                         <div className="flex items-center gap-2 text-green-600 mb-2">
                           <FaMoneyBill /> <span className="font-semibold">Payment Status</span>
                         </div>
                         <p className="text-lg font-bold">{getPaymentTrackingInfo(selectedClassForDetails).message}</p>
                       </div>
                       <div className="bg-purple-50 p-4 rounded-lg">
                         <div className="flex items-center gap-2 text-purple-600 mb-2">
                           <FaUsers /> <span className="font-semibold">Class Status</span>
                         </div>
                         <p className="text-lg font-bold">{getClassStatusInfo(selectedClassForDetails.status).text}</p>
                       </div>
                     </div>

                    {/* Class Information */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaBook /> Class Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>Stream:</strong> {selectedClassForDetails.stream}</div>
                        <div><strong>Course Type:</strong> {getCourseTypeInfo(selectedClassForDetails.courseType).text}</div>
                        <div><strong>Delivery Method:</strong> {getDeliveryMethodInfo(selectedClassForDetails.deliveryMethod).text}</div>
                        {selectedClassForDetails.zoomLink && (selectedClassForDetails.deliveryMethod === 'online' || selectedClassForDetails.deliveryMethod === 'hybrid1' || selectedClassForDetails.deliveryMethod === 'hybrid3' || selectedClassForDetails.deliveryMethod === 'hybrid4') && !selectedClassForDetails.videoUrl && (
                          <div><strong>Zoom Link:</strong> <span className="text-blue-600">Available</span></div>
                        )}
                        {selectedClassForDetails.videoUrl && (selectedClassForDetails.deliveryMethod === 'hybrid2' || selectedClassForDetails.deliveryMethod === 'hybrid3' || selectedClassForDetails.deliveryMethod === 'hybrid4') && (
                          <div><strong>Recorded Video:</strong> <span className="text-green-600">Available</span></div>
                        )}
                        <div><strong>Students:</strong> {selectedClassForDetails.currentStudents || 0}/{selectedClassForDetails.maxStudents}</div>
                        <div><strong>Fee:</strong> LKR {selectedClassForDetails.fee?.toLocaleString()}</div>
                        <div><strong>Purchase Date:</strong> {new Date(selectedClassForDetails.purchaseDate).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Video Information Section */}
                    {selectedClassForDetails.videoUrl && (selectedClassForDetails.deliveryMethod === 'hybrid2' || selectedClassForDetails.deliveryMethod === 'hybrid3' || selectedClassForDetails.deliveryMethod === 'hybrid4') && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                          <FaVideo className="text-green-600" /> Recorded Video Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div><strong>Video Status:</strong> <span className="text-green-600">Available</span></div>
                          <div><strong>Access Time:</strong> {selectedClassForDetails.schedule?.day} {selectedClassForDetails.schedule?.startTime}-{selectedClassForDetails.schedule?.endTime}</div>
                          <div><strong>Current Status:</strong> {isClassCurrentlyScheduled(selectedClassForDetails) ? <span className="text-green-600">🕐 Available Now</span> : <span className="text-gray-600">Not Available Yet</span>}</div>
                          <div><strong>Next Available:</strong> {getClassTimeStatus(selectedClassForDetails) || 'Not scheduled for today'}</div>
                        </div>
                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                          <div className="text-sm text-gray-700">
                            <strong>Video Access Rules:</strong>
                            <ul className="mt-1 space-y-1">
                              <li>• Video is only accessible during scheduled class time</li>
                              <li>• Video starts from when you join the class session</li>
                              <li>• Video plays like a live stream - no pause, seek, or speed controls</li>
                              <li>• Video automatically starts and plays at normal speed with audio</li>
                              <li>• Use maximize window button for better viewing experience</li>
                              <li>• Recording or downloading is strictly prohibited</li>
                              <li>• Video automatically stops when class time ends</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                                         {/* Quick Actions */}
                     <div className="bg-blue-50 p-6 rounded-lg">
                       <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                         <FaPlay /> Quick Actions
                       </h3>
                       <div className="flex flex-wrap gap-2">
                         {(() => {
                           const paymentInfo = getPaymentTrackingInfo(selectedClassForDetails);
                           return (
                             <>
                               {/* Payment Status Alert */}
                               {!paymentInfo.canAccess && (
                                 <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                   <div className="flex items-center gap-2 text-red-700">
                                     <FaExclamationTriangle />
                                     <span className="font-semibold">Access Restricted</span>
                                   </div>
                                   <p className="text-sm text-red-600 mt-1">{paymentInfo.message}</p>
                                 </div>
                               )}
                               
                               {/* Join Class Button - Only if access is granted and no recorded video available */}
                               {(selectedClassForDetails.deliveryMethod === 'online' || selectedClassForDetails.deliveryMethod === 'hybrid1' || selectedClassForDetails.deliveryMethod === 'hybrid3' || selectedClassForDetails.deliveryMethod === 'hybrid4') && selectedClassForDetails.zoomLink && !selectedClassForDetails.videoUrl && paymentInfo.canAccess && (
                                 <button
                                   onClick={() => {
                                     setShowDetailsModal(false);
                                     setSelectedClassForZoom(selectedClassForDetails);
                                     setShowSecureZoomModal(true);
                                   }}
                                   className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                 >
                                   <FaVideo /> Join Class
                                 </button>
                               )}
                               
                               {/* Recorded Video Available Message */}
                               {selectedClassForDetails.videoUrl && (selectedClassForDetails.deliveryMethod === 'hybrid2' || selectedClassForDetails.deliveryMethod === 'hybrid3' || selectedClassForDetails.deliveryMethod === 'hybrid4') && (
                                 <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                   <div className="flex items-center gap-2 text-green-700">
                                     <FaVideo />
                                     <span className="font-semibold">Recorded Video Available</span>
                                   </div>
                                   <p className="text-sm text-green-600 mt-1">Live zoom sessions are disabled when recorded video is available. Use the video player for the best learning experience.</p>
                                 </div>
                               )}
                               
                               {/* Watch Video Button - Only if access is granted and video is available */}
                               {selectedClassForDetails.videoUrl && (selectedClassForDetails.deliveryMethod === 'hybrid2' || selectedClassForDetails.deliveryMethod === 'hybrid3' || selectedClassForDetails.deliveryMethod === 'hybrid4') && paymentInfo.canAccess && (
                                 <button
                                   onClick={() => {
                                     setShowDetailsModal(false);
                                     setSelectedClassForVideo(selectedClassForDetails);
                                     setShowVideoModal(true);
                                   }}
                                   disabled={!isClassCurrentlyScheduled(selectedClassForDetails)}
                                   className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                                     !isClassCurrentlyScheduled(selectedClassForDetails)
                                       ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                       : 'bg-green-600 text-white hover:bg-green-700'
                                   }`}
                                   title={
                                     !isClassCurrentlyScheduled(selectedClassForDetails) 
                                       ? `Video access only during class time. ${getClassTimeStatus(selectedClassForDetails) || 'Not scheduled for today'}`
                                       : 'Watch live video now!'
                                   }
                                 >
                                   <FaVideo /> 
                                   {!isClassCurrentlyScheduled(selectedClassForDetails) ? 'Not Available' : '🕐 Watch Now'}
                                 </button>
                               )}
                               
                               {/* Make Payment Button - Only if access is restricted */}
                               {!paymentInfo.canAccess && (
                                 <button
                                   onClick={() => handleMakePayment(selectedClassForDetails)}
                                   className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                                 >
                                   <FaMoneyBill /> Make Payment
                                 </button>
                               )}
                               
                               {/* Always Available Actions */}
                               <button
                                 onClick={() => setDetailsActiveTab('schedule')}
                                 className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                               >
                                 <FaCalendar /> View Schedule
                               </button>
                               <button
                                 onClick={() => setDetailsActiveTab('payments')}
                                 className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                               >
                                 <FaMoneyBill /> Payment Details
                               </button>
                               <button
                                 onClick={() => setDetailsActiveTab('payment-tracking')}
                                 className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                               >
                                 <FaShieldAlt /> Payment Tracking
                               </button>
                               
                               {/* Additional Actions */}
                               {selectedClassForDetails.hasTutes && (
                                 <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                                   <FaBook /> Access Tutes
                                 </button>
                               )}
                               {selectedClassForDetails.hasExams && (
                                 <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2">
                                   <FaGraduationCap /> Access Exams
                                 </button>
                               )}
                             </>
                           );
                         })()}
                       </div>
                     </div>
                  </div>
                )}

                {detailsActiveTab === 'schedule' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaCalendar /> Class Schedule
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><strong>Day:</strong> {formatDay(selectedClassForDetails.schedule?.day)}</div>
                        <div><strong>Time:</strong> {formatTime(selectedClassForDetails.schedule?.startTime)} - {formatTime(selectedClassForDetails.schedule?.endTime)}</div>
                        <div><strong>Frequency:</strong> {selectedClassForDetails.schedule?.frequency}</div>
                        <div><strong>Duration:</strong> {selectedClassForDetails.startDate && selectedClassForDetails.endDate ? 
                          `${new Date(selectedClassForDetails.startDate).toLocaleDateString()} to ${new Date(selectedClassForDetails.endDate).toLocaleDateString()}` : 'Not specified'}</div> 
                        <div>
                          <strong>Extra Class Hall:</strong>
                          {hallBookings.length > 0 ? (
                            hallBookings.map((h, idx) => (

                              <span key={h.id} className=" block mb-1">
                                <span className="ml-5 font-bold text-sm text-gray-600">{idx + 1}.</span>{' '}
                                <span className="ml-1 font-semibold">{h.hall_name}</span>
                                {' '}|{' '}
                                <span>{new Date(h.date).toLocaleDateString()}</span>
                                {' '}|{' '}
                                <span>{h.start_time} - {h.end_time}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500">No hall booked</span>
                          )}
                        </div>              
                      </div>

                    </div>
                  </div>
                )}

                {detailsActiveTab === 'payments' && (
                  <div className="space-y-6">
                    {/* Price Breakdown Section */}
                    {(() => {
                      const basePrice = selectedClassForDetails.basePrice || selectedClassForDetails.fee;
                      const finalPrice = selectedClassForDetails.purchasePrice || selectedClassForDetails.paidAmount || selectedClassForDetails.total_fee;
                      const priceDifference = basePrice && finalPrice ? basePrice - finalPrice : 0;
                      const hasDiscount = priceDifference > 0;
                      const hasAdditionalFee = priceDifference < 0;
                      
                      // Show breakdown if we have both prices OR if there are specific discount/fee fields
                      const shouldShowBreakdown = (basePrice && finalPrice) || 
                                                  selectedClassForDetails.promoDiscount > 0 || 
                                                  selectedClassForDetails.theoryStudentDiscount > 0 || 
                                                  selectedClassForDetails.speedPostFee > 0;
                      
                      if (!shouldShowBreakdown) return null;
                      
                      return (
                      <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FaMoneyBill /> Price Breakdown & Adjustments
                        </h3>
                        <div className="space-y-3">
                          {/* Base Price */}
                          <div className="bg-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-semibold">Base Class Fee</div>
                                <div className="text-xs text-gray-600">Original monthly class fee</div>
                              </div>
                              <span className="font-bold text-gray-700">LKR {parseInt(basePrice).toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Show general discount if we have a price difference but no specific breakdown */}
                          {hasDiscount && !selectedClassForDetails.promoDiscount && !selectedClassForDetails.theoryStudentDiscount && !selectedClassForDetails.speedPostFee && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-green-800 flex items-center gap-2">
                                    <FaCheckCircle className="text-green-600" />
                                    Total Discount Applied
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">
                                    <strong>Reason:</strong> Special discounts applied during enrollment. This may include:
                                    <ul className="list-disc ml-4 mt-1">
                                      <li>Early enrollment discount</li>
                                      <li>Theory student discount (if enrolled in related theory class)</li>
                                      <li>Promotional offers or campaigns</li>
                                      <li>Multi-class enrollment benefits</li>
                                      <li>Student loyalty rewards</li>
                                    </ul>
                                  </div>
                                </div>
                                <span className="font-bold text-green-700 ml-3 whitespace-nowrap">- LKR {Math.abs(priceDifference).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Show general fee increase if price went up but no specific breakdown */}
                          {hasAdditionalFee && !selectedClassForDetails.speedPostFee && (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-orange-800 flex items-center gap-2">
                                    <FaExclamationCircle className="text-orange-600" />
                                    Additional Fees Applied
                                  </div>
                                  <div className="text-xs text-orange-700 mt-1">
                                    <strong>Reason:</strong> Additional charges applied to your enrollment. This may include:
                                    <ul className="list-disc ml-4 mt-1">
                                      <li>Speed post delivery fee for study materials</li>
                                      <li>Registration or processing fees</li>
                                      <li>Special resource materials fees</li>
                                      <li>Late enrollment surcharge</li>
                                    </ul>
                                  </div>
                                </div>
                                <span className="font-bold text-orange-700 ml-3 whitespace-nowrap">+ LKR {Math.abs(priceDifference).toLocaleString()}</span>
                              </div>
                            </div>
                          )}

                          {/* Theory Student Discount */}
                          {selectedClassForDetails.theoryStudentDiscount > 0 && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-green-800 flex items-center gap-2">
                                    <FaCheckCircle className="text-green-600" />
                                    Theory Student Discount
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">
                                    <strong>Reason:</strong> Special discount for students who already enrolled in theory classes. 
                                    This encourages students to take multiple related classes.
                                  </div>
                                </div>
                                <span className="font-bold text-green-700 ml-3 whitespace-nowrap">- LKR {parseInt(selectedClassForDetails.theoryStudentDiscount).toLocaleString()}</span>
                              </div>
                            </div>
                          )}

                          {/* Promo Discount */}
                          {selectedClassForDetails.promoDiscount > 0 && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-green-800 flex items-center gap-2">
                                    <FaTicketAlt className="text-green-600" />
                                    Promotional Discount
                                  </div>
                                  <div className="text-xs text-green-700 mt-1">
                                    <strong>Reason:</strong> Applied promotional discount code during enrollment. 
                                    This could be from a special campaign, early bird offer, or referral bonus.
                                  </div>
                                </div>
                                <span className="font-bold text-green-700 ml-3 whitespace-nowrap">- LKR {parseInt(selectedClassForDetails.promoDiscount).toLocaleString()}</span>
                              </div>
                            </div>
                          )}

                          {/* Speed Post Fee */}
                          {selectedClassForDetails.speedPostFee > 0 && (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-orange-800 flex items-center gap-2">
                                    <FaExclamationCircle className="text-orange-600" />
                                    Speed Post Delivery Fee
                                  </div>
                                  <div className="text-xs text-orange-700 mt-1">
                                    <strong>Reason:</strong> Additional charge for courier delivery of study materials (books, notes, practice papers) 
                                    to your registered address. This covers packaging, handling, and postal service charges. 
                                    Materials will be delivered within 2-3 business days.
                                  </div>
                                </div>
                                <span className="font-bold text-orange-700 ml-3 whitespace-nowrap">+ LKR {parseInt(selectedClassForDetails.speedPostFee).toLocaleString()}</span>
                              </div>
                            </div>
                          )}

                          {/* Calculation Summary */}
                          <div className="bg-gray-100 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-2">
                              <strong>Calculation:</strong>
                            </div>
                            <div className="text-sm text-gray-700 space-y-1 mb-2">
                              <div>Base Fee: LKR {parseInt(basePrice).toLocaleString()}</div>
                              {selectedClassForDetails.theoryStudentDiscount > 0 && (
                                <div>Less Theory Discount: - LKR {parseInt(selectedClassForDetails.theoryStudentDiscount).toLocaleString()}</div>
                              )}
                              {selectedClassForDetails.promoDiscount > 0 && (
                                <div>Less Promo Discount: - LKR {parseInt(selectedClassForDetails.promoDiscount).toLocaleString()}</div>
                              )}
                              {hasDiscount && !selectedClassForDetails.promoDiscount && !selectedClassForDetails.theoryStudentDiscount && (
                                <div>Less Total Discount: - LKR {Math.abs(priceDifference).toLocaleString()}</div>
                              )}
                              {selectedClassForDetails.speedPostFee > 0 && (
                                <div>Plus Speed Post: + LKR {parseInt(selectedClassForDetails.speedPostFee).toLocaleString()}</div>
                              )}
                              {hasAdditionalFee && !selectedClassForDetails.speedPostFee && (
                                <div>Plus Additional Fees: + LKR {Math.abs(priceDifference).toLocaleString()}</div>
                              )}
                            </div>
                          </div>

                          {/* Final Amount */}
                          <div className="border-t-2 border-blue-300 pt-3 mt-2">
                            <div className="bg-gradient-to-r from-green-100 to-green-50 p-4 rounded-lg border-2 border-green-300">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-bold text-lg text-green-900">Total Amount Paid</div>
                                  <div className="text-xs text-green-700">This is your final monthly payment</div>
                                </div>
                                <span className="text-2xl font-bold text-green-700">LKR {parseInt(finalPrice).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Savings Summary - Show if there's any discount */}
                          {hasDiscount && (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-300">
                              <div className="flex items-center gap-2">
                                <FaStar className="text-yellow-600" />
                                <div>
                                  <div className="font-semibold text-yellow-800">You Saved:</div>
                                  <div className="text-sm text-yellow-700">
                                    Total discount of LKR {Math.abs(priceDifference).toLocaleString()} 
                                    {' '}({Math.round((Math.abs(priceDifference) / basePrice) * 100)}% off base price)
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })()}

                    {/* Payment Information Section */}
                    <div className="bg-green-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaMoneyBill /> Payment Information
                      </h3>
                      {(() => {
                        const paymentInfo = getPaymentTrackingInfo(selectedClassForDetails);
                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><strong>Status:</strong> {paymentInfo.message}</div>
                              <div><strong>Method:</strong> {selectedClassForDetails.paymentMethod}</div>
                              <div><strong>Next Payment:</strong> {paymentInfo.nextPaymentDate?.toLocaleDateString() || 'Not set'}</div>
                              <div><strong>Amount:</strong> LKR {selectedClassForDetails.purchasePrice ? parseInt(selectedClassForDetails.purchasePrice).toLocaleString() : selectedClassForDetails.fee?.toLocaleString()}</div>
                              {paymentInfo.status !== 'no-tracking' && (
                                <>
                                  <div><strong>Free Days:</strong> {paymentInfo.freeDays} days</div>
                                  <div><strong>Current Day:</strong> {paymentInfo.currentDay} of month</div>
                                </>
                              )}
                            </div>
                            
                            {paymentInfo.status !== 'no-tracking' && (
                              <div className={`mt-4 p-4 rounded-lg ${
                                paymentInfo.canAccess ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                <div className={`flex items-center gap-2 ${
                                  paymentInfo.canAccess ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {paymentInfo.canAccess ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                  <div>
                                    <div className="font-semibold">
                                      {paymentInfo.canAccess ? 'Access Granted' : 'Access Restricted'}
                                    </div>
                                    <div className="text-sm">
                                      {paymentInfo.status === 'free-period' && (
                                        <span>You have {paymentInfo.daysRemaining} days of free access remaining this month.</span>
                                      )}
                                      {paymentInfo.status === 'paid' && (
                                        <span>Payment completed. Full access granted.</span>
                                      )}
                                      {paymentInfo.status === 'pending' && (
                                        <span>Payment is pending. Please complete payment to access class.</span>
                                      )}
                                      {paymentInfo.status === 'overdue' && (
                                        <span>Payment is overdue. Please make payment immediately to restore access.</span>
                                      )}
                                      {paymentInfo.status === 'unpaid' && (
                                        <span>Payment required. Please make payment to access class.</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Payment History Section */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaHistory /> Payment History
                      </h3>
                      {selectedClassForDetails.paymentHistory && selectedClassForDetails.paymentHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedClassForDetails.paymentHistory.map((payment, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-semibold">Payment #{index + 1}</div>
                                  <div className="text-sm text-gray-600">
                                    {payment.date ? new Date(payment.date).toLocaleDateString() : 'No date'} 
                                  </div>
                                  {payment.invoiceId && (
                                    <div className="text-xs text-gray-500">Invoice: {payment.invoiceId}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg">LKR {payment.amount ? parseInt(payment.amount).toLocaleString() : '0'}</div>
                                  <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                                    payment.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'Unknown'}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                Method: {payment.payment_method ? (
                                  payment.payment_method === 'online' ? 'Online Payment' : 
                                         payment.payment_method === 'cash' ? 'Cash Payment' : 
                                         payment.payment_method === 'test' ? 'Test Payment' :
                                  payment.payment_method
                                ) : 'Not specified'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaHistory className="text-4xl mx-auto mb-4 text-gray-300" />
                          <p>No payment history available.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'payment-tracking' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaShieldAlt /> Payment Tracking System
                      </h3>
                      {(() => {
                        const paymentInfo = getPaymentTrackingInfo(selectedClassForDetails);
                        return (
                          <>
                            {paymentInfo.status === 'no-tracking' ? (
                              <div className="text-center py-8">
                                <FaShieldAlt className="text-4xl mx-auto mb-4 text-gray-400" />
                                <p className="text-gray-600">No payment tracking enabled for this class.</p>
                                <p className="text-sm text-gray-500 mt-2">You have unlimited access to this class.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Current Status */}
                                <div className={`p-4 rounded-lg ${
                                  paymentInfo.canAccess ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
                                }`}>
                                  <div className={`flex items-center gap-3 ${
                                    paymentInfo.canAccess ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {paymentInfo.canAccess ? <FaCheckCircle size={24} /> : <FaExclamationTriangle size={24} />}
                                    <div>
                                      <div className="font-bold text-lg">
                                        {paymentInfo.canAccess ? 'Access Granted' : 'Access Restricted'}
                                      </div>
                                      <div className="text-sm">{paymentInfo.message}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Free Days Progress */}
                                {paymentInfo.status === 'free-period' && (
                                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                                      <FaCalendar /> <span className="font-semibold">Free Days Progress</span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span>Current Day: {paymentInfo.currentDay}</span>
                                        <span>Free Days: {paymentInfo.freeDays}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${Math.min(100, (paymentInfo.currentDay / paymentInfo.freeDays) * 100)}%` }}
                                        ></div>
                                      </div>
                                      <div className="text-xs text-yellow-600">
                                        {paymentInfo.daysRemaining} days of free access remaining
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Payment Tracking Rules */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <div className="font-semibold mb-2">Payment Tracking Rules:</div>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• First {paymentInfo.freeDays} days of each month: Free access</li>
                                    <li>• After {paymentInfo.freeDays} days: Payment required for access</li>
                                    <li>• Payment status determines ongoing access</li>
                                    <li>• Access is automatically restored upon payment</li>
                                  </ul>
                                </div>

                                {/* Next Actions */}
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <div className="font-semibold mb-2 text-blue-700">Next Actions:</div>
                                  {paymentInfo.canAccess ? (
                                    <div className="text-sm text-blue-600">
                                      ✅ You can currently access this class. Continue learning!
                                    </div>
                                  ) : (
                                    <div className="text-sm text-blue-600">
                                      💳 Please make payment to restore access to this class.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'attendance' && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaCheckCircle /> Attendance Record
                      </h3>
                      {(() => {
                        const classAttendance = attendanceData[selectedClassForDetails.id] || [];
                        
                        if (classAttendance.length > 0) {
                          return (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {classAttendance.map((record, index) => (
                                <div key={record.id || index} className="flex justify-between items-center p-3 bg-white rounded-lg hover:shadow-md transition-shadow">
                                  <div className="flex-1">
                                    <div className="font-medium">{new Date(record.attendance_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-sm text-gray-500">
                                      {record.join_time && `Join: ${new Date(record.join_time).toLocaleTimeString()}`}
                                      {record.source && ` • Source: ${record.source}`}
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    record.attendance_status === 'present' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {record.attendance_status === 'present' ? '✓ Present' : '✗ Absent'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        return (
                          <div className="text-center py-8">
                            <FaCheckCircle className="mx-auto text-gray-400 text-4xl mb-2" />
                            <p className="text-gray-500">No attendance records available.</p>
                            <p className="text-sm text-gray-400 mt-1">Attendance will appear here once you join classes.</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'materials' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaFileAlt /> Course Materials
                      </h3>
                      
                      {loadingMaterials ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="mt-2 text-gray-600">Loading materials...</p>
                        </div>
                      ) : materials.length === 0 ? (
                        <div className="text-center py-8">
                          <FaFileAlt className="mx-auto text-gray-400 text-4xl mb-2" />
                          <p className="text-gray-500">No materials available yet.</p>
                          <p className="text-sm text-gray-400 mt-1">Your teacher will upload course materials here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {materials.map((material) => (
                            <div key={material.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <FaFilePdf className="text-red-500 text-xl flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{material.title}</div>
                                    <div className="text-sm text-gray-500">
                                      {material.category && (
                                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs mr-2">
                                          {material.category}
                                        </span>
                                      )}
                                      PDF • {(material.file_size / (1024 * 1024)).toFixed(2)} MB
                                      {material.download_count > 0 && (
                                        <span className="ml-2">• {material.download_count} downloads</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      Uploaded {material.upload_date ? new Date(material.upload_date).toLocaleDateString() : 'Unknown'}
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDownloadMaterial(material)}
                                  disabled={isDownloading}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors flex-shrink-0 ml-4"
                                >
                                  {isDownloading ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <FaDownload /> Download
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'recordings' && (
                  <div className="space-y-6">
                    <div className="bg-red-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaVideo /> Class Recordings
                      </h3>
                      
                      {/* Security Notice */}
                      <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <div className="flex items-start">
                          <FaShieldAlt className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-800 mb-1">🔒 Protected Content Notice</h4>
                            <p className="text-sm text-yellow-700">
                              All videos are watermarked with your <strong>Student ID ({getUserData()?.userid})</strong> and name. 
                              Unauthorized sharing, recording, or distribution is <strong>strictly prohibited</strong> and will be tracked.
                              Your viewing activity is logged for security purposes.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {loadingRecordings ? (
                          <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                            <p className="mt-2 text-gray-600">Loading recordings...</p>
                          </div>
                        ) : recordings.length === 0 ? (
                          <div className="text-center py-8 bg-white rounded-lg border">
                            <FaVideo className="mx-auto text-4xl text-gray-400 mb-2" />
                            <p className="text-gray-600">No recordings available yet</p>
                            <p className="text-sm text-gray-400 mt-1">Your teacher hasn't uploaded any recordings for this class</p>
                          </div>
                        ) : (
                          recordings.map((recording) => (
                            <div key={recording.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-16 h-12 bg-gradient-to-br from-red-500 to-purple-600 rounded flex items-center justify-center">
                                    <FaPlay className="text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{recording.title}</h4>
                                    <div className="text-sm text-gray-500 mt-1">
                                      {recording.duration && (
                                        <>
                                          Duration: {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')} min
                                          {' • '}
                                        </>
                                      )}
                                      Uploaded: {new Date(recording.upload_date).toLocaleDateString()}
                                      {recording.category && (
                                        <>
                                          {' • '}
                                          <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">
                                            {recording.category}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    {recording.description && (
                                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{recording.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <FaEye /> {recording.view_count || 0} views
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FaDownload /> {recording.download_count || 0} downloads
                                      </span>
                                      {recording.file_size && (
                                        <span>
                                          Size: {(recording.file_size / (1024 * 1024)).toFixed(2)} MB
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                  <button 
                                    onClick={() => handleWatchRecording(recording)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                                  >
                                    <FaPlay /> Watch
                                  </button>
                                  
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Recording Features:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• HD quality video recordings</li>
                          <li>• Playback speed control (0.5x to 2x)</li>
                          <li>• Searchable transcripts</li>
                          <li>• Bookmark important moments</li>
                          <li>• Download for offline viewing</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Recording Player Modal */}
      {showRecordingPlayer && selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg overflow-auto transition-all duration-300 ${
            isMaximized 
              ? 'w-screen h-screen m-0 rounded-none' 
              : 'w-full max-w-5xl max-h-[90vh]'
          }`}>
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selectedRecording.title}</h2>
                {selectedRecording.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedRecording.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded"
                  title={isMaximized ? "Restore" : "Maximize"}
                >
                  {isMaximized ? (
                    // Restore icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    // Maximize icon
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRecordingPlayer(false);
                    setSelectedRecording(null);
                    setIsMaximized(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-200 rounded"
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className={`${isMaximized ? 'p-0' : 'p-4'}`}>
              <div className={`bg-black overflow-hidden relative ${isMaximized ? 'h-[calc(100vh-180px)]' : 'rounded-lg'}`}>
                <style>
                  {`
                    @keyframes moveWatermark {
                      0% {
                        top: 10%;
                        left: 5%;
                      }
                      25% {
                        top: 70%;
                        left: 80%;
                      }
                      50% {
                        top: 30%;
                        left: 10%;
                      }
                      75% {
                        top: 60%;
                        left: 70%;
                      }
                      100% {
                        top: 10%;
                        left: 5%;
                      }
                    }
                    
                    @keyframes fadeWatermark {
                      0%, 100% { opacity: 0.4; }
                      50% { opacity: 0.7; }
                    }
                    
                    .video-watermark-moving {
                      position: absolute;
                      color: rgba(255, 255, 255, 0.6);
                      font-size: 18px;
                      font-weight: bold;
                      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                      z-index: 2147483647;
                      pointer-events: none;
                      animation: moveWatermark 30s linear infinite, fadeWatermark 3s ease-in-out infinite;
                      white-space: nowrap;
                      background: rgba(0, 0, 0, 0.3);
                      padding: 5px 10px;
                      border-radius: 5px;
                      backdrop-filter: blur(2px);
                    }
                    
                    .video-watermark-corner {
                      position: absolute;
                      color: rgba(255, 255, 255, 0.5);
                      font-size: 14px;
                      font-weight: 600;
                      text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
                      z-index: 2147483647;
                      pointer-events: none;
                      background: rgba(0, 0, 0, 0.2);
                      padding: 4px 8px;
                      border-radius: 4px;
                      backdrop-filter: blur(2px);
                    }
                    
                    .video-watermark-center {
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%) rotate(-25deg);
                      color: rgba(255, 255, 255, 0.15);
                      font-size: 48px;
                      font-weight: bold;
                      text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
                      z-index: 2147483646;
                      pointer-events: none;
                      letter-spacing: 8px;
                    }
                    
                    /* Hide fullscreen button in video controls */
                    video::-webkit-media-controls-fullscreen-button {
                      display: none !important;
                    }
                    
                    video::-moz-media-controls-fullscreen-button {
                      display: none !important;
                    }
                  `}
                </style>
                
                {/* Moving watermark with Student ID */}
                <div className="video-watermark-moving">
                  🎓 ID: {getUserData()?.userid || 'Unknown'} | {getUserData()?.fullname || getUserData()?.fullName || getUserData()?.name || getUserData()?.firstName || getUserData()?.username || 'Student'}
                </div>
                
                {/* Top-left corner watermark */}
                <div className="video-watermark-corner" style={{ top: '10px', left: '10px' }}>
                  TCMS - Student ID: {getUserData()?.userid}
                </div>
                
                {/* Top-right corner watermark */}
                <div className="video-watermark-corner" style={{ top: '10px', right: '10px' }}>
                  {getUserData()?.fullname || getUserData()?.fullName || getUserData()?.name || getUserData()?.firstName || getUserData()?.username || 'Student'}
                </div>
                
                {/* Bottom-left corner watermark */}
                <div className="video-watermark-corner" style={{ bottom: '50px', left: '10px' }}>
                  © TCMS {new Date().getFullYear()}
                </div>
                
                {/* Bottom-right corner watermark */}
                <div className="video-watermark-corner" style={{ bottom: '50px', right: '10px' }}>
                  {new Date().toLocaleDateString()}
                </div>
                
                {/* Large center diagonal watermark - Student ID */}
                <div className="video-watermark-center" style={{ 
                  fontSize: '120px', 
                  fontWeight: 'bold',
                  opacity: '0.2',
                  top: '40%'
                }}>
                  {getUserData()?.userid || 'STUDENT'}
                </div>
                
                {/* Secondary center watermark - TCMS */}
                <div className="video-watermark-center" style={{ 
                  fontSize: '40px',
                  opacity: '0.15',
                  top: '55%'
                }}>
                  TCMS PROTECTED
                </div>
                
                <video
                  controls
                  autoPlay
                  className={`w-full ${isMaximized ? 'h-[calc(100vh-180px)]' : ''}`}
                  controlsList="nodownload nofullscreen"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  src={getStreamingUrl(
                    selectedRecording.id,
                    getUserData()?.userid || '',
                    getUserData()?.fullname || getUserData()?.fullName || getUserData()?.name || getUserData()?.firstName || getUserData()?.username || 'Student'
                  )}
                  style={{ objectFit: isMaximized ? 'contain' : 'initial' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className={`${isMaximized ? 'p-4' : ''} mt-4 grid grid-cols-2 gap-4 text-sm`}>
                <div className="bg-gray-50 p-3 rounded">
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-semibold">{selectedRecording.category || 'N/A'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <span className="text-gray-600">Duration:</span>
                  <span className="ml-2 font-semibold">
                    {selectedRecording.duration 
                      ? `${Math.floor(selectedRecording.duration / 60)}:${(selectedRecording.duration % 60).toString().padStart(2, '0')}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <span className="text-gray-600">Uploaded:</span>
                  <span className="ml-2 font-semibold">
                    {new Date(selectedRecording.upload_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <span className="text-gray-600">Views:</span>
                  <span className="ml-2 font-semibold">{selectedRecording.view_count || 0}</span>
                </div>
              </div>
                          </div>
          </div>
        </div>
      )}

      {/* BasicAlertBox for user notifications */}
      <BasicAlertBox
        open={alertBox.open}
        title={alertBox.title}
        message={alertBox.message}
        type={alertBox.type}
        onConfirm={() => setAlertBox({ ...alertBox, open: false })}
        confirmText="OK"
      />
    </DashboardLayout>
  );
};

export default MyClasses; 