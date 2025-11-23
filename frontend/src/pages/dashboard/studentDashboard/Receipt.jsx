import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BasicCard from '../../../components/BasicCard';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from './StudentDashboardSidebar';
import SecureZoomMeeting from '../../../components/SecureZoomMeeting';
import { getStudentCard, getCardTypeInfo, getCardStatus, isCardValid } from '../../../utils/cardUtils';
import { FaCalendar, FaClock, FaMoneyBill, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaEye, FaCreditCard, FaMapMarkerAlt, FaVideo, FaUsers, FaFileAlt, FaDownload, FaPlay, FaHistory, FaQrcode, FaBarcode, FaBell, FaBook, FaGraduationCap, FaUserClock, FaExclamationCircle, FaInfoCircle, FaStar, FaCalendarAlt, FaUserGraduate, FaChartLine, FaShieldAlt, FaSearch, FaCog, FaSync, FaTicketAlt, FaPauseCircle } from 'react-icons/fa';

const MyClasses = ({ onLogout }) => {
  const [myClasses, setMyClasses] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [showForgetCardModal, setShowForgetCardModal] = useState(false);
  const [selectedClassForForgetCard, setSelectedClassForForgetCard] = useState(null);
  const [showLatePaymentModal, setShowLatePaymentModal] = useState(false);
  const [selectedClassForLatePayment, setSelectedClassForLatePayment] = useState(null);
  const [showSecureZoomModal, setShowSecureZoomModal] = useState(false);
  const [selectedClassForZoom, setSelectedClassForZoom] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState(null);
  const [detailsActiveTab, setDetailsActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'payment', 'status'
  const [testDate, setTestDate] = useState(null); // For testing payment tracking
  const navigate = useNavigate();

  const loadMyClasses = () => {
    try {
    const stored = localStorage.getItem('myClasses');
      if (stored) {
        const classes = JSON.parse(stored);
        const currentStudent = JSON.parse(localStorage.getItem('currentStudent') || '{}');
        
        // Validate and normalize class data
        const validatedClasses = classes.map(cls => {
          // Get student's card for this class
          const studentCard = getStudentCard(currentStudent.studentId || 'STUDENT_001', cls.id);
          const cardInfo = studentCard ? getCardTypeInfo(studentCard.cardType) : null;
          const cardStatus = getCardStatus(studentCard);
          const cardValidity = isCardValid(studentCard);
          
          return {
            ...cls,
            schedule: cls.schedule || { day: '', startTime: '', endTime: '', frequency: 'weekly' },
            fee: cls.fee || 0,
            maxStudents: cls.maxStudents || 50,
            status: cls.status || 'active',
            currentStudents: cls.currentStudents || 0,
            className: cls.className || 'Unnamed Class',
            subject: cls.subject || 'Unknown Subject',
            teacher: cls.teacher || 'Unknown Teacher',
            stream: cls.stream || 'Unknown Stream',
            deliveryMethod: cls.deliveryMethod || 'online',
            courseType: cls.courseType || 'theory',
            paymentStatus: cls.paymentStatus || 'pending',
            // Handle new payment tracking structure
            paymentTracking: cls.paymentTracking || { enabled: false },
            paymentTrackingFreeDays: cls.paymentTrackingFreeDays || 7,
            // Ensure payment tracking is properly structured
            ...(cls.paymentTracking && typeof cls.paymentTracking === 'object' ? {} : {
              paymentTracking: {
                enabled: true, // Enable payment tracking for all classes
                freeDays: cls.paymentTrackingFreeDays || 7,
                active: true
              }
            }),
            // Add missing fields with defaults
            attendance: cls.attendance || [],
            paymentHistory: cls.paymentHistory || [],
            hasExams: cls.hasExams || false,
            hasTutes: cls.hasTutes || false,
            forgetCardRequested: cls.forgetCardRequested || false,
            latePaymentRequested: cls.latePaymentRequested || false,
            purchaseDate: cls.purchaseDate || new Date().toISOString(),
            nextPaymentDate: cls.nextPaymentDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
            // Add card information
            studentCard,
            cardInfo,
            cardStatus,
            cardValidity
          };
        });
        setMyClasses(validatedClasses);
      } else {
        setMyClasses([]);
      }
    } catch (err) {
      console.error('Error loading classes:', err);
      setError('Failed to load classes. Please refresh the page.');
      setMyClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Create enrollment records for each class
  const createEnrollmentRecords = () => {
    try {
      const stored = localStorage.getItem('myClasses');
      if (!stored) return;
      
      const classes = JSON.parse(stored);
      const currentStudent = JSON.parse(localStorage.getItem('currentStudent') || '{}');
      
      // Get existing enrollments
      const existingEnrollments = JSON.parse(localStorage.getItem('enrollments') || '[]');
      
      // Create enrollment records for each class
      const newEnrollments = classes.map(cls => {
        // Check if enrollment already exists for this class and student
        const existingEnrollment = existingEnrollments.find(e => 
          e.classId === cls.id && e.studentId === currentStudent.studentId
        );
        
        if (existingEnrollment) {
          return existingEnrollment; // Keep existing enrollment
        }
        
        // Create new enrollment record
        return {
          id: Date.now() + Math.random(),
          classId: cls.id,
          studentId: currentStudent.studentId || 'STUDENT_001',
          studentName: currentStudent.firstName || currentStudent.fullName || 'Unknown Student',
          enrollmentDate: new Date().toISOString(),
          status: 'enrolled',
          className: cls.className,
          subject: cls.subject,
          teacher: cls.teacher
        };
      });
      
      // Merge with existing enrollments, avoiding duplicates
      const allEnrollments = [...existingEnrollments];
      newEnrollments.forEach(newEnrollment => {
        const exists = allEnrollments.find(e => 
          e.classId === newEnrollment.classId && e.studentId === newEnrollment.studentId
        );
        if (!exists) {
          allEnrollments.push(newEnrollment);
        }
      });
      
      // Save to localStorage
      localStorage.setItem('enrollments', JSON.stringify(allEnrollments));
      console.log('Created enrollment records:', allEnrollments);
      
    } catch (err) {
      console.error('Error creating enrollment records:', err);
    }
  };

  useEffect(() => {
    loadMyClasses();
    createEnrollmentRecords(); // Create enrollment records for each class
  }, []);

  // Listen for payment updates
  useEffect(() => {
    const handlePaymentUpdate = () => {
      loadMyClasses();
    };

    window.addEventListener('refreshMyClasses', handlePaymentUpdate);
    return () => window.removeEventListener('refreshMyClasses', handlePaymentUpdate);
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
    // For demonstration purposes, let's enable payment tracking for all classes
    // In a real scenario, this would be based on the class configuration
    const hasPaymentTracking = cls.paymentTracking || cls.paymentTracking === true || cls.paymentTracking?.enabled;
    
    if (!hasPaymentTracking) {
      return { canAccess: true, status: 'no-tracking', message: 'No payment tracking enabled' };
    }

    const today = testDate || new Date(); // Use test date if available
    
    // Check if there's a payment history
    if (!cls.paymentHistory || cls.paymentHistory.length === 0) {
      return { 
        canAccess: false, 
        status: 'no-payment', 
        message: 'No payment history - payment required' 
      };
    }

    // Get the latest payment
    const latestPayment = cls.paymentHistory[cls.paymentHistory.length - 1];
    const paymentDate = new Date(latestPayment.date);
    
    // Calculate next payment date: 1st day of next month from payment date
    const nextPaymentDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 1);
    
    // Calculate grace period end date: next payment date + 7 days
    const gracePeriodEndDate = new Date(nextPaymentDate);
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 7);
    
    // Check if today is within the grace period
    if (today <= gracePeriodEndDate) {
      const daysRemaining = Math.ceil((gracePeriodEndDate - today) / (1000 * 60 * 60 * 24));
      const nextPaymentDay = nextPaymentDate.getDate();
      const nextPaymentMonth = nextPaymentDate.toLocaleDateString('en-US', { month: 'long' });
      
      return { 
        canAccess: true, 
        status: 'paid', 
        message: `Payment completed (${daysRemaining} days remaining in grace period)${testDate ? ` [TEST: ${testDate.toDateString()}]` : ''}`,
        daysRemaining: daysRemaining,
        nextPaymentDate: nextPaymentDate,
        gracePeriodEndDate: gracePeriodEndDate
      };
    }

    // If we're past the grace period, payment is required
    return { 
      canAccess: false, 
      status: 'payment-required', 
      message: 'Payment required - grace period expired' 
    };
  };

  const getPaymentTrackingInfo = (cls) => {
    const trackingStatus = getPaymentTrackingStatus(cls);
    const freeDays = cls.paymentTracking?.freeDays || 7;
    const today = testDate || new Date(); // Use test date if available
    const currentDay = today.getDate();
    
    return {
      ...trackingStatus,
      freeDays,
      currentDay,
      isFreePeriod: currentDay <= freeDays,
      daysRemaining: Math.max(0, freeDays - currentDay + 1),
      nextPaymentDate: cls.nextPaymentDate ? new Date(cls.nextPaymentDate) : null,
      lastPaymentDate: cls.paymentHistory && cls.paymentHistory.length > 0 
        ? new Date(cls.paymentHistory[cls.paymentHistory.length - 1].date) 
        : null,
      testDate: testDate ? testDate.toDateString() : null
    };
  };

  // Debug function to log payment tracking info
  const debugPaymentTracking = (cls) => {
    const paymentInfo = getPaymentTrackingInfo(cls);
    console.log('Payment Tracking Debug for:', cls.className, {
      paymentTracking: cls.paymentTracking,
      paymentStatus: cls.paymentStatus,
      currentDay: paymentInfo.currentDay,
      freeDays: paymentInfo.freeDays,
      canAccess: paymentInfo.canAccess,
      status: paymentInfo.status,
      message: paymentInfo.message
    });
    return paymentInfo;
  };

  // Test function to simulate different dates for payment tracking
  const testPaymentTrackingWithDate = (cls, testDate) => {
    const hasPaymentTracking = cls.paymentTracking || cls.paymentTracking === true || cls.paymentTracking?.enabled;
    
    if (!hasPaymentTracking) {
      return { canAccess: true, status: 'no-tracking', message: 'No payment tracking enabled' };
    }

    const freeDays = cls.paymentTracking?.freeDays || 7;
    const currentDay = testDate.getDate();
    
    // Check if within free days period (first 7 days of the month)
    if (currentDay <= freeDays) {
      return { 
        canAccess: true, 
        status: 'free-period', 
        message: `Free access (${freeDays - currentDay + 1} days remaining) - TEST DATE: ${testDate.toDateString()}`,
        daysRemaining: freeDays - currentDay + 1,
        testDate: testDate.toDateString()
      };
    }

    // Check payment status
    if (cls.paymentStatus === 'paid') {
      return { canAccess: true, status: 'paid', message: 'Payment completed' };
    }

    if (cls.paymentStatus === 'pending') {
      return { canAccess: false, status: 'pending', message: 'Payment pending - access restricted' };
    }

    if (cls.paymentStatus === 'overdue') {
      return { canAccess: false, status: 'overdue', message: 'Payment overdue - access restricted' };
    }

    return { canAccess: false, status: 'unpaid', message: 'Payment required - access restricted' };
  };

  // Test scenarios - add this to test different dates
  const testScenarios = () => {
    const testClass = myClasses[0]; // Use first class for testing
    if (!testClass) return;

    console.log('=== PAYMENT TRACKING TEST SCENARIOS ===');
    console.log('Updated Logic: Payment made on July 29, 2025');
    console.log('Timeline:');
    console.log('- July 29: Payment made');
    console.log('- August 1: Next payment date (1st day of next month)');
    console.log('- August 8: Grace period ends (August 1 + 7 days)');
    console.log('- August 9: Payment required (after grace period)');
    console.log('');
    
    // Test the updated timeline
    const testDates = [
      new Date('2025-07-29'), // Payment day
      new Date('2025-08-01'), // Next payment date (1st day of next month)
      new Date('2025-08-07'), // Still in grace period
      new Date('2025-08-08'), // Grace period ends
      new Date('2025-08-09'), // Payment required (after grace period)
      new Date('2025-08-15'), // Payment required
      new Date('2025-08-31'), // Payment required
    ];

    testDates.forEach(date => {
      // Temporarily set test date
      const originalTestDate = testDate;
      testDate = date;
      
      const result = getPaymentTrackingStatus(testClass);
      console.log(`${date.toDateString()}: ${result.message}`);
      
      // Restore original test date
      testDate = originalTestDate;
    });
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
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  // Get payment status info with enhanced details
  const getPaymentStatusInfo = (status, nextPaymentDate) => {
    const nextPayment = new Date(nextPaymentDate);
    const today = new Date();
    const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    
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
      case 'late_payment':
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
        return { color: 'text-purple-600', icon: <FaVideo />, text: 'Online' };
      case 'physical':
        return { color: 'text-orange-600', icon: <FaMapMarkerAlt />, text: 'Physical' };
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

  // Get class priority/urgency
  const getClassPriority = (cls) => {
    // If class is inactive, it should be high priority
    if (cls.status === 'inactive') return { priority: 'high', text: 'Inactive', color: 'text-red-600', bgColor: 'bg-red-50' };
    
    const nextPayment = new Date(cls.nextPaymentDate);
    const today = new Date();
    const daysUntilPayment = Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24));
    
    if (cls.paymentStatus === 'overdue') return { priority: 'high', text: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-50' };
    if (cls.paymentStatus === 'pending' && daysUntilPayment <= 3) return { priority: 'medium', text: 'Due Soon', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (cls.paymentStatus === 'paid') return { priority: 'low', text: 'Active', color: 'text-green-600', bgColor: 'bg-green-50' };
    return { priority: 'normal', text: 'Normal', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  };

  // Filter and sort classes
  const filteredAndSortedClasses = myClasses
        .filter(cls => {
      // Tab filtering
    if (selectedTab === 'all') return true;
      if (selectedTab === 'active') return cls.status === 'active';
      if (selectedTab === 'inactive') return cls.status === 'inactive';
    if (selectedTab === 'payment-due') {
      const nextPayment = new Date(cls.nextPaymentDate);
      const today = new Date();
      return nextPayment <= today && cls.paymentStatus !== 'paid';
    }
      if (selectedTab === 'overdue') return cls.paymentStatus === 'overdue';
      if (selectedTab === 'late-payment') return cls.paymentStatus === 'late_payment';
      if (selectedTab === 'with-exams') return cls.hasExams;
      if (selectedTab === 'with-tutes') return cls.hasTutes;
      if (selectedTab === 'online') return cls.deliveryMethod === 'online';
      if (selectedTab === 'physical') return cls.deliveryMethod === 'physical';
      if (selectedTab === 'hybrid') return cls.deliveryMethod === 'hybrid';
      if (selectedTab === 'theory') return cls.courseType === 'theory';
      if (selectedTab === 'revision') return cls.courseType === 'revision';
      if (selectedTab === 'both') return cls.courseType === 'both';
              if (selectedTab === 'payment-tracking') {
          const paymentInfo = getPaymentTrackingInfo(cls);
          return paymentInfo.status !== 'no-tracking';
    }
    return cls.schedule?.frequency === selectedTab;
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
      // Sorting
      switch (sortBy) {
        case 'name':
          return (a.className || '').localeCompare(b.className || '');
        case 'date':
          return new Date(b.purchaseDate) - new Date(a.purchaseDate);
        case 'payment':
          return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
        case 'status':
          const priorityA = getClassPriority(a).priority;
          const priorityB = getClassPriority(b).priority;
          const priorityOrder = { high: 3, medium: 2, normal: 1, low: 0 };
          return priorityOrder[priorityB] - priorityOrder[priorityA];
        default:
          return 0;
      }
  });

  // Handle make payment
  const handleMakePayment = (cls) => {
    navigate(`/student/checkout/${cls.id}`, { state: { type: 'renewal' } });
  };

  // Handle view details - modern modal approach
  const handleViewDetails = (cls) => {
    // Check enrollment status first
    if (cls.status === 'suspended') {
      alert('Access to this class has been suspended. Please contact the administrator for more information.');
      return;
    }
    
    if (cls.status === 'dropped') {
      alert('You have dropped this course. No access is available.');
      return;
    }
    
    setSelectedClassForDetails(cls);
    setDetailsActiveTab('overview');
    setShowDetailsModal(true);
  };

  // Handle join class
  const handleJoinClass = (cls) => {
    // Check enrollment status first
    if (cls.status === 'suspended') {
      alert('Access to this class has been suspended. Please contact the administrator for more information.');
      return;
    }
    
    if (cls.status === 'completed') {
      alert('This course has been completed. No further access is available.');
      return;
    }
    
    if (cls.status === 'dropped') {
      alert('You have dropped this course. No access is available.');
      return;
    }
    
    if (cls.deliveryMethod === 'online' || cls.deliveryMethod === 'hybrid') {
      if (cls.zoomLink) {
        // Use secure zoom meeting modal instead of opening link directly
        setSelectedClassForZoom(cls);
        setShowSecureZoomModal(true);
      } else {
        alert('Zoom link not available for this class.');
      }
    } else {
      alert('This is a physical class. Please attend at the specified location.');
    }
  };

  // Handle attendance marking
  const handleMarkAttendance = (cls) => {
    const today = new Date().toISOString().split('T')[0];

    const currentStudent = JSON.parse(localStorage.getItem('currentStudent') || '{}');
    
    // Ensure enrollment record exists
    createEnrollmentRecords();
    
    // Get existing attendance records
    const allAttendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    
    // Check if attendance already marked for today
    const existingRecord = allAttendanceRecords.find(record => 
      record.classId === cls.id && 
      record.date === today
    );

    if (existingRecord) {
      alert('Attendance already marked for today!');
      return;
    }

    // Create new attendance record with proper student information
    const newAttendanceRecord = {
      id: Date.now(),
      classId: cls.id,
      studentId: currentStudent.studentId || 'STUDENT_001',
      studentName: currentStudent.firstName || currentStudent.fullName || 'Unknown Student',
      date: today,
      time: new Date().toISOString(),
      status: 'present',
      method: 'manual',
      deliveryMethod: cls.deliveryMethod || 'online'
    };

    // Save to attendance records
    const updatedRecords = [...allAttendanceRecords, newAttendanceRecord];
    localStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));

    // Also update local attendance for backward compatibility
    const updatedClasses = myClasses.map(c => {
      if (c.id === cls.id) {
        const attendance = c.attendance || [];
        const existingLocalRecord = attendance.find(a => a.date === today);
        
        if (!existingLocalRecord) {
          attendance.push({
            date: today,
            status: 'present',
            timestamp: new Date().toISOString(),
            studentId: currentStudent.studentId || 'STUDENT_001',
            studentName: currentStudent.firstName || currentStudent.fullName || 'Unknown Student',
            method: 'manual'
          });
        }
        
        return { ...c, attendance };
      }
      return c;
    });
    
    setMyClasses(updatedClasses);
    localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
    alert('Attendance marked successfully!');
  };

  // Handle forget card request
  const handleForgetCardRequest = (cls) => {
    setSelectedClassForForgetCard(cls);
    setShowForgetCardModal(true);
  };

  // Submit forget card request
  const submitForgetCardRequest = () => {
    if (selectedClassForForgetCard) {
      const updatedClasses = myClasses.map(c => {
        if (c.id === selectedClassForForgetCard.id) {
          return {
            ...c,
            forgetCardRequested: true,
            forgetCardRequestDate: new Date().toISOString()
          };
        }
        return c;
      });
      
      setMyClasses(updatedClasses);
      localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
      setShowForgetCardModal(false);
      setSelectedClassForForgetCard(null);
      alert('Forget card request submitted successfully!');
    }
  };

  // Handle late payment request
  const handleLatePaymentRequest = (cls) => {
    setSelectedClassForLatePayment(cls);
    setShowLatePaymentModal(true);
  };

  // Submit late payment request
  const submitLatePaymentRequest = () => {
    if (selectedClassForLatePayment) {
      const updatedClasses = myClasses.map(c => {
        if (c.id === selectedClassForLatePayment.id) {
          return {
            ...c,
            paymentStatus: 'late_payment',
            latePaymentRequested: true,
            latePaymentRequestDate: new Date().toISOString()
          };
        }
        return c;
      });
      
      setMyClasses(updatedClasses);
      localStorage.setItem('myClasses', JSON.stringify(updatedClasses));
      setShowLatePaymentModal(false);
      setSelectedClassForLatePayment(null);
      alert('Late payment request submitted successfully! You can attend today\'s class.');
    }
  };

  // Handle exam access
  const handleExamAccess = (cls) => {
    if (cls.hasExams) {
      navigate(`/student/exams/${cls.id}`, { state: { class: cls } });
    } else {
      alert('No exams available for this class yet.');
    }
  };

  // Handle tute access
  const handleTuteAccess = (cls) => {
    if (cls.hasTutes) {
      navigate(`/student/tutes/${cls.id}`, { state: { class: cls } });
    } else {
      alert('No tutes available for this class yet.');
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
    { key: 'active', label: 'Active', icon: <FaCheckCircle />, count: myClasses.filter(c => c.status === 'active').length },
    { key: 'inactive', label: 'Inactive', icon: <FaTimesCircle />, count: myClasses.filter(c => c.status === 'inactive').length },
    { key: 'online', label: 'Online', icon: <FaVideo />, count: myClasses.filter(c => c.deliveryMethod === 'online').length },
    { key: 'physical', label: 'Physical', icon: <FaMapMarkerAlt />, count: myClasses.filter(c => c.deliveryMethod === 'physical').length },
    { key: 'hybrid', label: 'Hybrid', icon: <FaUsers />, count: myClasses.filter(c => c.deliveryMethod === 'hybrid').length },
    { key: 'theory', label: 'Theory', icon: <FaBook />, count: myClasses.filter(c => c.courseType === 'theory').length },
    { key: 'revision', label: 'Revision', icon: <FaGraduationCap />, count: myClasses.filter(c => c.courseType === 'revision').length },
    { key: 'both', label: 'Theory + Revision', icon: <FaBook />, count: myClasses.filter(c => c.courseType === 'both').length },
    { key: 'payment-tracking', label: 'Payment Tracking', icon: <FaMoneyBill />, count: myClasses.filter(c => c.paymentTracking && (c.paymentTracking.enabled || c.paymentTracking === true)).length },
    { key: 'payment-due', label: 'Payment Due', icon: <FaExclamationTriangle />, count: myClasses.filter(c => {
      const nextPayment = new Date(c.nextPaymentDate);
      const today = new Date();
      return nextPayment <= today && c.paymentStatus !== 'paid';
    }).length },
    { key: 'overdue', label: 'Overdue', icon: <FaTimesCircle />, count: myClasses.filter(c => c.paymentStatus === 'overdue').length },
    { key: 'late-payment', label: 'Late Payment', icon: <FaUserClock />, count: myClasses.filter(c => c.paymentStatus === 'late_payment').length },
    { key: 'with-exams', label: 'With Exams', icon: <FaGraduationCap />, count: myClasses.filter(c => c.hasExams).length },
    { key: 'with-tutes', label: 'With Tutes', icon: <FaBook />, count: myClasses.filter(c => c.hasTutes).length }
  ];

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
          <h1 className="text-2xl font-bold mb-2 text-center">My Classes</h1>
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
                  const nextPayment = new Date(c.nextPaymentDate);
                  const today = new Date();
                  return nextPayment <= today && c.paymentStatus !== 'paid';
                }).length}
              </div>
              <div className="text-sm text-yellow-700">Payment Due</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {myClasses.filter(c => {
                  const paymentInfo = getPaymentTrackingInfo(c);
                  return paymentInfo.status !== 'no-tracking';
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
              <option value="date">Sort by Date</option>
              <option value="payment">Sort by Payment Due</option>
              <option value="status">Sort by Priority</option>
            </select>
            {/* Test Button for Payment Tracking */}
            <button
              onClick={testScenarios}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              title="Test Payment Tracking Scenarios"
            >
              <FaShieldAlt /> Test 7-Day
            </button>
            <button
              onClick={loadMyClasses}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              title="Refresh My Classes Data"
            >
              <FaSync /> Refresh Data
            </button>
            {/* Test Date Selector */}
            <select
              value={testDate ? testDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setTestDate(new Date(e.target.value));
                } else {
                  setTestDate(null);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Current Date</option>
              <option value="2025-07-29">Day 1 (Free Access)</option>
              <option value="2025-08-06">Day 7 (Free Access)</option>
              <option value="2025-08-07">Day 8 (Payment Required)</option>
              <option value="2025-08-15">Day 15 (Payment Required)</option>
              <option value="2025-08-29">Day 31 (Payment Required)</option>
              <option value="2025-09-19">Day 50 (Payment Required)</option>
            </select>
            {testDate && (
              <button
                onClick={() => setTestDate(null)}
                className="px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                title="Reset to Current Date"
              >
                Reset
              </button>
            )}
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
              const paymentStatus = getPaymentStatusInfo(cls.paymentStatus, cls.nextPaymentDate);
              const deliveryInfo = getDeliveryMethodInfo(cls.deliveryMethod);
              const courseTypeInfo = getCourseTypeInfo(cls.courseType);
              const classStatus = getClassStatusInfo(cls.status);
              const priority = getClassPriority(cls);
              const paymentTrackingInfo = getPaymentTrackingInfo(cls);
              const nextPaymentDate = new Date(cls.nextPaymentDate);
              const today = new Date();
              const isPaymentDue = nextPaymentDate <= today && cls.paymentStatus !== 'paid';
              const canAttendToday = paymentTrackingInfo.canAccess && cls.status === 'active';
              const isInactive = cls.status === 'inactive';
              const isSuspended = cls.status === 'suspended';
              const isCompleted = cls.status === 'completed';
              const isDropped = cls.status === 'dropped';
              
              const scheduleText = cls.schedule ? 
                `${formatDay(cls.schedule.day)} ${formatTime(cls.schedule.startTime)}-${formatTime(cls.schedule.endTime)}` : 
                'Schedule not set';

              return (
              <BasicCard
                  key={cls.id}
                  title={
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-semibold">{cls.className}</span>
                        <div className="text-xs text-gray-500 mt-1">{cls.teacher}</div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${priority.bgColor} ${priority.color}`}>
                        {priority.text}
                      </div>
                    </div>
                  }
                  price={
                    <span className="text-xs">
                      {cls.basePrice && cls.purchasePrice && cls.basePrice !== cls.purchasePrice ? (
                        <>
                          <span className="line-through text-gray-400 mr-1">LKR {parseInt(cls.basePrice).toLocaleString()}</span>
                          <span className="text-green-700 font-bold">LKR {parseInt(cls.purchasePrice).toLocaleString()}</span>
                        </>
                      ) : (
                        <>LKR {parseInt(cls.fee).toLocaleString()}</>
                      )}
                    </span>
                  }
                  image={getClassImage(cls.subject)}
                  description={
                    <div className="text-xs text-gray-600 space-y-2">
                      <div className="flex items-center justify-between">
                        <span><strong>Subject:</strong> {cls.subject}</span>
                        <span><strong>Stream:</strong> {cls.stream}</span>
                      </div>
                      <div><strong>Schedule:</strong> {scheduleText}</div>
                      <div className="flex items-center gap-1">
                        <span className={deliveryInfo.color}>{deliveryInfo.icon}</span>
                        <span>{deliveryInfo.text}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={courseTypeInfo.color}>{courseTypeInfo.icon}</span>
                        <span>{courseTypeInfo.text}</span>
                      </div>
                      <div className={`flex items-center gap-1 p-2 rounded ${paymentStatus.bgColor} ${paymentStatus.borderColor} border`}>
                        <span className={paymentStatus.color}>{paymentStatus.icon}</span>
                        <span className={paymentStatus.color}>{paymentStatus.text}</span>
                      </div>
                      <div className={`flex items-center gap-1 p-2 rounded ${classStatus.bgColor} ${classStatus.borderColor} border`}>
                        <span className={classStatus.color}>{classStatus.icon}</span>
                        <span className={classStatus.color}>{classStatus.text}</span>
                      </div>
                      
                      {/* Suspended Enrollment Warning */}
                      {isSuspended && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                          <div className="flex items-center gap-2">
                            <FaExclamationTriangle className="text-orange-600 text-sm" />
                            <div>
                              <div className="font-semibold text-orange-700 text-sm">Enrollment Suspended</div>
                              <div className="text-orange-600 text-xs">Access to this class has been temporarily suspended. Contact admin for details.</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Completed Enrollment Info */}
                      {isCompleted && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                          <div className="flex items-center gap-2">
                            <FaGraduationCap className="text-blue-600 text-sm" />
                            <div>
                              <div className="font-semibold text-blue-700 text-sm">Course Completed</div>
                              <div className="text-blue-600 text-xs">You have successfully completed this course.</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Dropped Enrollment Info */}
                      {isDropped && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                          <div className="flex items-center gap-2">
                            <FaTimesCircle className="text-red-600 text-sm" />
                            <div>
                              <div className="font-semibold text-red-700 text-sm">Enrollment Dropped</div>
                              <div className="text-red-600 text-xs">You have dropped this course. No further access available.</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div><strong>Next Payment:</strong> {nextPaymentDate.toLocaleDateString()}</div>
                      <div><strong>Students:</strong> {cls.currentStudents || 0}/{cls.maxStudents}</div>
                      {cls.attendance && cls.attendance.length > 0 && (
                        <div><strong>Attendance:</strong> {cls.attendance.filter(a => a.status === 'present').length}/{cls.attendance.length}</div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {cls.hasExams && <span className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded"><FaGraduationCap className="inline mr-1" />Exams</span>}
                        {cls.hasTutes && <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded"><FaBook className="inline mr-1" />Tutes</span>}
                        {cls.forgetCardRequested && <span className="text-orange-600 text-xs bg-orange-50 px-2 py-1 rounded"><FaQrcode className="inline mr-1" />Forget Card</span>}
                                              {paymentTrackingInfo.status !== 'no-tracking' && (
                        <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                          paymentTrackingInfo.canAccess 
                            ? 'text-green-600 bg-green-50' 
                            : 'text-red-600 bg-red-50'
                        }`}>
                          <FaMoneyBill className="inline" />
                          {paymentTrackingInfo.status === 'free-period' && (
                            <span>Free Access ({paymentTrackingInfo.daysRemaining}d left)</span>
                          )}
                          {paymentTrackingInfo.status === 'paid' && (
                            <span>Paid</span>
                          )}
                          {paymentTrackingInfo.status === 'payment-required' && (
                            <span>Payment Required</span>
                          )}
                          {paymentTrackingInfo.status === 'no-payment' && (
                            <span>No Payment</span>
                          )}
                          {paymentTrackingInfo.status === 'unknown' && (
                            <span>Status Unclear</span>
                          )}
                        </span>
                      )}
                      {paymentTrackingInfo.status === 'no-tracking' && (
                        <span className="text-xs px-2 py-1 rounded flex items-center gap-1 text-gray-600 bg-gray-50">
                          <FaMoneyBill className="inline" />
                          <span>No Payment Tracking</span>
                        </span>
                      )}
                        {cls.theoryRevisionDiscount && cls.courseType === 'both' && <span className="text-purple-600 text-xs bg-purple-50 px-2 py-1 rounded"><FaMoneyBill className="inline mr-1" />Discount</span>}
                      
                      {/* Student Card Information */}
                      {cls.studentCard && (
                        <div className="mt-2 p-2 rounded border">
                          <div className="flex items-center gap-2 mb-1">
                            <FaTicketAlt className="text-blue-500" />
                            <span className="text-xs font-semibold">Student Card</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls.cardInfo.color}`}>
                              {cls.cardInfo.label}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls.cardStatus.color}`}>
                              {cls.cardStatus.label}
                            </span>
                          </div>
                          {cls.cardValidity.isValid ? (
                            <div className="text-xs text-green-600">
                              ✓ {cls.cardValidity.reason}
                            </div>
                          ) : (
                            <div className="text-xs text-red-600">
                              ✗ {cls.cardValidity.reason}
                            </div>
                          )}
                          {cls.studentCard.reason && (
                            <div className="text-xs text-gray-600 mt-1">
                              <strong>Reason:</strong> {cls.studentCard.reason}
                            </div>
                          )}
                          <div className="text-xs text-gray-600">
                            <strong>Valid:</strong> {new Date(cls.studentCard.validFrom).toLocaleDateString()} - {new Date(cls.studentCard.validUntil).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      </div>
                      {!paymentTrackingInfo.canAccess && paymentTrackingInfo.status !== 'no-tracking' && (
                        <div className="text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">
                          ⚠️ {paymentTrackingInfo.message}
                        </div>
                      )}
                      {paymentTrackingInfo.status === 'free-period' && (
                        <div className="text-green-600 font-semibold bg-green-50 p-2 rounded border border-green-200">
                          🎉 {paymentTrackingInfo.message}
                          <div className="text-xs text-green-600 mt-1">
                            (Day {paymentTrackingInfo.currentDay} of month, {paymentTrackingInfo.freeDays} days free)
                          </div>
                        </div>
                      )}
                      {isInactive && (
                        <div className="text-red-600 font-semibold bg-red-50 p-2 rounded border border-red-200">⚠️ This class has been deactivated by the admin.</div>
                      )}
                      {cls.basePrice && cls.purchasePrice && (
                        <div className="bg-gray-50 rounded p-2 mt-2 text-xs">
                          <div><strong>Price Breakdown:</strong></div>
                          <div>Base Price: <span className="line-through text-gray-400">LKR {parseInt(cls.basePrice).toLocaleString()}</span></div>
                          {cls.theoryStudentDiscount > 0 && (
                            <div>Theory Student Discount: <span className="text-green-700">- LKR {parseInt(cls.theoryStudentDiscount).toLocaleString()}</span></div>
                          )}
                          {cls.speedPostFee > 0 && (
                            <div>Speed Post Fee: <span className="text-blue-700">+ LKR {parseInt(cls.speedPostFee).toLocaleString()}</span></div>
                          )}
                          {cls.promoDiscount > 0 && (
                            <div>Promo Discount: <span className="text-green-700">- LKR {parseInt(cls.promoDiscount).toLocaleString()}</span></div>
                          )}
                          <div className="font-bold">Final Paid: <span className="text-green-700">LKR {parseInt(cls.purchasePrice).toLocaleString()}</span></div>
                        </div>
                      )}
                    </div>
                  }
                  buttonText="View Details"
                  onButtonClick={() => handleViewDetails(cls)}
                  buttonDisabled={isSuspended || isDropped}
                >
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {canAttendToday && !isInactive && (
                      <button
                        onClick={() => handleJoinClass(cls)}
                        className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                        title="Join Class"
                      >
                        <FaPlay /> Join
                      </button>
                    )}
                    
                    {canAttendToday && !isInactive && (
                      <button
                        onClick={() => handleMarkAttendance(cls)}
                        className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                        title="Mark Attendance"
                      >
                        <FaCheckCircle /> Attend
                      </button>
                    )}
                    
                    {isInactive && (
                      <button
                        disabled
                        className="bg-gray-400 text-white text-xs px-2 py-1 rounded cursor-not-allowed flex items-center gap-1"
                        title="Class is inactive"
                      >
                        <FaTimesCircle /> Inactive
                      </button>
                    )}
                    
                    {cls.hasExams && (
                      <button
                        onClick={() => handleExamAccess(cls)}
                        className="bg-purple-600 text-white text-xs px-2 py-1 rounded hover:bg-purple-700 flex items-center gap-1"
                        title="Access Exams"
                      >
                        <FaGraduationCap /> Exams
                      </button>
                    )}
                    
                    {cls.hasTutes && (
                      <button
                        onClick={() => handleTuteAccess(cls)}
                        className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                        title="Access Tutes"
                      >
                        <FaBook /> Tutes
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleViewSchedule(cls)}
                      className="bg-gray-600 text-white text-xs px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-1"
                      title="View Schedule"
                    >
                      <FaCalendar /> Schedule
                    </button>
                    
                    <button
                      onClick={() => handleNotifications(cls)}
                      className="bg-yellow-600 text-white text-xs px-2 py-1 rounded hover:bg-yellow-700 flex items-center gap-1"
                      title="Notifications"
                    >
                      <FaBell /> Notify
                    </button>
                    
                    {!cls.forgetCardRequested && (
                      <button
                        onClick={() => handleForgetCardRequest(cls)}
                        className="bg-orange-600 text-white text-xs px-2 py-1 rounded hover:bg-orange-700 flex items-center gap-1"
                        title="Request Forget Card"
                      >
                        <FaQrcode /> Forget Card
                      </button>
                    )}
                    
                    {cls.paymentStatus === 'overdue' && !cls.latePaymentRequested && (
                      <button
                        onClick={() => handleLatePaymentRequest(cls)}
                        className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 flex items-center gap-1"
                        title="Request Late Payment"
                      >
                        <FaExclamationCircle /> Late Pay
                      </button>
                    )}
                  </div>
                </BasicCard>
              );
            })
          ) : (
            <div className="text-center text-gray-500 col-span-full mt-8">
              {selectedTab === 'all' && !searchTerm ? 'You have not purchased any classes yet.' : `No ${selectedTab} classes found.`}
              {searchTerm && <div className="mt-2">Try adjusting your search terms.</div>}
            </div>
          )}
        </div>

        {/* Forget Card Modal */}
        {showForgetCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Request Forget Card</h3>
              <p className="text-gray-600 mb-4">
                You are requesting a forget card for: <strong>{selectedClassForForgetCard?.className}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This will allow you to attend the class even if you forgot your ID card.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={submitForgetCardRequest}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowForgetCardModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Late Payment Modal */}
        {showLatePaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Request Late Payment</h3>
              <p className="text-gray-600 mb-4">
                You are requesting late payment for: <strong>{selectedClassForLatePayment?.className}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This will allow you to attend today's class without immediate payment.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={submitLatePaymentRequest}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowLatePaymentModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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
          />
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
                <div className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: <FaInfoCircle /> },
                    { id: 'schedule', label: 'Schedule', icon: <FaCalendar /> },
                    { id: 'payments', label: 'Payments', icon: <FaMoneyBill /> },
                    { id: 'payment-tracking', label: 'Payment Tracking', icon: <FaShieldAlt /> },
                    { id: 'attendance', label: 'Attendance', icon: <FaCheckCircle /> },
                    { id: 'actions', label: 'Actions', icon: <FaCog /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailsActiveTab(tab.id)}
                      className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
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
                           {formatDay(selectedClassForDetails.schedule?.day)} {formatTime(selectedClassForDetails.schedule?.startTime)}
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
                        <div><strong>Students:</strong> {selectedClassForDetails.currentStudents || 0}/{selectedClassForDetails.maxStudents}</div>
                        <div><strong>Fee:</strong> LKR {selectedClassForDetails.fee?.toLocaleString()}</div>
                        <div><strong>Purchase Date:</strong> {new Date(selectedClassForDetails.purchaseDate).toLocaleDateString()}</div>
                      </div>
                    </div>

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
                               
                               {/* Join Class Button - Only if access is granted */}
                               {(selectedClassForDetails.deliveryMethod === 'online' || selectedClassForDetails.deliveryMethod === 'hybrid') && selectedClassForDetails.zoomLink && paymentInfo.canAccess && (
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
                      </div>
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'payments' && (
                  <div className="space-y-6">
                    {/* Price Breakdown Section */}
                    {selectedClassForDetails.basePrice && selectedClassForDetails.purchasePrice && (
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FaMoneyBill /> Price Breakdown
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>Base Price:</span>
                            <span className="line-through text-gray-500">LKR {parseInt(selectedClassForDetails.basePrice).toLocaleString()}</span>
                          </div>
                          {selectedClassForDetails.theoryStudentDiscount > 0 && (
                            <div className="flex justify-between items-center text-green-700">
                              <span>Theory Student Discount:</span>
                              <span>- LKR {parseInt(selectedClassForDetails.theoryStudentDiscount).toLocaleString()}</span>
                            </div>
                          )}
                          {selectedClassForDetails.speedPostFee > 0 && (
                            <div className="flex justify-between items-center text-blue-700">
                              <span>Speed Post Fee:</span>
                              <span>+ LKR {parseInt(selectedClassForDetails.speedPostFee).toLocaleString()}</span>
                            </div>
                          )}
                          {selectedClassForDetails.promoDiscount > 0 && (
                            <div className="flex justify-between items-center text-green-700">
                              <span>Promo Discount:</span>
                              <span>- LKR {parseInt(selectedClassForDetails.promoDiscount).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between items-center font-bold text-lg">
                              <span>Final Paid:</span>
                              <span className="text-green-700">LKR {parseInt(selectedClassForDetails.purchasePrice).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                                    {new Date(payment.date).toLocaleDateString()} at {new Date(payment.date).toLocaleTimeString()}
                                  </div>
                                  {payment.invoiceId && (
                                    <div className="text-xs text-gray-500">Invoice: {payment.invoiceId}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg">LKR {parseInt(payment.amount).toLocaleString()}</div>
                                  <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                                    payment.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                Method: {payment.method === 'online' ? 'Online Payment' : payment.method}
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
                      {selectedClassForDetails.attendance && selectedClassForDetails.attendance.length > 0 ? (
                        <div className="space-y-2">
                          {selectedClassForDetails.attendance.map((record, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg">
                              <span>{new Date(record.date).toLocaleDateString()}</span>
                              <span className={`px-2 py-1 rounded text-sm ${
                                record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {record.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No attendance records available.</p>
                      )}
                    </div>
                  </div>
                )}

                {detailsActiveTab === 'actions' && (
                  <div className="space-y-6">
                    <div className="bg-orange-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FaCog /> Available Actions
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedClassForDetails.hasExams && (
                          <button className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 flex items-center gap-2">
                            <FaGraduationCap /> Access Exams
                          </button>
                        )}
                        {selectedClassForDetails.hasTutes && (
                          <button className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <FaBook /> Access Tutes
                          </button>
                        )}
                        {!selectedClassForDetails.forgetCardRequested && (
                          <button 
                            onClick={() => {
                              setShowDetailsModal(false);
                              setSelectedClassForForgetCard(selectedClassForDetails);
                              setShowForgetCardModal(true);
                            }}
                            className="bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                          >
                            <FaQrcode /> Request Forget Card
                          </button>
                        )}
                        {selectedClassForDetails.paymentStatus === 'overdue' && !selectedClassForDetails.latePaymentRequested && (
                          <button 
                            onClick={() => {
                              setShowDetailsModal(false);
                              setSelectedClassForLatePayment(selectedClassForDetails);
                              setShowLatePaymentModal(true);
                            }}
                            className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 flex items-center gap-2"
                          >
                            <FaExclamationCircle /> Request Late Payment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyClasses; 