import React, { useState, useEffect, useCallback, useRef } from 'react';
import BasicTable from '../../../components/BasicTable';
import { getAllStudents } from '../../../api/students';
import { getStudentEnrollments, updateEnrollment, dropEnrollment } from '../../../api/enrollments';
import { getStudentPayments } from '../../../api/payments';
import { getAllClasses } from '../../../api/classes';
import { FaUser, FaGraduationCap, FaMoneyBill, FaCalendar, FaPhone, FaEnvelope, FaSchool, FaMapMarkerAlt, FaSync, FaSearch, FaFilter, FaTimes, FaEdit, FaTrash, FaDownload, FaPrint, FaSave, FaCheck, FaExclamationTriangle, FaPlus, FaPauseCircle, FaExclamationCircle, FaBook, FaEye, FaList, FaTicketAlt, FaHome } from 'react-icons/fa';

const StudentsPurchasedClasses = ({ onLogout }) => {
    const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [studentDetails, setStudentDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState('');


  // Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  
  // Edit enrollment modal states
  const [showEditEnrollmentModal, setShowEditEnrollmentModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEnrollment, setDeletingEnrollment] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState({ show: false, type: '', text: '' });

  // New Enrollment State
  const [showNewEnrollmentModal, setShowNewEnrollmentModal] = useState(false);
  const [newEnrollmentData, setNewEnrollmentData] = useState({
    classId: '',
    paymentMethod: 'cash',
    amount: '',
    tuteCollectionType: 'physical',
    speedPostFee: '',
    speedPostAddress: '',
    notes: ''
  });
  const [newEnrollmentLoading, setNewEnrollmentLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Refs for uncontrolled inputs to fix typing issues
  const amountInputRef = useRef(null);
  const speedPostFeeInputRef = useRef(null);
  const speedPostAddressRef = useRef(null);
  const notesRef = useRef(null);

  // State for real-time price updates
  const [currentAmount, setCurrentAmount] = useState(0);

  // Load all students and classes
  useEffect(() => {
    loadData();
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (showNewEnrollmentModal) {
      resetNewEnrollmentForm();
      if (selectedStudent) {
        loadAvailableClasses();
      }
    }
  }, [showNewEnrollmentModal, selectedStudent]);

  // Force re-render when currentAmount changes for price summary updates
  useEffect(() => {
    // This effect will trigger re-render when currentAmount changes
  }, [currentAmount]);





  // Check if student owns the related theory class for a revision class
  const checkRelatedTheoryOwnership = (revisionClass) => {
    if (revisionClass.courseType !== 'revision' || !revisionClass.relatedTheoryId) {
      return false;
    }
    return selectedStudent.enrollments?.some(enrollment => enrollment.class_id === parseInt(revisionClass.relatedTheoryId));
  };

  // Calculate fee with discount for revision classes
  const calculateFeeWithDiscount = (cls) => {
    const originalFee = Number(cls.fee) || 0;
    let finalFee = originalFee;
    let discountInfo = null;
    let hasDiscount = false;

    // Check for revision class discount
    if (cls.courseType === 'revision' && cls.revisionDiscountPrice && checkRelatedTheoryOwnership(cls)) {
      const discount = Number(cls.revisionDiscountPrice) || 0;
      finalFee = Math.max(0, originalFee - discount);
      discountInfo = `Theory Student Discount: LKR ${discount.toLocaleString()}`;
      hasDiscount = true;
    }

    return {
      originalFee,
      finalFee,
      discountInfo,
      hasDiscount
    };
  };

  // Reset new enrollment form
  const resetNewEnrollmentForm = () => {
    setNewEnrollmentData({
      classId: '',
      paymentMethod: 'cash',
      amount: '',
      tuteCollectionType: 'physical',
      speedPostFee: '',
      speedPostAddress: '',
      notes: ''
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load students and classes in parallel
      const [studentsResponse, classesResponse] = await Promise.all([
        getAllStudents(),
        getAllClasses()
      ]);

      if (studentsResponse && classesResponse.success) {
        setStudents(studentsResponse || []);
        setClasses(classesResponse.data || []);
        
        // Load detailed data for each student
        await loadStudentDetails(studentsResponse || [], classesResponse.data || []);
    } else {
        setError('Failed to load data');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load detailed information for each student
  const loadStudentDetails = async (studentsList, classesList) => {
    const details = [];

    for (const student of studentsList) {
      try {
        // Load enrollments and payments for this student
        const [enrollmentsResponse, paymentsResponse] = await Promise.all([
          getStudentEnrollments(student.user_id),
          getStudentPayments(student.user_id)
        ]);

        const enrollments = enrollmentsResponse.success ? enrollmentsResponse.data || [] : [];
        const payments = paymentsResponse.success ? paymentsResponse.data || [] : [];

        // Create detailed student record
        const studentDetail = {
          // Student Information
          studentId: student.user_id,
          studentName: `${student.first_name} ${student.last_name}`,
          email: student.email,
          mobile: student.mobile_number,
          stream: student.stream,
          school: student.school,
          district: student.district,
          dateJoined: student.created_at,
          gender: student.gender,
          age: student.age,
          parentName: student.parent_name,
          parentMobile: student.parent_mobile_number,
          nic: student.nic,
          dateOfBirth: student.date_of_birth,
          address: student.address,
          
          // Enrollment Summary
          totalEnrollments: enrollments.length,
          activeEnrollments: enrollments.filter(e => e.status === 'active').length,
          
          // Payment Summary
          totalPayments: payments.length,
          totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
          lastPaymentDate: payments.length > 0 ? payments[0].date : null,
          
          // Detailed Data
          enrollments: enrollments,
          payments: payments,
          
          // Status
          status: 'active' // You can add logic to determine status
        };

        details.push(studentDetail);
      } catch (error) {
        console.error(`Error loading details for student ${student.user_id}:`, error);
        // Add student with basic info even if details fail to load
        details.push({
          studentId: student.user_id,
          studentName: `${student.first_name} ${student.last_name}`,
          email: student.email,
          mobile: student.mobile_number,
          stream: student.stream,
          school: student.school,
          district: student.district,
          dateJoined: student.created_at,
          gender: student.gender,
          age: student.age,
          parentName: student.parent_name,
          parentMobile: student.parent_mobile_number,
          nic: student.nic,
          dateOfBirth: student.date_of_birth,
          address: student.address,
          totalEnrollments: 0,
          activeEnrollments: 0,
          totalPayments: 0,
          totalAmount: 0,
          lastPaymentDate: null,
          enrollments: [],
          payments: [],
          status: 'active'
        });
      }
    }

    setStudentDetails(details);
  };

  // Filter students based on search term and filters
  const filteredStudents = studentDetails.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.mobile.includes(searchTerm);
    
    const matchesStream = streamFilter === '' || student.stream === streamFilter;
    
    // Filter by payment status
    const matchesPaymentStatus = paymentStatusFilter === '' || 
      student.enrollments.some(enrollment => {
        if (paymentStatusFilter === 'paid') return enrollment.payment_status === 'paid';
        if (paymentStatusFilter === 'pending') return enrollment.payment_status === 'pending';
        if (paymentStatusFilter === 'partial') return enrollment.payment_status === 'partial';
        if (paymentStatusFilter === 'overdue') return parseFloat(enrollment.fee || 0) === 0;
        return true;
      });
    
    return matchesSearch && matchesStream && matchesPaymentStatus;
  });

  // Get unique streams for filter dropdown
  const uniqueStreams = [...new Set(students.map(s => s.stream))].filter(Boolean);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date - handle timezone correctly for date-only strings
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // If it's a date-only string (YYYY-MM-DD), treat it as local date to avoid timezone issues
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-LK');
    }
    
    // For datetime strings, use the regular Date constructor
    return new Date(dateString).toLocaleDateString('en-LK');
  };

  // Get class name from enrollment data (enrollment already contains class_name)
  const getClassName = (enrollment) => {
    // If enrollment has class_name directly, use it
    if (enrollment.class_name) {
      return enrollment.class_name;
        }
    
    // Fallback to mapping from classes array if needed
    if (enrollment.class_id) {
      const cls = classes.find(c => c.id === enrollment.class_id);
      return cls ? cls.className : 'Unknown Class';
    }
    
    return 'Unknown Class';
  };

  // Show message helper
  const showMessage = (type, text) => {
    setMessage({ show: true, type, text });
    setTimeout(() => setMessage({ show: false, type: '', text: '' }), 5000);
  };

  // Payment Tracking Utility Functions
  const getPaymentTrackingInfo = (enrollment) => {
    // SPECIAL CASE 1: Free Card (overdue) - Always allow access
    if (enrollment.payment_status === 'overdue') {
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
    
    // SPECIAL CASE 2: Half Card (partial) - Check if 50% is paid
    if (enrollment.payment_status === 'partial') {
      const paidAmount = parseFloat(enrollment.paid_amount || 0);
      const totalFee = parseFloat(enrollment.total_fee || enrollment.fee || 0);
      const halfFee = totalFee / 2;
      const hasPaidHalf = paidAmount >= halfFee;
      
      if (hasPaidHalf) {
        return {
          canAccess: true,
          status: 'half-card-paid',
          message: `Half Card - 50% paid (${paidAmount.toFixed(2)}/${totalFee.toFixed(2)})`,
          daysRemaining: 999,
          nextPaymentDate: null,
          gracePeriodEndDate: null,
          freeDays: 0,
          paymentTrackingEnabled: false,
          isHalfCard: true,
          paidAmount,
          totalFee
        };
      } else {
        return {
          canAccess: false,
          status: 'half-payment-required',
          message: `Half Card - 50% payment required (${paidAmount.toFixed(2)}/${halfFee.toFixed(2)} of 50%)`,
          daysRemaining: 0,
          nextPaymentDate: null,
          gracePeriodEndDate: null,
          freeDays: 0,
          paymentTrackingEnabled: false,
          isHalfCard: true,
          paidAmount,
          requiredAmount: halfFee,
          totalFee
        };
      }
    }
    
    // Check if payment tracking is enabled for this enrollment
    const hasPaymentTracking = enrollment.payment_tracking || enrollment.payment_tracking === true || enrollment.payment_tracking?.enabled;
    
    // Both enabled and disabled payment tracking have monthly payments, but different grace periods
    const today = new Date(); // Use current date
    
    // If payment status is 'paid' but no payment history, create a basic payment record
    if (enrollment.payment_status === 'paid' && (!enrollment.payment_history || enrollment.payment_history.length === 0)) {
      // Get free days from enrollment configuration
      const freeDays = enrollment.payment_tracking_free_days || 7;
      
      // Use next payment date from enrollment data if available, otherwise calculate it
      let nextPaymentDate;
      if (enrollment.next_payment_date) {
        // Handle date-only strings correctly to avoid timezone issues
        if (enrollment.next_payment_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = enrollment.next_payment_date.split('-');
          nextPaymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          nextPaymentDate = new Date(enrollment.next_payment_date);
        }
      } else {
        // INDUSTRY STANDARD: Next payment is always 1st of next month, regardless of when class was purchased
        // This ensures consistent billing cycles and proper grace period calculation
        nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      }
      
      if (hasPaymentTracking) {
        // Payment tracking enabled: has grace period
        const gracePeriodEndDate = new Date(nextPaymentDate);
        gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + freeDays);
        
        if (today <= gracePeriodEndDate) {
          const daysRemaining = Math.ceil((gracePeriodEndDate - today) / (1000 * 60 * 60 * 24));
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
        }
      }
    }
    
    // Check if there's a payment history
    if (!enrollment.payment_history || enrollment.payment_history.length === 0) {
      // For pending payments, use the next_payment_date from enrollment data
      let nextPaymentDate = null;
      if (enrollment.next_payment_date) {
        // Handle date-only strings correctly to avoid timezone issues
        if (enrollment.next_payment_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = enrollment.next_payment_date.split('-');
          nextPaymentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          nextPaymentDate = new Date(enrollment.next_payment_date);
        }
      }
      
      return { 
        canAccess: false, 
        status: 'no-payment', 
        message: 'No payment history - payment required',
        paymentTrackingEnabled: hasPaymentTracking,
        nextPaymentDate: nextPaymentDate
      };
    }

    // Get the latest payment
    const latestPayment = enrollment.payment_history[enrollment.payment_history.length - 1];
    const paymentDate = new Date(latestPayment.date);
    
    // Check if payment tracking is enabled in the payment record
    const paymentTrackingEnabled = latestPayment.paymentTrackingEnabled !== undefined ? latestPayment.paymentTrackingEnabled : hasPaymentTracking;
    
    // Get free days from payment history or enrollment configuration
    const freeDays = latestPayment.freeDays || enrollment.payment_tracking_free_days || 7;
    
    // Use next payment date from payment history or calculate it
    let nextPaymentDate;
    if (latestPayment.nextPaymentDate) {
      nextPaymentDate = new Date(latestPayment.nextPaymentDate);
    } else {
      // INDUSTRY STANDARD: Next payment is always 1st of next month, regardless of payment date
      // This ensures consistent billing cycles and proper grace period calculation
      nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
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
      
      if (today < nextPaymentDate) {
        // Before next payment date
        const daysUntilPayment = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
        return { 
          canAccess: true, 
          status: 'paid', 
          message: `Payment completed (${daysUntilPayment} days until next payment)`,
          daysRemaining: daysRemaining,
          nextPaymentDate: nextPaymentDate,
          gracePeriodEndDate: gracePeriodEndDate,
          freeDays: freeDays,
          paymentTrackingEnabled: paymentTrackingEnabled,
          daysUntilPayment: daysUntilPayment
        };
      } else if (today >= nextPaymentDate && daysRemaining > 3) {
        // Payment due but still within grace period (more than 3 days remaining)
        return { 
          canAccess: true, 
          status: 'payment-required', 
          message: `Payment due (${daysRemaining} days remaining in grace period)`,
          daysRemaining: daysRemaining,
          nextPaymentDate: nextPaymentDate,
          gracePeriodEndDate: gracePeriodEndDate,
          freeDays: freeDays,
          paymentTrackingEnabled: paymentTrackingEnabled
        };
      } else if (daysRemaining <= 3 && daysRemaining > 0) {
        // Grace period ending soon (3 days or less remaining)
        return { 
          canAccess: true, 
          status: 'payment-required', 
          message: `Grace period ending soon (${daysRemaining} days remaining)`,
          daysRemaining: daysRemaining,
          nextPaymentDate: nextPaymentDate,
          gracePeriodEndDate: gracePeriodEndDate,
          freeDays: freeDays,
          paymentTrackingEnabled: paymentTrackingEnabled
        };
      } else {
        // Grace period expired
        return { 
          canAccess: false, 
          status: 'payment-required', 
          message: `Grace period expired - payment required immediately`,
          daysRemaining: 0,
          nextPaymentDate: nextPaymentDate,
          gracePeriodEndDate: gracePeriodEndDate,
          freeDays: freeDays,
          paymentTrackingEnabled: paymentTrackingEnabled
        };
      }
    } else {
      // Grace period expired
      return { 
        canAccess: false, 
        status: 'payment-required', 
        message: `Grace period expired - payment required immediately`,
        daysRemaining: 0,
        nextPaymentDate: nextPaymentDate,
        gracePeriodEndDate: gracePeriodEndDate,
        freeDays: freeDays,
        paymentTrackingEnabled: paymentTrackingEnabled
      };
    }
  };

  // Get enrollment status info with payment tracking
  const getEnrollmentStatusInfo = (enrollment) => {
    const paymentTrackingInfo = getPaymentTrackingInfo(enrollment);
    
    // Check for special card types first
    if (paymentTrackingInfo.isFreeCard) {
      return {
        status: 'free-card',
        color: 'bg-purple-100 text-purple-800',
        icon: <FaTicketAlt className="inline mr-1" />,
        message: 'Free Card - No payment required'
      };
    }
    
    if (paymentTrackingInfo.isHalfCard) {
      if (paymentTrackingInfo.canAccess) {
        return {
          status: 'half-card-paid',
          color: 'bg-blue-100 text-blue-800',
          icon: <FaCheck className="inline mr-1" />,
          message: 'Half Card - 50% paid'
        };
      } else {
        return {
          status: 'half-payment-required',
          color: 'bg-orange-100 text-orange-800',
          icon: <FaExclamationTriangle className="inline mr-1" />,
          message: 'Half Card - 50% payment required'
        };
      }
    }
    
    // Check enrollment status first
    if (enrollment.status === 'suspended') {
      return {
        status: 'suspended',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <FaPauseCircle className="inline mr-1" />,
        message: 'Enrollment suspended by admin'
      };
    } else if (enrollment.status === 'completed') {
      return {
        status: 'completed',
        color: 'bg-blue-100 text-blue-800',
        icon: <FaCheck className="inline mr-1" />,
        message: 'Enrollment completed'
      };
    } else if (enrollment.status === 'dropped') {
      return {
        status: 'dropped',
        color: 'bg-red-100 text-red-800',
        icon: <FaExclamationTriangle className="inline mr-1" />,
        message: 'Enrollment dropped'
      };
    } else if (enrollment.status === 'active') {
      // Check payment status for active enrollments
      if (enrollment.payment_status === 'pending') {
        return {
          status: 'payment-required',
          color: 'bg-red-100 text-red-800',
          icon: <FaExclamationCircle className="inline mr-1" />,
          message: 'Payment pending - payment required'
        };
      } else if (!paymentTrackingInfo.canAccess) {
        return {
          status: 'payment-required',
          color: 'bg-red-100 text-red-800',
          icon: <FaExclamationCircle className="inline mr-1" />,
          message: paymentTrackingInfo.message
        };
      } else {
        return {
          status: 'active',
          color: 'bg-green-100 text-green-800',
          icon: <FaCheck className="inline mr-1" />,
          message: 'Active enrollment'
        };
      }
    } else {
      return {
        status: enrollment.status || 'unknown',
        color: 'bg-gray-100 text-gray-800',
        icon: <FaExclamationTriangle className="inline mr-1" />,
        message: 'Unknown status'
      };
    }
  };

  // Action button handlers
  const handleViewDetails = (student) => {
      setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const handleManageEnrollments = (student) => {
    setSelectedStudent(student);
    setShowEnrollmentModal(true);
  };

  const handlePaymentHistory = (student) => {
        setSelectedStudent(student);
    setShowPaymentModal(true);
  };

  // Close modal handlers
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  };

  const closeEnrollmentModal = () => {
    setShowEnrollmentModal(false);
    setSelectedStudent(null);
  };

  const closePaymentModal = () => {
    setSelectedStudent(null);
    setShowPaymentModal(false);
  };

  // New Enrollment Handlers
  const handleNewEnrollment = async (student) => {
    // Reload student data to get fresh enrollment information
    try {
      const [enrollmentsResponse, paymentsResponse] = await Promise.all([
        getStudentEnrollments(student.studentId),
        getStudentPayments(student.studentId)
      ]);

      const enrollments = enrollmentsResponse.success ? enrollmentsResponse.data || [] : [];
      const payments = paymentsResponse.success ? paymentsResponse.data || [] : [];

      // Update student with fresh enrollment data
      const updatedStudent = {
        ...student,
        enrollments: enrollments,
        payments: payments,
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter(e => e.status === 'active').length,
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        lastPaymentDate: payments.length > 0 ? payments[0].date : null,
      };

      setSelectedStudent(updatedStudent);
    setShowNewEnrollmentModal(true);
    
    // Load available classes for enrollment
      await loadAvailableClasses();
    } catch (error) {
      console.error('Error loading student data for new enrollment:', error);
      showMessage('error', 'Failed to load student enrollment data');
    }
  };

  const closeNewEnrollmentModal = () => {
    setShowNewEnrollmentModal(false);
    setSelectedStudent(null);
    setNewEnrollmentData({
      classId: '',
      paymentMethod: 'cash',
      amount: '',
      tuteCollectionType: 'physical',
      speedPostFee: '',
      speedPostAddress: '',
      notes: ''
    });
    // Navigate to the students purchased classes page
    window.location.href = 'http://localhost:3000/admin/students/purchased-classes';
  };

  const loadAvailableClasses = async () => {
    try {
      setLoadingClasses(true);
      
      const response = await getAllClasses();
      
      if (response.success && response.data) {
        // Get student's current enrollment class IDs to exclude already enrolled classes
        const enrolledClassIds = selectedStudent.enrollments?.map(enrollment => parseInt(enrollment.class_id)) || [];
        
        // Filter active classes that match student's stream and are NOT already enrolled
        const availableClasses = response.data.filter(cls => {
          // Class must be active
          if (cls.status !== 'active') {
            return false;
          }
          
          // Check if student is already enrolled in this class
          const classId = parseInt(cls.id);
          const isAlreadyEnrolled = enrolledClassIds.includes(classId);
          
          // Additional check: also compare as strings in case of type mismatches
          const isAlreadyEnrolledString = enrolledClassIds.some(enrolledId => 
            enrolledId.toString() === cls.id.toString()
          );
          
          const isEnrolled = isAlreadyEnrolled || isAlreadyEnrolledString;
          
          if (isEnrolled) {
            return false;
          }
          
          // Stream matching - be more flexible
          let matchesStream = false;
          if (selectedStudent.stream) {
            // Exact match
            matchesStream = cls.stream === selectedStudent.stream;
            // Also check for partial matches
            if (!matchesStream) {
              matchesStream = cls.stream.includes(selectedStudent.stream) || 
                             selectedStudent.stream.includes(cls.stream);
            }
          } else {
            // If no stream specified, show all classes
            matchesStream = true;
          }
          
          return matchesStream && !isAlreadyEnrolled;
        });
        
        if (availableClasses.length === 0) {
          showMessage('info', 'Student is already enrolled in all available classes for their stream.');
        }
        
        setAvailableClasses(availableClasses);
      } else {
        console.error('Failed to load classes:', response);
        setAvailableClasses([]);
      }
    } catch (error) {
      console.error('Error loading available classes:', error);
      showMessage('error', 'Failed to load available classes');
      setAvailableClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleNewEnrollmentChange = useCallback((field, value) => {
    setNewEnrollmentData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleClassSelection = useCallback((classId) => {
    const selectedClass = availableClasses.find(cls => cls.id == classId);
    if (selectedClass) {
      const feeCalculation = calculateFeeWithDiscount(selectedClass);
      const finalFee = feeCalculation.finalFee;
      
      setNewEnrollmentData(prev => ({
        ...prev,
        classId: classId,
        amount: finalFee.toString() // Convert to string for editable input
      }));
      
      // Update current amount for real-time display
      setCurrentAmount(finalFee);
    } else {
      setNewEnrollmentData(prev => ({
        ...prev,
        classId: classId,
        amount: ''
      }));
      setCurrentAmount(0);
    }
  }, [availableClasses]);

  const calculateTotalAmount = () => {
    const baseAmount = parseFloat(newEnrollmentData.amount) || 0;
    const speedPostFee = parseFloat(newEnrollmentData.speedPostFee) || 0;
    return baseAmount + speedPostFee;
  };

  const handleCreateEnrollment = async () => {
    if (!newEnrollmentData.classId || !newEnrollmentData.amount) {
      showMessage('error', 'Please select a class and enter amount');
      return;
    }

    // Check if student is already enrolled in the selected class
    const selectedClassId = parseInt(newEnrollmentData.classId);
    const isAlreadyEnrolled = selectedStudent.enrollments?.some(enrollment => 
      parseInt(enrollment.class_id) === selectedClassId
    );

    if (isAlreadyEnrolled) {
      showMessage('error', 'Student is already enrolled in this class. Please select a different class.');
      return;
    }

    try {
      setNewEnrollmentLoading(true);
      
      console.log('Creating enrollment with data:', newEnrollmentData);
      console.log('Available classes:', availableClasses);
      
      const selectedClass = availableClasses.find(cls => {
        const match = cls.id === parseInt(newEnrollmentData.classId) || cls.id === newEnrollmentData.classId;
        console.log(`Looking for class ID ${newEnrollmentData.classId}, checking class ${cls.id}: ${match}`);
        return match;
      });
      
      console.log('Selected class for enrollment:', selectedClass);
      
      // Get values from uncontrolled inputs
      const amountValue = amountInputRef.current?.value || '';
      const speedPostFeeValue = speedPostFeeInputRef.current?.value || '';
      const speedPostAddressValue = speedPostAddressRef.current?.value || '';
      const notesValue = notesRef.current?.value || '';
      
      // Clean up numeric values before processing
      const cleanAmount = parseFloat(amountValue.toString().replace(/[^0-9.]/g, '')) || 0;
      const speedPostFee = newEnrollmentData.tuteCollectionType === 'speedPost' ? 300 : 0;
      
      const totalAmount = cleanAmount + speedPostFee;
      
      // Create payment record
      const paymentData = {
        studentId: selectedStudent.studentId,
        classId: parseInt(newEnrollmentData.classId),
        amount: totalAmount,
        paymentMethod: newEnrollmentData.paymentMethod,
        notes: notesValue || `Manual enrollment by admin. ${newEnrollmentData.tuteCollectionType === 'speedPost' ? `Speed Post delivery. Address: ${speedPostAddressValue}` : 'Physical class.'}`,
        status: 'paid'
      };

      // Call the payment creation API
      const response = await fetch('http://localhost:8090/routes.php/create_payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success) {
        // For cash payments, automatically process the payment
        // This will also create the enrollment automatically in the payment backend
        if (newEnrollmentData.paymentMethod === 'cash') {
          try {
            const processResponse = await fetch('http://localhost:8090/routes.php/process_payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
              body: JSON.stringify({
                transactionId: result.data.transactionId,
                paymentData: paymentData
              })
            });
            
            const processResult = await processResponse.json();
            console.log('Payment processing result:', processResult);
          } catch (processError) {
            console.error('Error processing payment:', processError);
          }
        }
        
        // Payment backend automatically creates enrollment, so we don't need to create it manually
        // Just show success message and reload data
          showMessage('success', `Enrollment created successfully! Payment: Rs. ${totalAmount}`);
          
          // Generate receipt with proper class data
          console.log('Generating receipt with class data:', selectedClass);
          generateReceipt(selectedStudent, selectedClass, paymentData, result.data, totalAmount);
          
          await loadData(); // Reload data to show new enrollment
        // Navigate to the students purchased classes page
        window.location.href = 'http://localhost:3000/admin/students/purchased-classes';
      } else {
        showMessage('error', result.message || 'Failed to create enrollment');
      }
    } catch (error) {
      console.error('Error creating enrollment:', error);
      showMessage('error', 'Failed to create enrollment');
    } finally {
      setNewEnrollmentLoading(false);
    }
  };

  const generateReceipt = (student, classData, paymentData, paymentResult, totalAmount) => {
    const receiptWindow = window.open('', '_blank');
    const receiptDate = new Date().toLocaleDateString();
    const receiptTime = new Date().toLocaleTimeString();
    
    receiptWindow.document.write(`
      <html>
        <head>
          <title>Enrollment Receipt - ${student.studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #f5f5f5;
              padding: 10px;
              font-size: 10px;
              line-height: 1.3;
            }
            .receipt {
              width: 80mm;
              max-width: 300px;
              background: white;
              margin: 0 auto;
              padding: 15px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .title {
              color: #2563eb;
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .subtitle {
              color: #6b7280;
              font-size: 10px;
            }
            .receipt-id {
              background: #2563eb;
              color: white;
              padding: 5px;
              border-radius: 4px;
              text-align: center;
              font-size: 9px;
              margin-bottom: 10px;
            }
            .section {
              margin-bottom: 8px;
            }
            .section-title {
              font-weight: bold;
              color: #374151;
              font-size: 9px;
              margin-bottom: 3px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 2px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              font-size: 9px;
            }
            .label {
              color: #6b7280;
              font-weight: 500;
            }
            .value {
              color: #374151;
              text-align: right;
            }
            .amount-box {
              background: #f0f9ff;
              border: 2px solid #2563eb;
              border-radius: 6px;
              padding: 8px;
              margin: 8px 0;
            }
            .total-amount {
              font-size: 16px;
              font-weight: bold;
              color: #2563eb;
              text-align: center;
              margin: 5px 0;
            }
            .status {
              background: #dcfce7;
              color: #166534;
              text-align: center;
              padding: 5px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: bold;
              margin: 8px 0;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              gap: 10px;
            }
            .signature {
              flex: 1;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 20px;
              margin-bottom: 3px;
            }
            .signature-text {
              font-size: 8px;
              color: #6b7280;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              font-size: 8px;
              color: #6b7280;
            }
            .divider {
              border-top: 1px dashed #d1d5db;
              margin: 5px 0;
            }
            @media print {
              body { background: white; padding: 0; }
              .receipt { 
                box-shadow: none; 
                border: 1px solid #d1d5db;
                width: 100%;
                max-width: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="title">🎓 Class Management System</div>
              <div class="subtitle">Enrollment Receipt</div>
            </div>
            
            <div class="receipt-id">
              Receipt #: ${paymentResult?.transaction_id || 'ENR-' + Date.now()}
            </div>
            
            <div class="section">
              <div class="section-title">👤 STUDENT INFO</div>
              <div class="row"><span class="label">Name:</span><span class="value">${student.studentName}</span></div>
              <div class="row"><span class="label">ID:</span><span class="value">${student.studentId}</span></div>
              <div class="row"><span class="label">Stream:</span><span class="value">${student.stream}</span></div>
              <div class="row"><span class="label">School:</span><span class="value">${student.school}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">📚 CLASS INFO</div>
              <div class="row"><span class="label">Class:</span><span class="value">${classData?.className || 'N/A'}</span></div>
              <div class="row"><span class="label">Subject:</span><span class="value">${classData?.subject || 'N/A'}</span></div>
              <div class="row"><span class="label">Teacher:</span><span class="value">${classData?.teacher || 'N/A'}</span></div>
              <div class="row"><span class="label">Method:</span><span class="value">${classData?.deliveryMethod || 'N/A'}</span></div>
            </div>
            
            <div class="amount-box">
              <div class="section-title">💰 PAYMENT DETAILS</div>
              <div class="row"><span class="label">Class Fee:</span><span class="value">Rs. ${formatCurrency(paymentData.amount - (newEnrollmentData.speedPostFee || 0))}</span></div>
              ${newEnrollmentData.speedPostFee > 0 ? `
              <div class="row"><span class="label">Speed Post:</span><span class="value">Rs. ${formatCurrency(newEnrollmentData.speedPostFee)}</span></div>
              ` : ''}
              <div class="row"><span class="label">Method:</span><span class="value">${paymentData.paymentMethod.toUpperCase()}</span></div>
              <div class="row"><span class="label">Collection:</span><span class="value">${newEnrollmentData.tuteCollectionType === 'speedPost' ? 'Speed Post' : 'Physical'}</span></div>
              <div class="total-amount">Total: Rs. ${formatCurrency(totalAmount)}</div>
            </div>
            
            <div class="status">✅ PAYMENT COMPLETED</div>
            
            <div class="section">
              <div class="section-title">📅 ENROLLMENT INFO</div>
              <div class="row"><span class="label">Date:</span><span class="value">${receiptDate}</span></div>
              <div class="row"><span class="label">Time:</span><span class="value">${receiptTime}</span></div>
              <div class="row"><span class="label">By:</span><span class="value">Administrator</span></div>
            </div>
            
            ${paymentData.notes ? `
            <div class="section">
              <div class="section-title">📝 NOTES</div>
              <div style="background: #f9fafb; padding: 5px; border-radius: 3px; font-size: 8px; color: #6b7280;">
                ${paymentData.notes}
              </div>
            </div>
            ` : ''}
            
            <div class="signatures">
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">Student</div>
              </div>
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">Admin</div>
              </div>
            </div>
            
            <div class="footer">
              <div>Thank you for enrolling!</div>
              <div>Generated: ${receiptDate} ${receiptTime}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    receiptWindow.document.close();
    receiptWindow.print();
  };

  // Enrollment action handlers
  const handleEditEnrollment = (enrollment) => {
    setEditingEnrollment(enrollment);
    setEditFormData({
      status: enrollment.status || 'active',
      payment_status: enrollment.payment_status || 'paid',
      notes: enrollment.notes || ''
    });
    setShowEditEnrollmentModal(true);
  };

  const handleDeleteEnrollment = (enrollment) => {
    setDeletingEnrollment(enrollment);
    setShowDeleteModal(true);
  };

  // Helper function to refresh selected student details
  const refreshSelectedStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      const [enrollmentsResponse, paymentsResponse] = await Promise.all([
        getStudentEnrollments(selectedStudent.studentId),
        getStudentPayments(selectedStudent.studentId)
      ]);

      const enrollments = enrollmentsResponse.success ? enrollmentsResponse.data || [] : [];
      const payments = paymentsResponse.success ? paymentsResponse.data || [] : [];

      // Update the selected student with fresh data
      setSelectedStudent(prev => ({
        ...prev,
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter(e => e.status === 'active').length,
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        lastPaymentDate: payments.length > 0 ? payments[0].date : null,
        enrollments: enrollments,
        payments: payments
      }));
    } catch (error) {
      console.error('Error refreshing selected student details:', error);
    }
  };

  // Real delete enrollment
  const confirmDeleteEnrollment = async () => {
    if (!deletingEnrollment) return;

    try {
      setDeleteLoading(true);
      const response = await dropEnrollment(deletingEnrollment.id);
      
      if (response.success) {
        showMessage('success', `Enrollment for ${getClassName(deletingEnrollment)} deleted successfully`);
        // Reload data to reflect changes
        await loadData();
        
        // If we're viewing a specific student, refresh their details
        await refreshSelectedStudent();
        
        setShowDeleteModal(false);
        setDeletingEnrollment(null);
      } else {
        showMessage('error', response.message || 'Failed to delete enrollment');
      }
      } catch (error) {
      console.error('Error deleting enrollment:', error);
      showMessage('error', 'Failed to delete enrollment');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Real update enrollment
  const handleUpdateEnrollment = async () => {
    if (!editingEnrollment) return;

    try {
      setEditLoading(true);
      setEditError(null);

      const response = await updateEnrollment(editingEnrollment.id, editFormData);
      
      if (response.success) {
        showMessage('success', `Enrollment for ${getClassName(editingEnrollment)} updated successfully`);
        // Reload data to reflect changes
        await loadData();
        
        // If we're viewing a specific student, refresh their details
        await refreshSelectedStudent();
        
        setShowEditEnrollmentModal(false);
        setEditingEnrollment(null);
        setEditFormData({});
      } else {
        setEditError(response.message || 'Failed to update enrollment');
      }
    } catch (error) {
      console.error('Error updating enrollment:', error);
      setEditError('Failed to update enrollment');
    } finally {
      setEditLoading(false);
    }
  };

  // Payment action handlers
  const handleDownloadPayment = (payment) => {
    const paymentData = {
      transactionId: payment.transaction_id,
      date: payment.date,
      studentName: selectedStudent?.studentName,
      studentId: selectedStudent?.studentId,
      className: payment.class_name,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      status: payment.status,
      referenceNumber: payment.reference_number
    };
    
    const blob = new Blob([JSON.stringify(paymentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_${payment.transaction_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('success', 'Payment receipt downloaded successfully');
  };

  const handleProcessPayment = async (enrollment) => {
    setProcessingPayment(true);
    try {
      // Get class details for payment amount
      const classData = availableClasses.find(c => c.id === enrollment.class_id);
      const paymentAmount = classData?.fee || enrollment.total_fee || 0;
      
      // Calculate next payment date (1st of next month)
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      nextPaymentDate.setDate(1);
      
      // Create payment record
      const paymentResponse = await fetch('http://localhost:8090/routes.php/create_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          classId: enrollment.class_id,
          amount: paymentAmount,
          paymentMethod: 'admin_processed',
          notes: `Next month payment processed by admin for ${getClassName(enrollment)} - Due: ${nextPaymentDate.toISOString().split('T')[0]}`
        })
      });

      if (paymentResponse.ok) {
        // Update enrollment payment status and next payment date
        const enrollmentResponse = await fetch(`http://localhost:8087/routes.php/update_enrollment/${enrollment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_status: 'paid',
            status: 'active',
            next_payment_date: nextPaymentDate.toISOString().split('T')[0]
          })
        });

        if (enrollmentResponse.ok) {
          showMessage('success', `Next month payment processed successfully for ${getClassName(enrollment)}. Next payment due: ${nextPaymentDate.toLocaleDateString()}`);
          loadData(); // Refresh the data
        } else {
          showMessage('error', 'Failed to update enrollment status');
        }
      } else {
        showMessage('error', 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showMessage('error', 'Error processing payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrintPayment = (payment) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${payment.transaction_id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .receipt { border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; }
            .amount { font-size: 24px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
            .status { text-align: center; margin: 10px 0; }
            .status.paid { color: #28a745; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Receipt</h1>
            <h2>Class Management System</h2>
      </div>
          
          <div class="receipt">
            <div class="amount">${formatCurrency(payment.amount)}</div>
            <div class="status ${payment.status}">Status: ${payment.status.toUpperCase()}</div>
            
            <div class="info-row">
              <span class="label">Transaction ID:</span>
              <span>${payment.transaction_id}</span>
      </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span>${formatDate(payment.date)}</span>
      </div>
            <div class="info-row">
              <span class="label">Student Name:</span>
              <span>${selectedStudent?.studentName}</span>
      </div>
            <div class="info-row">
              <span class="label">Student ID:</span>
              <span>${selectedStudent?.studentId}</span>
      </div>
            <div class="info-row">
              <span class="label">Class:</span>
              <span>${payment.class_name}</span>
    </div>
            <div class="info-row">
              <span class="label">Payment Method:</span>
              <span>${payment.payment_method}</span>
          </div>
            <div class="info-row">
              <span class="label">Reference Number:</span>
              <span>${payment.reference_number}</span>
        </div>
      </div>
          
          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    showMessage('success', 'Payment receipt sent to printer');
  };

  // Export functions
  

  const printStudentReport = (student) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Student Report - ${student.studentName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
            .info-row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 150px; }
            .value { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; }
            .total { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Report</h1>
            <h2>${student.studentName} (${student.studentId})</h2>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h3>Personal Information</h3>
            <div class="info-row"><span class="label">Name:</span><span class="value">${student.studentName}</span></div>
            <div class="info-row"><span class="label">Student ID:</span><span class="value">${student.studentId}</span></div>
            <div class="info-row"><span class="label">Email:</span><span class="value">${student.email}</span></div>
            <div class="info-row"><span class="label">Mobile:</span><span class="value">${student.mobile}</span></div>
            <div class="info-row"><span class="label">Stream:</span><span class="value">${student.stream}</span></div>
            <div class="info-row"><span class="label">School:</span><span class="value">${student.school}</span></div>
            <div class="info-row"><span class="label">District:</span><span class="value">${student.district}</span></div>
            <div class="info-row"><span class="label">Address:</span><span class="value">${student.address}</span></div>
            <div class="info-row"><span class="label">Date Joined:</span><span class="value">${formatDate(student.dateJoined)}</span></div>
        </div>

          <div class="section">
            <h3>Enrollment Summary</h3>
            <div class="info-row"><span class="label">Total Enrollments:</span><span class="value">${student.totalEnrollments}</span></div>
            <div class="info-row"><span class="label">Active Enrollments:</span><span class="value">${student.activeEnrollments}</span></div>
              </div>
          
          <div class="section">
            <h3>Payment Summary</h3>
            <div class="info-row"><span class="label">Total Payments:</span><span class="value">${student.totalPayments}</span></div>
            <div class="info-row"><span class="label">Total Amount:</span><span class="value">${formatCurrency(student.totalAmount)}</span></div>
            <div class="info-row"><span class="label">Last Payment:</span><span class="value">${formatDate(student.lastPaymentDate)}</span></div>
              </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    showMessage('success', 'Student report sent to printer');
  };

  // Table columns configuration
  const columns = [
    {
      key: 'studentInfo',
      label: 'Student Information',
      render: (row) => (
        <div className="space-y-1">
          <div className="font-semibold text-blue-600">{row.studentName}</div>
          <div className="text-sm text-gray-600">ID: {row.studentId}</div>
          
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <FaEnvelope className="text-gray-400" />
            {row.email}
            </div>
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <FaPhone className="text-gray-400" />
            {row.mobile}
          </div>
              </div>
      )
    },
    {
      key: 'academicInfo',
      label: 'Academic Details',
      render: (row) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">Stream:</span> 
            <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {row.stream}
            </span>
              </div>
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <FaSchool className="text-gray-400" />
            {row.school}
            </div>
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <FaMapMarkerAlt className="text-gray-400" />
            {row.district}
          </div>
          <div className="text-sm text-gray-600">
            Joined: {formatDate(row.dateJoined)}
              </div>
              </div>
      )
    },
    {
      key: 'enrollmentSummary',
      label: 'Enrollment Summary',
      render: (row) => (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Enrollments:</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">
              {row.totalEnrollments}
            </span>
            </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Active:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
              {row.activeEnrollments}
            </span>
          </div>
          {row.enrollments.length > 0 && (
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">Recent Classes:</div>
              {row.enrollments.slice(0, 2).map((enrollment, index) => (
                <div key={index} className="mb-1">
                  • {getClassName(enrollment)}
              </div>
              ))}
              {row.enrollments.length > 2 && (
                <div className="text-gray-500">+{row.enrollments.length - 2} more</div>
        )}
              </div>
          )}
            </div>
      )
    },
    {
      key: 'paymentSummary',
      label: 'Payment Summary',
      render: (row) => {
        // Calculate payment tracking summary
        const paymentRequiredCount = row.enrollments.filter(e => {
          const paymentTrackingInfo = getPaymentTrackingInfo(e);
          return !paymentTrackingInfo.canAccess && paymentTrackingInfo.status === 'payment-required';
        }).length;
        
        const gracePeriodExpiredCount = row.enrollments.filter(e => {
          const paymentTrackingInfo = getPaymentTrackingInfo(e);
          return !paymentTrackingInfo.canAccess && paymentTrackingInfo.daysRemaining === 0;
        }).length;
        
        return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Payments:</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-semibold">
              {row.totalPayments}
      </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Amount:</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">
              {formatCurrency(row.totalAmount)}
      </span>
        </div>
            
            {/* Payment Tracking Alerts */}
            {paymentRequiredCount > 0 && (
              <div className="text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <FaExclamationCircle className="text-red-500" />
                  <span className="font-medium text-red-600">Payment Required:</span>
                </div>
                <div className="px-2 py-1 bg-red-50 border border-red-200 rounded">
                  <span className="text-red-700 font-semibold">{paymentRequiredCount}</span> enrollment{paymentRequiredCount > 1 ? 's' : ''} need{paymentRequiredCount > 1 ? '' : 's'} payment
                </div>
              </div>
            )}
            
            {gracePeriodExpiredCount > 0 && (
              <div className="text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <FaExclamationTriangle className="text-orange-500" />
                  <span className="font-medium text-orange-600">Grace Period Expired:</span>
                </div>
                <div className="px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                  <span className="text-orange-700 font-semibold">{gracePeriodExpiredCount}</span> enrollment{gracePeriodExpiredCount > 1 ? 's' : ''} expired
                </div>
              </div>
            )}
            
          {row.lastPaymentDate && (
            <div className="text-xs text-gray-600">
              <div className="font-medium">Last Payment:</div>
              <div className="flex items-center gap-1">
                <FaCalendar className="text-gray-400" />
                {formatDate(row.lastPaymentDate)}
      </div>
            </div>
          )}
            
          {row.payments.length > 0 && (
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">Recent Payments:</div>
              {row.payments
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, most recent first
                .slice(0, 3)
                .map((payment, index) => (
                <div key={index} className="mb-1">
                  {index === 0 && <span className="font-medium text-green-600">● Latest:</span>}
                  {index === 1 && <span className="font-medium text-blue-600">● 2nd:</span>}
                  {index === 2 && <span className="font-medium text-purple-600">● 3rd:</span>}
                  {' '}{formatCurrency(payment.amount)} ({payment.payment_method}) - {formatDate(payment.date)}
          </div>
              ))}
              {row.payments.length > 3 && (
                <div className="text-gray-500 mt-1">
                  +{row.payments.length - 3} more payments
                </div>
              )}
            </div>
          )}
        </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="space-y-2">
      <button
            className="w-full px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
            onClick={() => handleViewDetails(row)}
            title="View complete student details"
          >
            <FaUser className="text-xs" />
            View Details
      </button>
            <button
            className="w-full px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
            onClick={() => handleManageEnrollments(row)}
            title="Manage class enrollments"
            >
            <FaGraduationCap className="text-xs" />
            Manage Enrollments
            </button>
        <button 
            className="w-full px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
            onClick={() => handlePaymentHistory(row)}
            title="View payment history"
        >
            <FaMoneyBill className="text-xs" />
            Payment History
        </button>
          <div className="flex gap-1 mt-2">
        
      </div>
        </div>
      )
    }
  ];

  // Modal Components
  const DetailsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Student Details</h2>
                <button
            onClick={closeDetailsModal}
            className="text-gray-500 hover:text-gray-700"
                >
            <FaTimes className="text-xl" />
                </button>
            </div>

        {selectedStudent && (
            <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
                <div className="space-y-2">
                  <div><span className="font-medium">Name:</span> {selectedStudent.studentName}</div>
                  <div><span className="font-medium">Student ID:</span> {selectedStudent.studentId}</div>
                  <div><span className="font-medium">Email:</span> {selectedStudent.email}</div>
                  <div><span className="font-medium">Mobile:</span> {selectedStudent.mobile}</div>
                  <div><span className="font-medium">NIC:</span> {selectedStudent.nic || 'N/A'}</div>
                  <div><span className="font-medium">Gender:</span> {selectedStudent.gender}</div>
                  <div><span className="font-medium">Age:</span> {selectedStudent.age}</div>
                  <div><span className="font-medium">Date of Birth:</span> {formatDate(selectedStudent.dateOfBirth)}</div>
            </div>
          </div>
          
              {/* Academic Information */}
                  <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Academic Information</h3>
                <div className="space-y-2">
                  <div><span className="font-medium">Stream:</span> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{selectedStudent.stream}</span></div>
                  <div><span className="font-medium">School:</span> {selectedStudent.school}</div>
                  <div><span className="font-medium">District:</span> {selectedStudent.district}</div>
                  <div><span className="font-medium">Date Joined:</span> {formatDate(selectedStudent.dateJoined)}</div>
                      </div>
                      
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Parent Information</h3>
                <div className="space-y-2">
                  <div><span className="font-medium">Parent Name:</span> {selectedStudent.parentName}</div>
                  <div><span className="font-medium">Parent Mobile:</span> {selectedStudent.parentMobile}</div>
                              </div>
                            </div>
      </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Address</h3>
              <p className="text-gray-700">{selectedStudent.address}</p>
          </div>
          
            <div className="mt-6 flex gap-3">
              
            <button
                onClick={() => printStudentReport(selectedStudent)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
                <FaPrint />
                Print Report
            </button>
          </div>
                        </div>
                      )}
                    </div>
      </div>
  );

  const EnrollmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Enrollment Management</h2>
            <button
            onClick={() => setShowEnrollmentModal(false)}
            className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
            >
            <FaTimes className="mr-2 text-sm" />
            Close
            </button>
        </div>

        {selectedStudent && (
            <div className="p-6">
                         {/* Modern Enrollment Management Dashboard */}
             <div className="mb-8">
               {/* Header with Actions */}
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-2xl font-bold text-gray-900 mb-1">
                     {selectedStudent.studentName}
                  </h3>
                   <p className="text-gray-600">Enrollment Management & Analytics</p>
                 </div>
                 <div className="flex items-center space-x-3">
                   <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                     <span className="text-sm font-medium text-green-700">Active Student</span>
                   </div>
                   
            <button
                     onClick={() => setShowNewEnrollmentModal(true)}
                     className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
                     <FaPlus className="mr-2 text-sm" />
                     New Enrollment
            </button>
                              </div>
                              </div>

               {/* Compact Analytics Cards */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                 <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                   <div className="flex items-center justify-between">
                     <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                       <FaGraduationCap className="text-white text-sm" />
                              </div>
                     <div className="text-right">
                       <div className="text-lg font-bold text-blue-600">{selectedStudent.totalEnrollments}</div>
                       <div className="text-xs text-blue-600">Total</div>
                              </div>
                   </div>
                   <div className="text-xs text-blue-700 font-medium mt-1">Total Enrollments</div>
                 </div>
                 
                 <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                   <div className="flex items-center justify-between">
                     <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                       <FaCheck className="text-white text-sm" />
                     </div>
                     <div className="text-right">
                       <div className="text-lg font-bold text-green-600">{selectedStudent.activeEnrollments}</div>
                       <div className="text-xs text-green-600">Active</div>
                     </div>
                   </div>
                   <div className="text-xs text-green-700 font-medium mt-1">Active Enrollments</div>
                 </div>
                 
                 <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                   <div className="flex items-center justify-between">
                     <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                       <FaPauseCircle className="text-white text-sm" />
                     </div>
                     <div className="text-right">
                       <div className="text-lg font-bold text-purple-600">
                     {selectedStudent.enrollments.filter(e => e.status !== 'active').length}
                              </div>
                       <div className="text-xs text-purple-600">Inactive</div>
                              </div>
                            </div>
                   <div className="text-xs text-purple-700 font-medium mt-1">Inactive Enrollments</div>
                          </div>
                          
                 <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200">
                   <div className="flex items-center justify-between">
                     <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                       <FaExclamationTriangle className="text-white text-sm" />
                     </div>
                     <div className="text-right">
                       <div className="text-lg font-bold text-orange-600">
                         {selectedStudent.enrollments.filter(e => {
                           // Free Card (overdue) - no payment required
                           if (e.payment_status === 'overdue') return false;
                           
                           // Half Card (partial) - check if 50% is paid
                           if (e.payment_status === 'partial') {
                             const totalFee = parseFloat(e.total_fee || e.fee || 0);
                             const paidAmount = parseFloat(e.paid_amount || 0);
                             const halfFee = totalFee / 2;
                             return paidAmount < halfFee; // Only needs payment if less than 50% paid
                           }
                           
                           // Regular payment tracking for non-special cards
                           const paymentTrackingInfo = getPaymentTrackingInfo(e);
                           return (!paymentTrackingInfo.canAccess && paymentTrackingInfo.status === 'payment-required') || 
                                  (e.payment_status === 'pending');
                         }).length}
                       </div>
                       <div className="text-xs text-orange-600">Required</div>
                     </div>
                   </div>
                   <div className="text-xs text-orange-700 font-medium mt-1">Payment Required</div>
                 </div>
               </div>
               
               {/* Compact Status Bar */}
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="flex items-center space-x-2">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                       <span className="text-xs font-medium text-gray-700">
                         {selectedStudent.enrollments.length} Active Enrollments
                       </span>
                     </div>
                     <div className="h-3 w-px bg-gray-300"></div>
                     <div className="flex items-center space-x-1">
                       <FaCalendar className="text-blue-500 text-xs" />
                       <span className="text-xs text-gray-600">
                         Updated: {new Date().toLocaleTimeString()}
                       </span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

               {/* Search Bar for Enrollments */}
               <div className="mb-6">
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <FaSearch className="text-gray-400" />
                   </div>
                   <input
                     type="text"
                     value={enrollmentSearchTerm}
                     onChange={(e) => setEnrollmentSearchTerm(e.target.value)}
                     placeholder="Search classes by name, subject, teacher, course type..."
                     className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   />
                   {enrollmentSearchTerm && (
                     <button
                       onClick={() => setEnrollmentSearchTerm('')}
                       className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                     >
                       <FaTimes />
                     </button>
                   )}
                 </div>
               </div>
                          
                         {/* Modern Enrollment Cards Grid */}
            {selectedStudent.enrollments.length > 0 ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                 {selectedStudent.enrollments.filter(enrollment => {
                   if (!enrollmentSearchTerm) return true;
                   const searchLower = enrollmentSearchTerm.toLowerCase();
                   const className = getClassName(enrollment).toLowerCase();
                   const subject = (enrollment.subject || '').toLowerCase();
                   const teacher = (enrollment.teacher || '').toLowerCase();
                   const courseType = (enrollment.course_type || '').toLowerCase();
                   const deliveryMethod = (enrollment.delivery_method || '').toLowerCase();
                   
                   return className.includes(searchLower) ||
                          subject.includes(searchLower) ||
                          teacher.includes(searchLower) ||
                          courseType.includes(searchLower) ||
                          deliveryMethod.includes(searchLower);
                 }).map((enrollment, index) => {
                   const statusInfo = getEnrollmentStatusInfo(enrollment);
                   const paymentTrackingInfo = getPaymentTrackingInfo(enrollment);
                   const isUrgent = paymentTrackingInfo.daysRemaining <= 3 && paymentTrackingInfo.daysRemaining > 0;
                   const isExpired = paymentTrackingInfo.daysRemaining === 0;
                   
                   return (
                     <div 
                       key={index} 
                       className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                         isUrgent ? 'border-orange-200 bg-orange-50' :
                         isExpired ? 'border-red-200 bg-red-50' :
                         'border-gray-200 hover:border-blue-200'
                       }`}
                     >
                       {/* Card Header */}
                       {/* Header Section - Compact */}
                       <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex-1">
                             <div className="flex items-center space-x-2 mb-1">
                               <h4 className="text-lg font-semibold text-gray-900">
                                 {getClassName(enrollment)}
                               </h4>
                             </div>
                             <p className="text-sm text-gray-600">
                               {enrollment.subject || 'General Subject'} • {enrollment.teacher || 'Teacher TBD'}
                             </p>
                             <div className="flex items-center space-x-2 mt-1">
                               {enrollment.course_type && (
                                 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                   enrollment.course_type === 'revision' 
                                     ? 'bg-purple-100 text-purple-700' 
                                     : 'bg-blue-100 text-blue-700'
                                 }`}>
                                   {enrollment.course_type === 'revision' ? '📚 Revision' : '📖 Theory'}
                           </span>
                               )}
                               {enrollment.delivery_method && (
                                 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                   {enrollment.delivery_method === 'online' ? '🌐 Online' :
                                    enrollment.delivery_method === 'physical' ? '🏢 Physical' :
                                    enrollment.delivery_method === 'hybrid' ? '🔄 Hybrid' :
                                    enrollment.delivery_method}
                                 </span>
                               )}
                             </div>
                           </div>
                           <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                             {statusInfo.icon}
                             {statusInfo.status}
                           </span>
                         </div>
                         
                         {/* Quick Info Row */}
                         <div className="flex items-center space-x-3 text-xs text-gray-500">
                           <div className="flex items-center space-x-1">
                             <FaCalendar className="text-gray-400" />
                             <span>{formatDate(enrollment.enrollment_date)}</span>
                           </div>
                           <div className="flex items-center space-x-1">
                             <FaMoneyBill className="text-gray-400" />
                             <span className={`font-medium ${
                               enrollment.payment_status === 'paid' 
                                 ? 'text-green-600' 
                                 : enrollment.payment_status === 'pending'
                                 ? 'text-yellow-600'
                                 : enrollment.payment_status === 'partial'
                                 ? 'text-blue-600'
                                 : 'text-red-600'
                             }`}>
                               {enrollment.payment_status || 'Not specified'}
                             </span>
                           </div>
                         </div>
                       </div>

                       {/* Payment Information - Compact */}
                       <div className="p-4">
                         <div className="grid grid-cols-2 gap-4">
                           {/* Fee Summary */}
                           <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-xs font-medium text-green-700">Fee Summary</span>
                               <FaMoneyBill className="text-green-600 text-xs" />
                             </div>
                             <div className="space-y-1">
                               {(() => {
                                 const totalFee = parseFloat(enrollment.total_fee || enrollment.fee || 0);
                                 let displayFee = totalFee;
                                 let cardType = null;
                                 
                                 // Check for special card types
                                 if (enrollment.payment_status === 'overdue') {
                                   // Free Card - No payment required
                                   displayFee = 0;
                                   cardType = 'Free Card';
                                 } else if (enrollment.payment_status === 'partial') {
                                   // Half Card - Only 50% required
                                   displayFee = totalFee / 2;
                                   cardType = 'Half Card';
                                 }
                                 
                                 return (
                                   <>
                                     {cardType && (
                                       <div className="flex justify-between text-xs mb-2 pb-2 border-b border-green-200">
                                         <span className="text-purple-600 font-semibold">{cardType}</span>
                                         <span className="text-purple-600 text-[10px]">
                                           {cardType === 'Free Card' ? '100% OFF' : '50% OFF'}
                                         </span>
                                       </div>
                                     )}
                                     {cardType && (
                                       <div className="flex justify-between text-xs mb-1">
                                         <span className="text-gray-500 text-[10px]">Original Fee:</span>
                                         <span className="text-gray-400 text-[10px] line-through">
                                           {formatCurrency(totalFee)}
                                         </span>
                                       </div>
                                     )}
                                     <div className="flex justify-between items-center">
                                       <span className="text-sm font-medium text-gray-700">Total:</span>
                                       <span className={`text-lg font-bold ${
                                         cardType === 'Free Card' ? 'text-purple-600' :
                                         cardType === 'Half Card' ? 'text-blue-600' :
                                         'text-gray-900'
                                       }`}>
                                         {formatCurrency(displayFee)}
                                       </span>
                                     </div>
                                   </>
                                 );
                               })()}
                             </div>
                           </div>
                           
                           {/* Payment Details */}
                           <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-xs font-medium text-blue-700">Payment Info</span>
                               <FaCalendar className="text-blue-600 text-xs" />
                             </div>
                             <div className="space-y-1">
                               {(() => {
                                 const payment = selectedStudent.payments?.find(p => p.class_id === enrollment.class_id);
                                 let paymentMethod = payment?.payment_method || enrollment.payment_method;
                                 
                                 if (!paymentMethod && enrollment.payment_history_details) {
                                   try {
                                     const paymentHistory = enrollment.payment_history_details.split('|').map(p => {
                                       try {
                                         return JSON.parse(p);
                                       } catch (e) {
                                         return null;
                                       }
                                     }).filter(p => p);
                                     
                                     if (paymentHistory.length > 0) {
                                       paymentMethod = paymentHistory[0].payment_method;
                                     }
                                   } catch (e) {
                                     console.error('Error parsing payment history:', e);
                                   }
                                 }
                                 
                                 return paymentMethod ? (
                                   <div className="flex justify-between text-xs">
                                     <span className="text-gray-600">Method:</span>
                                     <span className="font-semibold text-blue-600">
                                       {paymentMethod === 'cash' ? '💵 Cash' :
                                        paymentMethod === 'online' ? '🌐 Online' :
                                        paymentMethod === 'card' ? '💳 Card' :
                                        paymentMethod === 'bank_transfer' ? '🏦 Bank' :
                                        paymentMethod}
                                     </span>
                                   </div>
                                 ) : null;
                               })()}
                             </div>
                           </div>
                         </div>
                       </div>

                           {/* Next Payment Status - Compact */}
                           {paymentTrackingInfo.nextPaymentDate && (
                             <div className="px-4 pb-4">
                               <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border border-orange-200">
                                 <div className="flex items-center justify-between mb-2">
                                   <span className="text-xs font-medium text-orange-700">Next Payment</span>
                                   <span className="text-xs font-semibold text-gray-900">
                                     {paymentTrackingInfo.nextPaymentDate.toLocaleDateString()}
                                   </span>
                                 </div>
                                 
                                 {paymentTrackingInfo.daysRemaining > 0 && (
                                   <div className="flex items-center justify-between">
                                     <div className="flex items-center space-x-2">
                                       <div className={`w-2 h-2 rounded-full ${
                                         paymentTrackingInfo.daysRemaining <= 3 
                                           ? 'bg-orange-500 animate-pulse' 
                                           : paymentTrackingInfo.daysRemaining <= 7 
                                           ? 'bg-yellow-500'
                                           : 'bg-green-500'
                                       }`}></div>
                                       <span className="text-xs font-medium text-gray-700">
                                         {paymentTrackingInfo.daysRemaining <= 3 
                                           ? `${paymentTrackingInfo.daysRemaining} days to pay`
                                           : paymentTrackingInfo.daysRemaining <= 7 
                                           ? `${paymentTrackingInfo.daysRemaining} days grace`
                                           : `${paymentTrackingInfo.daysRemaining} days until due`
                                         }
                                       </span>
                                     </div>
                                     {paymentTrackingInfo.daysRemaining <= 3 && (
                                       <FaExclamationTriangle className="text-orange-500 text-xs" />
                                     )}
                                   </div>
                                 )}
                                 
                                 {paymentTrackingInfo.daysRemaining === 0 && (
                                   <div className="flex items-center justify-between">
                                     <div className="flex items-center space-x-2">
                                       <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                       <span className="text-xs font-medium text-red-700">
                                         Grace period expired
                                       </span>
                                     </div>
                                     <FaExclamationCircle className="text-red-500 text-xs" />
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}

                       {/* Action Buttons */}
                       <div className="px-6 pb-6">
                         <div className="flex items-center space-x-2">
                             <button 
                               onClick={() => handleEditEnrollment(enrollment)}
                             className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                             >
                             <FaEdit className="mr-2 text-xs" />
                             Edit
                             </button>
                             <button 
                               onClick={() => handleDeleteEnrollment(enrollment)}
                             className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                             >
                             <FaTrash className="mr-2 text-xs" />
                             Delete
                             </button>
                           {paymentTrackingInfo.status === 'payment-required' && (
                             <button 
                               onClick={() => handleProcessPayment(enrollment)}
                               disabled={processingPayment}
                               className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                 processingPayment 
                                   ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                   : paymentTrackingInfo.daysRemaining <= 3
                                   ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                   : paymentTrackingInfo.daysRemaining <= 7
                                   ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                                   : 'bg-green-50 text-green-700 hover:bg-green-100'
                               }`}
                             >
                               {processingPayment ? (
                                 <>
                                   <FaSync className="mr-2 text-xs animate-spin" />
                                   Processing...
                                 </>
                               ) : (
                                 <>
                                   <FaMoneyBill className="mr-2 text-xs" />
                                   {paymentTrackingInfo.daysRemaining <= 3 ? 'Pay Now' : 'Pay'}
                                 </>
                               )}
                             </button>
                           )}
                              </div>
                       </div>
                     </div>
                   );
                 })}
                              </div>
            ) : enrollmentSearchTerm ? (
               <div className="text-center py-12">
                 <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                   <FaSearch className="text-gray-400 text-3xl" />
                 </div>
                 <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                 <p className="text-gray-500 mb-6">No enrollments match your search "{enrollmentSearchTerm}"</p>
                 <button
                   onClick={() => setEnrollmentSearchTerm('')}
                   className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                 >
                   <FaTimes className="mr-2" />
                   Clear Search
                 </button>
                              </div>
            ) : (
               <div className="text-center py-12">
                 <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                   <FaGraduationCap className="text-gray-400 text-3xl" />
                 </div>
                 <h3 className="text-lg font-medium text-gray-900 mb-2">No Enrollments Found</h3>
                 <p className="text-gray-500 mb-6">This student hasn't enrolled in any classes yet.</p>
                 <button
                   onClick={() => setShowNewEnrollmentModal(true)}
                   className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                 >
                   <FaPlus className="mr-2" />
                   Create First Enrollment
                 </button>
                              </div>
            )}
                              </div>
        )}
                              </div>
                            </div>
  );

  const PaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto ">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Payment History</h2>
          <button
            onClick={closePaymentModal}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="text-xl" />
          </button>
                          </div>
                          
        {selectedStudent && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedStudent.studentName} - Payment Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{selectedStudent.totalPayments}</div>
                  <div className="text-sm text-gray-600">Total Payments</div>
                        </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedStudent.totalAmount)}</div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                      </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{formatDate(selectedStudent.lastPaymentDate)}</div>
                  <div className="text-sm text-gray-600">Last Payment</div>
                              </div>
                  </div>
                </div>

            {selectedStudent.payments.length > 0 ? (
              <BasicTable
                columns={[
                  {
                    key: 'date',
                    label: 'Date',
                    render: (payment) => formatDate(payment.date)
                  },
                  {
                    key: 'transaction_id',
                    label: 'Transaction ID',
                    render: (payment) => (
                      <span className="font-mono text-sm">{payment.transaction_id}</span>
                    )
                  },
                  {
                    key: 'class_name',
                    label: 'Class',
                    render: (payment) => {
                      // Show payment type for admission fees
                      if (payment.payment_type === 'admission_fee') {
                        return (
                          <div className="flex flex-col space-y-1">
                            <span className="font-medium">{payment.class_name}</span>
                            <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 w-fit">
                              Admission Fee
                            </span>
                          </div>
                        );
                      }
                      return payment.class_name;
                    }
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    render: (payment) => (
                      <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                    )
                  },
                  {
                    key: 'payment_method',
                    label: 'Method',
                    render: (payment) => (
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.payment_method === 'online' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {payment.payment_method}
                          </span>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (payment) => (
                          <span className={`px-2 py-1 rounded text-xs ${
                            payment.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                    )
                  }
                ]}
                data={selectedStudent.payments}
                actions={(payment) => (
                           <div className="flex gap-2">
                             <button 
                               className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                               onClick={() => handlePrintPayment(payment)}
                               title="Print Payment Receipt"
                             >
                               <FaPrint />
                             </button>
                            </div>
                )}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                No payment history found for this student.
                            </div>
            )}
                          </div>
                    )}
                      </div>
                    </div>
  );

  // Edit Enrollment Modal
  const EditEnrollmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Edit Enrollment</h2>
          <button
            onClick={() => {
              setShowEditEnrollmentModal(false);
              setEditingEnrollment(null);
              setEditFormData({});
              setEditError(null);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="text-xl" />
          </button>
                            </div>
        
        {editingEnrollment && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {getClassName(editingEnrollment)} - {editingEnrollment.subject || 'New Enrollment'}
            </h3>
                  <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="font-medium text-gray-700">Status:</label>
                                 <select
                   value={editFormData.status}
                   onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 >
                   <option value="active">Active</option>
                   <option value="completed">Completed</option>
                   <option value="dropped">Dropped</option>
                   <option value="suspended">Suspended</option>
                 </select>
                            </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-gray-700">Payment Status:</label>
                                 <select
                   value={editFormData.payment_status}
                   onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 >
                   <option value="paid">Paid</option>
                   <option value="pending">Pending</option>
                   <option value="partial">Half Card</option>
                   <option value="overdue">Free Card</option>
                 </select>
                            </div>
              <div className="flex flex-col gap-2">
                <label className="font-medium text-gray-700">Notes:</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
                            </div>
              {editError && (
                <div className="text-red-600 text-sm">
                  <FaExclamationTriangle className="inline-block mr-1" />
                  {editError}
                          </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditEnrollmentModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateEnrollment}
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {editLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave />
                      Save Changes
                    </>
                  )}
                </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
  );

  // Delete Confirmation Modal
  const DeleteEnrollmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Confirm Deletion</h2>
          <button
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingEnrollment(null);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes className="text-xl" />
          </button>
              </div>

        {deletingEnrollment && (
          <div className="p-6 text-center">
            <FaExclamationTriangle className="text-red-500 text-5xl mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Deletion</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete the enrollment for <strong>{getClassName(deletingEnrollment)}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
                <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                onClick={confirmDeleteEnrollment}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    Delete Enrollment
                  </>
                )}
                </button>
              </div>
            </div>
        )}
          </div>
        </div>
  );

  // Modern New Enrollment Modal
  const NewEnrollmentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <FaGraduationCap className="text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">New Enrollment</h2>
                <p className="text-blue-100 text-sm">Create a new student enrollment</p>
              </div>
            </div>
          <button
            onClick={closeNewEnrollmentModal}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
          >
              <FaTimes className="text-white" />
          </button>
          </div>
            </div>

        {selectedStudent && (
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
            {/* Student Information Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <FaUser className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedStudent.studentName}
              </h3>
                    <p className="text-blue-600 font-medium">ID: {selectedStudent.studentId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {selectedStudent.stream}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <FaSchool className="text-blue-500" />
                  <span className="text-gray-700">{selectedStudent.school}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMapMarkerAlt className="text-blue-500" />
                  <span className="text-gray-700">{selectedStudent.district}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaPhone className="text-blue-500" />
                  <span className="text-gray-700">{selectedStudent.mobile}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMapMarkerAlt className="text-blue-500" />
                  <span className="text-gray-700">{selectedStudent.address}</span>
                </div>
              </div>
                  </div>

            {/* Main Form Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Class Selection & Payment */}
              <div className="space-y-6">
              {/* Class Selection */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <FaList className="text-blue-600 text-lg" />
                      <h3 className="text-lg font-semibold text-gray-900">Class Selection</h3>
                    </div>
                  <button
                    type="button"
                    onClick={loadAvailableClasses}
                    disabled={loadingClasses}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                      <FaSync className={`text-sm ${loadingClasses ? 'animate-spin' : ''}`} />
                      <span>Reload</span>
                  </button>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Classes *
                    </label>
                    
                    {/* Loading State */}
                {loadingClasses && (
                      <div className="flex items-center space-x-2 text-blue-600 text-sm">
                        <FaSync className="animate-spin" />
                        <span>Loading available classes for {selectedStudent.stream} stream...</span>
                      </div>
                    )}
                    
                    {/* No Available Classes Message */}
                    {!loadingClasses && availableClasses.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FaExclamationTriangle className="text-yellow-600 text-2xl" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No Available Classes</h4>
                        <p className="text-gray-600 mb-4">
                          Student is already enrolled in all available classes for the <strong>{selectedStudent.stream}</strong> stream.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Current Enrollments:</strong> {selectedStudent.enrollments?.length || 0} classes
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Available Classes List */}
                    {!loadingClasses && availableClasses.length > 0 && (
                      <div className="space-y-2">
                                                {availableClasses.map(cls => {
                          const className = cls.class_name || cls.className || 'Unknown Class';
                          const subject = cls.subject || 'Unknown Subject';
                          const teacher = cls.teacher || 'Unknown Teacher';
                          const deliveryMethod = cls.delivery_method || cls.deliveryMethod || 'Unknown';
                          const courseType = cls.courseType || cls.course_type || 'theory';
                          const feeCalculation = calculateFeeWithDiscount(cls);
                          const isSelected = newEnrollmentData.classId == cls.id;
                            
                            return (
                              <div
                                key={cls.id}
                                onClick={() => handleClassSelection(cls.id)}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                                  isSelected 
                                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                                    : 'border-gray-200 bg-white hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <h4 className="font-semibold text-gray-900">{className}</h4>
                                      {isSelected && (
                                        <FaCheck className="text-blue-600 text-sm" />
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                      <div>
                                        <span className="font-medium">Subject:</span> {subject}
                                      </div>
                                      <div>
                                        <span className="font-medium">Teacher:</span> {teacher}
                                      </div>
                                      <div>
                                        <span className="font-medium">Delivery:</span> {deliveryMethod}
                                      </div>
                                      <div>
                                        <span className="font-medium">Type:</span> 
                                        <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                                          courseType === 'revision' 
                                            ? 'bg-purple-100 text-purple-700' 
                                            : 'bg-blue-100 text-blue-700'
                                        }`}>
                                          {courseType === 'revision' ? 'Revision' : 'Theory'}
                      </span>
                                      </div>
                                    </div>
                                    
                                    {/* Fee Display with Discount */}
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          {feeCalculation.hasDiscount ? (
                                            <>
                                              <div className="text-sm text-gray-500 line-through">
                                                LKR {formatCurrency(feeCalculation.originalFee)}
                                              </div>
                                              <div className="text-lg font-bold text-green-600">
                                                LKR {formatCurrency(feeCalculation.finalFee)}
                                              </div>
                                              <div className="text-xs text-blue-600 font-medium">
                                                {feeCalculation.discountInfo}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-lg font-bold text-green-600">
                                              LKR {formatCurrency(feeCalculation.originalFee)}
                                            </div>
                                          )}
                                        </div>
                                        {feeCalculation.hasDiscount && (
                                          <div className="flex items-center">
                                            <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                              <FaTicketAlt className="inline mr-1" />
                                              Discount Applied
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className={`w-4 h-4 rounded-full border-2 ${
                                      isSelected 
                                        ? 'border-blue-500 bg-blue-500' 
                                        : 'border-gray-300'
                                    }`}>
                                      {isSelected && (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    
                    {/* Status Messages */}
                    {!loadingClasses && availableClasses.length > 0 && (
                      <div className="flex items-center space-x-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                        <FaCheck />
                        <span>
                          Found {availableClasses.length} available classes for {selectedStudent.stream} stream
                        </span>
                      </div>
                )}
                {!loadingClasses && availableClasses.length === 0 && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                        <FaExclamationTriangle />
                        <span>No available classes found for {selectedStudent.stream} stream. Student is already enrolled in all available classes.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Configuration */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-4">
                    <FaMoneyBill className="text-green-500" />
                    <h4 className="text-lg font-semibold text-gray-900">Payment Configuration</h4>
                  </div>
                  
                  <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                      </label>
                <select
                  value={newEnrollmentData.paymentMethod}
                  onChange={(e) => handleNewEnrollmentChange('paymentMethod', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="cash">💵 Cash Payment</option>
                        <option value="online">🌐 Online Payment</option>
                        <option value="card">💳 Card Payment</option>
                        <option value="bank_transfer">🏦 Bank Transfer</option>
                </select>
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class Fee (LKR) *
                      </label>
                      <input
                          ref={amountInputRef}
                          type="text"
                          defaultValue={newEnrollmentData.amount}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm cursor-not-allowed"
                          placeholder="Auto-filled from class selection"
                          style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                          readOnly
                />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Method
                      </label>
                    <select
                  value={newEnrollmentData.tuteCollectionType}
                  onChange={(e) => handleNewEnrollmentChange('tuteCollectionType', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                        <option value="physical">🏫 Physical Class</option>
                        <option value="speedPost">📮 Speed Post Delivery</option>
                    </select>
                  </div>

              {newEnrollmentData.tuteCollectionType === 'speedPost' && (
                       <>
                <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">
                             Speed Post Fee (LKR)
                           </label>
                  <input
                    ref={speedPostFeeInputRef}
                    type="text"
                    defaultValue="300"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm cursor-not-allowed"
                    placeholder="Auto-filled speed post fee"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    readOnly
                  />
                </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">
                             Delivery Address *
                           </label>
                <textarea
                  ref={speedPostAddressRef}
                  defaultValue={selectedStudent.address || ""}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder="Enter complete delivery address for speed post..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  * Required when Speed Post Delivery is selected
                </p>
                         </div>
                       </>
                     )}
                  </div>
                    </div>
                      </div>

              {/* Right Column - Summary & Actions */}
              <div className="space-y-6">
                {/* Price Summary */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <FaMoneyBill className="text-green-600 text-lg" />
                    <h3 className="text-lg font-semibold text-gray-900">Price Summary</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {(() => {
                      const selectedClass = availableClasses.find(cls => cls.id == newEnrollmentData.classId);
                      const feeCalculation = selectedClass ? calculateFeeWithDiscount(selectedClass) : null;
                      
                      return (
                        <>
                          {feeCalculation && feeCalculation.hasDiscount ? (
                            <>
                              <div className="flex justify-between items-center py-2 border-b border-green-200">
                                <span className="text-sm text-gray-600">Original Fee:</span>
                                <span className="text-sm text-gray-500 line-through">
                                  LKR {formatCurrency(feeCalculation.originalFee)}
                </span>
                      </div>
                              <div className="flex justify-between items-center py-2 border-b border-green-200">
                                <span className="text-sm text-gray-600">Discount:</span>
                                <span className="text-sm font-semibold text-blue-600">
                                  -LKR {formatCurrency(feeCalculation.originalFee - feeCalculation.finalFee)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-green-200">
                                <span className="text-sm text-gray-600">Class Fee:</span>
                                <span className="text-sm font-semibold text-green-600">
                                  LKR {formatCurrency(feeCalculation.finalFee)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-center py-2 border-b border-green-200">
                              <span className="text-sm text-gray-600">Class Fee:</span>
                              <span className="text-sm font-semibold text-gray-900">
                                LKR {formatCurrency(feeCalculation ? feeCalculation.finalFee : currentAmount)}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    
                                         {newEnrollmentData.tuteCollectionType === 'speedPost' && (
                       <div className="flex justify-between items-center py-2 border-b border-green-200">
                         <span className="text-sm text-gray-600">Speed Post Fee:</span>
                         <span className="text-sm font-semibold text-gray-900">
                           LKR {formatCurrency(300)}
                         </span>
                </div>
                     )}

                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-base font-semibold text-gray-900">Total Amount:</span>
                      <span className="text-lg font-bold text-green-600">
                        LKR {formatCurrency((() => {
                          const selectedClass = availableClasses.find(cls => cls.id == newEnrollmentData.classId);
                          const feeCalculation = selectedClass ? calculateFeeWithDiscount(selectedClass) : null;
                          const classFee = feeCalculation ? feeCalculation.finalFee : currentAmount;
                          const speedPostFee = newEnrollmentData.tuteCollectionType === 'speedPost' ? 300 : 0;
                          return classFee + speedPostFee;
                        })())}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center space-x-2 mb-4">
                    <FaEdit className="text-purple-500" />
                    <h4 className="text-lg font-semibold text-gray-900">Additional Notes</h4>
                  </div>
                  
                  <textarea
                    ref={notesRef}
                    defaultValue=""
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                    placeholder="Add any additional notes about this enrollment..."
                  />
              </div>

            {/* Action Buttons */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  {/* Validation Status */}
                  {newEnrollmentData.tuteCollectionType === 'speedPost' && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        ⚠️ Please enter a delivery address to continue
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                <button
                onClick={closeNewEnrollmentModal}
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                onClick={handleCreateEnrollment}
                                             disabled={newEnrollmentLoading || !newEnrollmentData.classId || availableClasses.length === 0}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
              >
                {newEnrollmentLoading ? (
                  <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                          <span>Creating Enrollment...</span>
                    </>
                  ) : (
                    <>
                          <FaCheck className="text-white" />
                          <span>Create Enrollment</span>
                </>
              )}
                </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
        )}
          </div>


        </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Details & Purchased Classes</h1>
        <p className="text-gray-600">Comprehensive overview of all students, their enrollments, and payment history</p>
            </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between space-x-4">
          {/* Left side - Search and Filter */}
          <div className="flex items-center space-x-4 flex-1">
          {/* Search */}
            <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

          {/* Stream Filter */}
            <div className="min-w-[150px]">
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Streams</option>
                <option value="O/L">O/L</option>
                <option value="A/L-Art">A/L-Art</option>
                <option value="A/L-Maths">A/L-Maths</option>
                <option value="A/L-Science">A/L-Science</option>
                <option value="A/L-Commerce">A/L-Commerce</option>
                <option value="A/L-Technology">A/L-Technology</option>
                <option value="Primary">Primary</option>
                <option value="Other">Other</option>
            </select>
            </div>

          {/* Payment Status Filter */}
            <div className="min-w-[150px]">
                    <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Half Card</option>
                <option value="overdue">Free Card</option>
                    </select>
            </div>
          </div>

          {/* Right side - Refresh Button */}
          <div className="flex-shrink-0">
              <button
            onClick={loadData}
            disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
            <FaSync className={`${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
              </button>
          </div>
                  </div>
                </div>

      {/* Statistics Summary */}
      {/* First Row - Student Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2 mb-4">
        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-blue-100 rounded-lg">
               <FaUser className="text-blue-600 text-sm" />
                    </div>
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-600">Total Students</p>
              <p className="text-sm font-bold text-gray-900">{filteredStudents.length}</p>
                      </div>
                      </div>
                      </div>

        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-green-100 rounded-lg">
                <FaGraduationCap className="text-green-600 text-sm" />
                    </div>
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-600">Paid</p>
              <p className="text-sm font-bold text-gray-900">
                {filteredStudents.reduce((sum, s) => sum + s.enrollments.filter(e => e.payment_status === 'paid').length, 0)}
              </p>
                  </div>
                </div>
              </div>

        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-purple-100 rounded-lg">
                <FaMoneyBill className="text-purple-600 text-sm" />
              </div>
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-600">Pending</p>
              <p className="text-sm font-bold text-gray-900">
                {filteredStudents.reduce((sum, s) => sum + s.enrollments.filter(e => e.payment_status === 'pending').length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-red-100 rounded-lg">
                <FaMoneyBill className="text-red-600 text-sm" />
            </div>
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-600">Free Card</p>
              <p className="text-sm font-bold text-gray-900">
                {filteredStudents.reduce((sum, s) => sum + s.enrollments.filter(e => parseFloat(e.fee || 0) === 0).length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-orange-100 rounded-lg">
                <FaMoneyBill className="text-orange-600 text-sm" />
            </div>
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-600">Half Card</p>
              <p className="text-sm font-bold text-gray-900">
                {filteredStudents.reduce((sum, s) => sum + s.enrollments.filter(e => e.payment_status === 'partial').length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Revenue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-yellow-100 rounded-lg">
                <FaCalendar className="text-yellow-600 text-sm" />
            </div>
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-600">Total Revenue</p>
              <p className="text-sm font-bold text-gray-900">
                {formatCurrency(filteredStudents.reduce((sum, s) => sum + s.totalAmount, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* This Month Revenue - Combined */}
        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <FaMoneyBill className="text-green-600 text-sm" />
            </div>
            <div className="ml-2 flex-1">
              <p className="text-xs font-medium text-gray-600">This Month Revenue</p>
              <div className="flex justify-between items-center mt-0.5">
                <div>
                  <p className="text-xs text-gray-500">Cash</p>
                  <p className="text-xs font-bold text-green-600">
                    {formatCurrency(filteredStudents.reduce((sum, s) => {
                      return sum + s.payments.filter(p => {
                        const paymentDate = new Date(p.date);
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();
                        return paymentDate.getMonth() === currentMonth && 
                               paymentDate.getFullYear() === currentYear && 
                               p.payment_method === 'cash';
                      }).reduce((paymentSum, p) => paymentSum + parseFloat(p.amount || 0), 0);
                    }, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Online</p>
                  <p className="text-xs font-bold text-blue-600">
                    {formatCurrency(filteredStudents.reduce((sum, s) => {
                      return sum + s.payments.filter(p => {
                        const paymentDate = new Date(p.date);
                        const currentMonth = new Date().getMonth();
                        const currentYear = new Date().getFullYear();
                        return paymentDate.getMonth() === currentMonth && 
                               paymentDate.getFullYear() === currentYear && 
                               p.payment_method === 'online';
                      }).reduce((paymentSum, p) => paymentSum + parseFloat(p.amount || 0), 0);
                    }, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Previous Month Revenue - Combined */}
        <div className="bg-white rounded-lg shadow-md p-2">
          <div className="flex items-center">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <FaMoneyBill className="text-orange-600 text-sm" />
            </div>
            <div className="ml-2 flex-1">
              <p className="text-xs font-medium text-gray-600">Last Month Revenue</p>
              <div className="flex justify-between items-center mt-0.5">
                <div>
                  <p className="text-xs text-gray-500">Cash</p>
                  <p className="text-xs font-bold text-orange-600">
                    {formatCurrency(filteredStudents.reduce((sum, s) => {
                      return sum + s.payments.filter(p => {
                        const paymentDate = new Date(p.date);
                        const lastMonth = new Date().getMonth() - 1;
                        const currentYear = new Date().getFullYear();
                        return paymentDate.getMonth() === lastMonth && 
                               paymentDate.getFullYear() === currentYear && 
                               p.payment_method === 'cash';
                      }).reduce((paymentSum, p) => paymentSum + parseFloat(p.amount || 0), 0);
                    }, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Online</p>
                  <p className="text-xs font-bold text-indigo-600">
                    {formatCurrency(filteredStudents.reduce((sum, s) => {
                      return sum + s.payments.filter(p => {
                        const paymentDate = new Date(p.date);
                        const lastMonth = new Date().getMonth() - 1;
                        const currentYear = new Date().getFullYear();
                        return paymentDate.getMonth() === lastMonth && 
                               paymentDate.getFullYear() === currentYear && 
                               p.payment_method === 'online';
                      }).reduce((paymentSum, p) => paymentSum + parseFloat(p.amount || 0), 0);
                    }, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Bulk Actions</h3>
        <div className="flex flex-wrap gap-3">
              
              <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            onClick={() => {
              const printWindow = window.open('', '_blank');
              printWindow.document.write(`
                <html>
                  <head>
                    <title>All Students Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 20px; }
                      .header { text-align: center; margin-bottom: 30px; }
                      table { width: 100%; border-collapse: collapse; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f8f9fa; }
                      .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h1>All Students Report</h1>
                      <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
                    
                    <div class="summary">
                      <h3>Summary</h3>
                      <p>Total Students: ${filteredStudents.length}</p>
                      <p>Total Enrollments: ${filteredStudents.reduce((sum, s) => sum + s.totalEnrollments, 0)}</p>
                      <p>Total Payments: ${filteredStudents.reduce((sum, s) => sum + s.totalPayments, 0)}</p>
                      <p>Total Revenue: ${formatCurrency(filteredStudents.reduce((sum, s) => sum + s.totalAmount, 0))}</p>
          </div>
                    
                    <table>
                      <thead>
                        <tr>
                          <th>Student ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Mobile</th>
                          <th>Address</th>
                          <th>Stream</th>
                          <th>Enrollments</th>
                          <th>Payments</th>
                          <th>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${filteredStudents.map(student => `
                          <tr>
                            <td>${student.studentId}</td>
                            <td>${student.studentName}</td>
                            <td>${student.email}</td>
                            <td>${student.mobile}</td>
                            <td>${student.address}</td>
                            <td>${student.stream}</td>
                            <td>${student.totalEnrollments}</td>
                            <td>${student.totalPayments}</td>
                            <td>${formatCurrency(student.totalAmount)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }}
            disabled={filteredStudents.length === 0}
          >
            <FaPrint />
            Print All Students Report
          </button>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            onClick={() => {
              const csvContent = [
                ['Student ID', 'Name', 'Email', 'Mobile', 'Address', 'Stream', 'School', 'Enrollments', 'Payments', 'Total Amount'],
                ...filteredStudents.map(student => [
                  student.studentId,
                  student.studentName,
                  student.email,
                  student.mobile,
                  student.address,
                  student.stream,
                  student.school,
                  student.totalEnrollments,
                  student.totalPayments,
                  student.totalAmount
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `students_report_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            disabled={filteredStudents.length === 0}
          >
            <FaDownload />
            Export as CSV
              </button>
        </div>
          </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student details...</p>
            </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
            <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
            Try Again
            </button>
          </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">No students found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStreamFilter('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <BasicTable
            columns={columns}
            data={filteredStudents}
            className="w-full"
          />
        </div>
      )}

      {/* Modals */}
      {showDetailsModal && <DetailsModal />}
      {showEnrollmentModal && <EnrollmentModal />}
      {showPaymentModal && <PaymentModal />}
      {showEditEnrollmentModal && <EditEnrollmentModal />}
      {showDeleteModal && <DeleteEnrollmentModal />}
      {showNewEnrollmentModal && <NewEnrollmentModal />}

             {message.show && (
         <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md shadow-lg z-50 ${
           message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
         }`}>
           <div className="flex items-center">
             {message.type === 'success' ? (
               <FaCheck className="mr-2" />
             ) : (
               <FaExclamationTriangle className="mr-2" />
             )}
             {message.text}
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPurchasedClasses; 
