import React, { useState, useEffect } from 'react';
import BasicTable from '../../../components/BasicTable';
import { getAllClasses } from '../../../api/classes';
import { getClassEnrollments } from '../../../api/enrollments';
import { getAllStudents } from '../../../api/students';
import axios from 'axios';
import { FaUser, FaGraduationCap, FaMoneyBill, FaCalendar, FaPhone, FaEnvelope, FaSchool, FaMapMarkerAlt, FaSync, FaSearch, FaFilter, FaTimes, FaEdit, FaTrash, FaDownload, FaPrint, FaSave, FaCheck, FaExclamationTriangle, FaPlus, FaUsers, FaBook, FaClock, FaVideo, FaChalkboardTeacher } from 'react-icons/fa';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';

const AllClasses = ({ onLogout }) => {
  const [classes, setClasses] = useState([]);
  const [classDetails, setClassDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Modal states
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEnrollmentsModal, setShowEnrollmentsModal] = useState(false);
  const [message, setMessage] = useState({ show: false, type: '', text: '' });
  const [studentsData, setStudentsData] = useState({});
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState('');

  // Load all classes and their enrollments
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load classes and students in parallel
      const [classesResponse, studentsResponse] = await Promise.all([
        getAllClasses(),
        getAllStudents()
      ]);

      if (classesResponse.success) {
        const classesList = classesResponse.data || [];
        setClasses(classesList);
        
        // Store students data for quick lookup
        if (studentsResponse.success && studentsResponse.students) {
          const studentsMap = {};
          studentsResponse.students.forEach(student => {
            studentsMap[student.userid] = student;
          });
          setStudentsData(studentsMap);
        }
        
        // Load detailed data for each class
        await loadClassDetails(classesList);
      } else {
        setError('Failed to load classes');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Load detailed information for each class
  const loadClassDetails = async (classesList) => {
    const details = [];

    for (const classItem of classesList) {
      try {
        // Load enrollments for this class
        const enrollmentsResponse = await getClassEnrollments(classItem.id);
        const enrollments = enrollmentsResponse.success ? enrollmentsResponse.data || [] : [];
        
        // Load payment data for this class from payment backend
        let classPayments = [];
        try {
          const paymentsResponse = await axios.get(`http://localhost:8090/routes.php/get_all_payments`);
          if (paymentsResponse.data.success && paymentsResponse.data.data) {
            classPayments = paymentsResponse.data.data.filter(payment => payment.class_id == classItem.id);
            console.log(`Class ${classItem.id} (${classItem.className}) - Enrollments: ${enrollments.length}, Payments: ${classPayments.length}`);
            console.log(`Class ${classItem.id} payments:`, classPayments);
          }
        } catch (paymentError) {
          console.error('Error fetching payments for class', classItem.id, ':', paymentError);
        }

        // Create detailed class record
        const classDetail = {
          // Class Information
          classId: classItem.id,
          className: classItem.className,
          subject: classItem.subject,
          teacher: classItem.teacher,
          stream: classItem.stream,
          deliveryMethod: classItem.deliveryMethod,
          courseType: classItem.courseType,
          fee: classItem.fee,
          maxStudents: classItem.maxStudents,
          currentStudents: classItem.currentStudents,
          status: classItem.status,
          zoomLink: classItem.zoomLink,
          description: classItem.description,
          
          // Schedule Information
          scheduleDay: classItem.schedule_day,
          scheduleStartTime: classItem.schedule_start_time,
          scheduleEndTime: classItem.schedule_end_time,
          scheduleFrequency: classItem.schedule_frequency,
          startDate: classItem.start_date,
          endDate: classItem.end_date,
          
          // Payment Information
          paymentTracking: classItem.paymentTracking,
          paymentTrackingFreeDays: classItem.paymentTrackingFreeDays,
          
          // Enrollment Summary
          totalEnrollments: enrollments.length,
          activeEnrollments: enrollments.filter(e => e.status === 'active').length,
          completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
          droppedEnrollments: enrollments.filter(e => e.status === 'dropped').length,
          
          // Financial Summary - Use payment data from payment backend
          totalRevenue: classPayments.reduce((sum, payment) => {
            return sum + parseFloat(payment.amount || 0);
          }, 0),
          
          // Revenue Breakdown by Payment Method - Use payment data from payment backend
          cashRevenue: classPayments
            .filter(payment => payment.payment_method === 'cash')
            .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
          
          onlineRevenue: classPayments
            .filter(payment => payment.payment_method === 'online')
            .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0),
          
          // Payment Methods Summary - Use payment data from payment backend
          paymentMethods: (() => {
            const methods = classPayments.reduce((methods, payment) => {
              const method = payment.payment_method || 'unknown';
              methods[method] = (methods[method] || 0) + 1;
              return methods;
            }, {});
            console.log(`Class ${classItem.id} paymentMethods:`, methods);
            return methods;
          })(),
          
          // Detailed Data
          enrollments: enrollments,
          payments: classPayments,
          
          // Capacity Information
          capacityPercentage: classItem.maxStudents > 0 ? 
            Math.round((enrollments.filter(e => e.status === 'active').length / classItem.maxStudents) * 100) : 0,
          availableSpots: Math.max(0, classItem.maxStudents - enrollments.filter(e => e.status === 'active').length)
        };

        details.push(classDetail);
      } catch (error) {
        console.error(`Error loading details for class ${classItem.id}:`, error);
        // Add class with basic info even if details fail to load
        details.push({
          classId: classItem.id,
          className: classItem.className,
          subject: classItem.subject,
          teacher: classItem.teacher,
          stream: classItem.stream,
          deliveryMethod: classItem.deliveryMethod,
          courseType: classItem.courseType,
          fee: classItem.fee,
          maxStudents: classItem.maxStudents,
          currentStudents: classItem.currentStudents,
          status: classItem.status,
          zoomLink: classItem.zoomLink,
          description: classItem.description,
          scheduleDay: classItem.schedule_day,
          scheduleStartTime: classItem.schedule_start_time,
          scheduleEndTime: classItem.schedule_end_time,
          scheduleFrequency: classItem.schedule_frequency,
          startDate: classItem.start_date,
          endDate: classItem.end_date,
          paymentTracking: classItem.paymentTracking,
          paymentTrackingFreeDays: classItem.paymentTrackingFreeDays,
          totalEnrollments: 0,
          activeEnrollments: 0,
          completedEnrollments: 0,
          droppedEnrollments: 0,
          totalRevenue: 0,
          cashRevenue: 0,
          onlineRevenue: 0,
          paymentMethods: {},
          enrollments: [],
          capacityPercentage: 0,
          availableSpots: classItem.maxStudents
        });
      }
    }

    setClassDetails(details);
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);



  // Filter classes based on search term and filters
  const filteredClasses = classDetails.filter(classItem => {
    const matchesSearch = searchTerm === '' || 
      classItem.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.classId.toString().includes(searchTerm);
    
    const matchesStream = streamFilter === '' || classItem.stream === streamFilter;
    const matchesStatus = statusFilter === '' || classItem.status === statusFilter;
    const matchesDelivery = deliveryFilter === '' || classItem.deliveryMethod === deliveryFilter;
    const matchesCourseType = courseTypeFilter === '' || classItem.courseType === courseTypeFilter;
    
    // Apply date filters to revenue calculations (only if filters are explicitly set)
    let matchesDateFilter = true;
    if (dateFilter || (monthFilter && yearFilter)) {
      // If class has no payments, still show it (don't filter out empty classes)
      if (!classItem.payments || classItem.payments.length === 0) {
        matchesDateFilter = true;
      } else {
        // Filter based on payment dates from payment backend
        const filteredPayments = classItem.payments.filter(payment => {
          if (!payment.date) return false;
          
          if (dateFilter) {
            // Filter by specific date
            const targetDate = new Date(dateFilter);
            targetDate.setHours(0, 0, 0, 0);
            const paymentDate = new Date(payment.date);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() === targetDate.getTime();
          } else if (monthFilter && yearFilter) {
            // Filter by month and year
            const targetMonth = parseInt(monthFilter);
            const targetYear = parseInt(yearFilter);
            const paymentDate = new Date(payment.date);
            return paymentDate.getMonth() + 1 === targetMonth && paymentDate.getFullYear() === targetYear;
          }
          return false;
        });
        
        // Include classes that have payments matching the date filter OR have no payments
        matchesDateFilter = filteredPayments.length > 0;
      }
    }
    
    return matchesSearch && matchesStream && matchesStatus && matchesDelivery && matchesCourseType && matchesDateFilter;
  });

  // Define columns for BasicTable
  const columns = [
    {
      key: 'classInfo',
      label: 'Class Info',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="font-semibold text-gray-900 text-sm">{row.className}</div>
          <div className="text-xs text-gray-700">{row.subject}</div>
          <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded inline-block w-fit">
            ID: {row.classId}
          </div>
        </div>
      )
    },
    {
      key: 'teacher',
      label: 'Teacher',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <div className="bg-blue-100 p-1 rounded-full">
            <FaChalkboardTeacher className="text-blue-600 text-sm" />
          </div>
          <span className="text-xs text-gray-800">{row.teacher}</span>
        </div>
      )
    },
    {
      key: 'stream',
      label: 'Stream',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <div className="bg-green-100 p-1 rounded-full">
            <FaGraduationCap className="text-green-600 text-sm" />
          </div>
          <span className="text-xs text-gray-800">{row.stream}</span>
        </div>
      )
    },
    {
      key: 'deliveryMethod',
      label: 'Delivery Method',
      render: (row) => (
        <div className="flex items-center space-x-1">
          <div className="bg-purple-100 p-1 rounded-full">
            {getDeliveryIcon(row.deliveryMethod)}
          </div>
          <span className="text-xs text-gray-800 capitalize">
            {row.deliveryMethod || 'Not specified'}
          </span>
        </div>
      )
    },
    {
      key: 'courseType',
      label: 'Course Type',
      render: (row) => {
        const courseType = row.courseType || row.course_type || 'theory';
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            courseType === 'revision' 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-indigo-100 text-indigo-800'
          }`}>
            {courseType === 'revision' ? '📝 Revision' : '📚 Theory'}
          </span>
        );
      }
    },
    {
      key: 'schedule',
      label: 'Schedule',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="font-medium text-gray-900 text-xs">{row.scheduleDay || 'Not specified'}</div>
          <div className="text-xs text-gray-700 bg-gray-50 px-1 py-0.5 rounded">
            {row.scheduleStartTime && row.scheduleEndTime ? 
              `${formatTime(row.scheduleStartTime)} - ${formatTime(row.scheduleEndTime)}` : 
              'Time not specified'
            }
          </div>
          <div className="text-xs text-gray-500 bg-blue-50 px-1 py-0.5 rounded inline-block w-fit">
            {row.scheduleFrequency || 'Frequency not specified'}
          </div>
        </div>
      )
    },
    {
      key: 'enrollments',
      label: 'Enrollments',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-1">
            <div className="bg-blue-100 p-1 rounded-full">
              <FaUsers className="text-blue-600 text-sm" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-sm">
                {row.activeEnrollments || 0}
                <span className="text-gray-500 font-normal text-xs">/{row.maxStudents || 'N/A'}</span>
              </span>
            </div>
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${getCapacityColor(row.capacityPercentage || 0)}`}>
            {row.capacityPercentage || 0}% Full
          </div>
        </div>
      )
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row) => (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-1">
            <div className="bg-green-100 p-1 rounded-full">
              <FaMoneyBill className="text-green-600 text-sm" />
            </div>
            <span className="font-semibold text-gray-900 text-xs">{formatCurrency(row.totalRevenue)}</span>
          </div>
          <div className="flex flex-col space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-green-600 font-medium">Cash:</span>
              <span className="text-green-700">{formatCurrency(row.cashRevenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-600 font-medium">Online:</span>
              <span className="text-blue-700">{formatCurrency(row.onlineRevenue)}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'paymentMethods',
      label: 'Payment Methods',
      render: (row) => (
        <div className="flex flex-col space-y-2">
          {Object.entries(row.paymentMethods || {}).map(([method, count]) => (
            <div key={method} className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  method === 'cash' ? 'bg-green-100 text-green-700' :
                  method === 'online' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {method === 'cash' ? 'Cash' : 
                   method === 'online' ? 'Online' : 
                   method}
                </span>
              </div>
              <span className="text-gray-600 font-medium text-xs">{count}</span>
            </div>
          ))}
          {Object.keys(row.paymentMethods || {}).length === 0 && (
            <span className="text-gray-400 text-xs">No payments</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex justify-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
            {row.status}
          </span>
        </div>
      )
    }
  ];

  // Define actions for BasicTable
  const actions = (row) => (
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => handleViewDetails(row)}
        className="flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-all duration-200 border border-blue-200 text-xs font-medium shadow-sm hover:shadow-md"
        title="View Class Details"
      >
        <FaSearch size={12} className="mr-1" />
        Details
      </button>
      <button
        onClick={() => handleViewEnrollments(row)}
        className="flex items-center justify-center px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded transition-all duration-200 border border-green-200 text-xs font-medium shadow-sm hover:shadow-md"
        title="View Enrolled Students"
      >
        <FaUsers size={12} className="mr-1" />
        Students ({row.totalEnrollments})
      </button>
    </div>
  );

  // Get unique values for filter dropdowns
  const uniqueStreams = [...new Set(classes.map(c => c.stream))].filter(Boolean);
  const uniqueStatuses = [...new Set(classes.map(c => c.status))].filter(Boolean);
  const uniqueDeliveryMethods = [...new Set(classes.map(c => c.deliveryMethod))].filter(Boolean);
  


  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK');
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  // Get delivery method icon
  const getDeliveryIcon = (deliveryMethod) => {
    switch (deliveryMethod?.toLowerCase()) {
      case 'online':
        return <FaVideo className="text-blue-600 text-sm" />;
      case 'physical':
        return <FaChalkboardTeacher className="text-green-600 text-sm" />;
      case 'hybrid':
        return <FaUsers className="text-purple-600 text-sm" />;
      default:
        return <FaBook className="text-gray-600 text-sm" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-700 bg-green-100 border border-green-200';
      case 'inactive':
        return 'text-red-700 bg-red-100 border border-red-200';
      case 'completed':
        return 'text-blue-700 bg-blue-100 border border-blue-200';
      case 'upcoming':
        return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  // Get capacity color
  const getCapacityColor = (percentage) => {
    if (percentage >= 90) return 'text-red-700 bg-red-100 border border-red-200';
    if (percentage >= 75) return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
    return 'text-green-700 bg-green-100 border border-green-200';
  };

  const showMessage = (type, text) => {
    setMessage({ show: true, type, text });
    setTimeout(() => setMessage({ show: false, type: '', text: '' }), 3000);
  };

  const handleViewDetails = (classItem) => {
    setSelectedClass(classItem);
    setShowDetailsModal(true);
  };

  const handleViewEnrollments = async (classItem) => {
    setSelectedClass(classItem);
    setShowEnrollmentsModal(true);
    
    // Load student data for enrollments
    try {
      const enrollmentsResponse = await getClassEnrollments(classItem.classId);
      if (enrollmentsResponse.success && enrollmentsResponse.data) {
        const enrollments = enrollmentsResponse.data;
        
        // Fetch student data for each enrollment
        const studentPromises = enrollments.map(async (enrollment) => {
          try {
            const studentResponse = await axios.get(`http://localhost:8086/routes.php/get_with_id/${enrollment.student_id}`);
            return { studentId: enrollment.student_id, data: studentResponse.data };
          } catch (error) {
            console.error('Error fetching student data for', enrollment.student_id, ':', error);
            return { studentId: enrollment.student_id, data: null };
          }
        });
        
        const studentResults = await Promise.all(studentPromises);
        const studentDataMap = {};
        studentResults.forEach(result => {
          if (result.data) {
            studentDataMap[result.studentId] = result.data;
          }
        });
        
        // Update the selected class with student data
        setSelectedClass(prev => ({
          ...prev,
          enrollments: enrollments,
          studentData: studentDataMap
        }));
      }
    } catch (error) {
      console.error('Error loading enrollment data:', error);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedClass(null);
  };

  const closeEnrollmentsModal = () => {
    setShowEnrollmentsModal(false);
    setSelectedClass(null);
    setEnrollmentSearchTerm('');
  };

  const handleRefresh = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="Administrator"
      sidebarItems={adminSidebarSections}
    >
      <div className="w-full max-w-7xl mx-auto bg-white p-8 rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Classes</h1>
          <p className="text-gray-600 mt-2">Manage and view all classes with their enrolled students</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaSync className="mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={streamFilter}
          onChange={(e) => setStreamFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Streams</option>
          {uniqueStreams.map(stream => (
            <option key={stream} value={stream}>{stream}</option>
          ))}
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Statuses</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        
        <select
          value={deliveryFilter}
          onChange={(e) => setDeliveryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Delivery Methods</option>
          {uniqueDeliveryMethods.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>

        <select
          value={courseTypeFilter}
          onChange={(e) => setCourseTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Types</option>
          <option value="theory">📚 Theory</option>
          <option value="revision">📝 Revision</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Select Date"
        />

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Months</option>
          <option value="1">January</option>
          <option value="2">February</option>
          <option value="3">March</option>
          <option value="4">April</option>
          <option value="5">May</option>
          <option value="6">June</option>
          <option value="7">July</option>
          <option value="8">August</option>
          <option value="9">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="2023">2023</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>

        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setStreamFilter('');
              setStatusFilter('');
              setDeliveryFilter('');
              setDateFilter('');
              setMonthFilter((new Date().getMonth() + 1).toString());
              setYearFilter(new Date().getFullYear().toString());
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            Reset to Current Month
          </button>
        </div>
      </div>

      {/* Filter Indicator */}
      {(dateFilter || (monthFilter && yearFilter)) && (
        <div className="mb-4 flex items-center space-x-2">
          <span className="text-sm text-gray-600">Filters applied:</span>
          {dateFilter && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Date: {new Date(dateFilter).toLocaleDateString()}
            </span>
          )}
          {monthFilter && yearFilter && !dateFilter && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {new Date(parseInt(yearFilter), parseInt(monthFilter) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
            {filteredClasses.length} classes shown
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <FaBook className="text-blue-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-blue-600">Total Classes</p>
              <p className="text-2xl font-bold text-blue-900">{filteredClasses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center">
            <FaUsers className="text-green-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-green-600">Active Classes</p>
              <p className="text-2xl font-bold text-green-900">
                {filteredClasses.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center">
            <FaGraduationCap className="text-purple-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-purple-600">Total Enrollments</p>
              <p className="text-2xl font-bold text-purple-900">
                {filteredClasses.reduce((sum, c) => sum + c.totalEnrollments, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg">
          <div className="flex items-center">
            <FaMoneyBill className="text-yellow-600 text-2xl mr-4" />
            <div>
              <p className="text-sm font-medium text-yellow-600">Total Revenue</p>
              <p className="text-2xl font-bold text-yellow-900">
                {formatCurrency(filteredClasses.reduce((sum, c) => {
                  // Calculate revenue based on date filters
                  if (dateFilter || (monthFilter && yearFilter)) {
                    let filteredRevenue = 0;
                    let filteredCashRevenue = 0;
                    let filteredOnlineRevenue = 0;
                    
                    c.enrollments.forEach(enrollment => {
                      if (enrollment.payment_history_details) {
                        try {
                          const paymentHistory = enrollment.payment_history_details.split('|').map(p => {
                            try { return JSON.parse(p); } catch (e) { return null; }
                          }).filter(p => p);
                          
                          paymentHistory.forEach(payment => {
                            if (payment.date) {
                              const paymentDate = new Date(payment.date);
                              let includePayment = false;
                              
                              if (dateFilter) {
                                const targetDate = new Date(dateFilter);
                                targetDate.setHours(0, 0, 0, 0);
                                paymentDate.setHours(0, 0, 0, 0);
                                includePayment = paymentDate.getTime() === targetDate.getTime();
                              } else if (monthFilter && yearFilter) {
                                const targetMonth = parseInt(monthFilter);
                                const targetYear = parseInt(yearFilter);
                                includePayment = paymentDate.getMonth() + 1 === targetMonth && paymentDate.getFullYear() === targetYear;
                              }
                              
                              if (includePayment) {
                                const amount = parseFloat(payment.amount || 0);
                                filteredRevenue += amount;
                                
                                if (payment.payment_method?.toLowerCase() === 'cash') {
                                  filteredCashRevenue += amount;
                                } else if (payment.payment_method?.toLowerCase() === 'online' || payment.payment_method?.toLowerCase() === 'card') {
                                  filteredOnlineRevenue += amount;
                                }
                              }
                            }
                          });
                        } catch (error) {
                          // Fallback to enrollment data
                        }
                      }
                    });
                    
                    return sum + filteredRevenue;
                  } else {
                    return sum + c.totalRevenue;
                  }
                }, 0))}
              </p>
              <div className="flex flex-col space-y-1 text-xs mt-2">
                <div className="flex justify-between">
                  <span className="text-green-600 font-medium">Cash:</span>
                  <span className="text-green-700">{formatCurrency(filteredClasses.reduce((sum, c) => {
                    if (dateFilter || (monthFilter && yearFilter)) {
                      let filteredCashRevenue = 0;
                      if (c.payments) {
                        c.payments.forEach(payment => {
                          if (payment.date && payment.payment_method?.toLowerCase() === 'cash') {
                            const paymentDate = new Date(payment.date);
                            let includePayment = false;
                            
                            if (dateFilter) {
                              const targetDate = new Date(dateFilter);
                              targetDate.setHours(0, 0, 0, 0);
                              paymentDate.setHours(0, 0, 0, 0);
                              includePayment = paymentDate.getTime() === targetDate.getTime();
                            } else if (monthFilter && yearFilter) {
                              const targetMonth = parseInt(monthFilter);
                              const targetYear = parseInt(yearFilter);
                              includePayment = paymentDate.getMonth() + 1 === targetMonth && paymentDate.getFullYear() === targetYear;
                            }
                            
                            if (includePayment) {
                              filteredCashRevenue += parseFloat(payment.amount || 0);
                            }
                          }
                        });
                      }
                      return sum + filteredCashRevenue;
                    } else {
                      return sum + c.cashRevenue;
                    }
                  }, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-600 font-medium">Online:</span>
                  <span className="text-blue-700">{formatCurrency(filteredClasses.reduce((sum, c) => {
                    if (dateFilter || (monthFilter && yearFilter)) {
                      let filteredOnlineRevenue = 0;
                      if (c.payments) {
                        c.payments.forEach(payment => {
                          if (payment.date && (payment.payment_method?.toLowerCase() === 'online' || payment.payment_method?.toLowerCase() === 'card')) {
                            const paymentDate = new Date(payment.date);
                            let includePayment = false;
                            
                            if (dateFilter) {
                              const targetDate = new Date(dateFilter);
                              targetDate.setHours(0, 0, 0, 0);
                              paymentDate.setHours(0, 0, 0, 0);
                              includePayment = paymentDate.getTime() === targetDate.getTime();
                            } else if (monthFilter && yearFilter) {
                              const targetMonth = parseInt(monthFilter);
                              const targetYear = parseInt(yearFilter);
                              includePayment = paymentDate.getMonth() + 1 === targetMonth && paymentDate.getFullYear() === targetYear;
                            }
                            
                            if (includePayment) {
                              filteredOnlineRevenue += parseFloat(payment.amount || 0);
                            }
                          }
                        });
                      }
                      return sum + filteredOnlineRevenue;
                    } else {
                      return sum + c.onlineRevenue;
                    }
                  }, 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Classes Table */}
      <BasicTable
        columns={columns}
        data={filteredClasses}
        actions={actions}
        className=""
      />

      {/* Message */}
      {message.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          message.type === 'success' ? 'bg-green-500 text-white' :
          message.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {/* Class Details Modal */}
      {showDetailsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Class Details</h2>
              <button
                onClick={closeDetailsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-gray-700">Class Name:</label>
                    <p className="text-gray-900">{selectedClass.className}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Subject:</label>
                    <p className="text-gray-900">{selectedClass.subject}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Teacher:</label>
                    <p className="text-gray-900">{selectedClass.teacher}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Stream:</label>
                    <p className="text-gray-900">{selectedClass.stream}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Delivery Method:</label>
                    <p className="text-gray-900 capitalize">{selectedClass.deliveryMethod}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Course Type:</label>
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                      selectedClass.courseType === 'revision' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {selectedClass.courseType === 'revision' ? '📝 Revision' : '📚 Theory'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Schedule & Capacity</h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-gray-700">Schedule:</label>
                    <p className="text-gray-900">
                      {selectedClass.scheduleDay || 'Not specified'} {selectedClass.scheduleStartTime ? formatTime(selectedClass.scheduleStartTime) : ''} - {selectedClass.scheduleEndTime ? formatTime(selectedClass.scheduleEndTime) : ''}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Frequency:</label>
                    <p className="text-gray-900">{selectedClass.scheduleFrequency || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Duration:</label>
                    <p className="text-gray-900">
                      {formatDate(selectedClass.startDate)} - {formatDate(selectedClass.endDate)}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Capacity:</label>
                    <p className="text-gray-900">
                      {selectedClass.activeEnrollments} / {selectedClass.maxStudents} students
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Available Spots:</label>
                    <p className="text-gray-900">{selectedClass.availableSpots}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Financial Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-gray-700">Fee:</label>
                    <p className="text-gray-900">{formatCurrency(selectedClass.fee)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Total Revenue:</label>
                    <p className="text-gray-900">{formatCurrency(selectedClass.totalRevenue)}</p>
                    <div className="flex flex-col space-y-1 text-sm mt-2">
                      <div className="flex justify-between">
                        <span className="text-green-600 font-medium">Cash:</span>
                        <span className="text-green-700">{formatCurrency(selectedClass.cashRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600 font-medium">Online:</span>
                        <span className="text-blue-700">{formatCurrency(selectedClass.onlineRevenue)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Payment Tracking:</label>
                    <p className="text-gray-900">{selectedClass.paymentTracking ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  {selectedClass.paymentTracking && (
                    <div>
                      <label className="font-medium text-gray-700">Free Days:</label>
                      <p className="text-gray-900">{selectedClass.paymentTrackingFreeDays} days</p>
                    </div>
                  )}
                  <div>
                    <label className="font-medium text-gray-700">Payment Methods:</label>
                    <div className="mt-1">
                                             {Object.entries(selectedClass.paymentMethods || {}).map(([method, count]) => (
                         <div key={method} className="flex justify-between items-center text-sm mb-1">
                           <span className={`px-2 py-1 rounded text-xs font-medium ${
                             method === 'cash' ? 'bg-green-100 text-green-700' :
                             method === 'online' ? 'bg-blue-100 text-blue-700' :
                             'bg-gray-100 text-gray-700'
                           }`}>
                             {method === 'cash' ? 'Cash' : 
                              method === 'online' ? 'Online' : 
                              method}
                           </span>
                           <span className="text-gray-600 font-medium">{count} payments</span>
                         </div>
                       ))}
                      {Object.keys(selectedClass.paymentMethods || {}).length === 0 && (
                        <span className="text-gray-400 text-sm">No payments recorded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Enrollment Summary</h3>
                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-gray-700">Total Enrollments:</label>
                    <p className="text-gray-900">{selectedClass.totalEnrollments}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Active Enrollments:</label>
                    <p className="text-gray-900">{selectedClass.activeEnrollments}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Completed Enrollments:</label>
                    <p className="text-gray-900">{selectedClass.completedEnrollments}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">Dropped Enrollments:</label>
                    <p className="text-gray-900">{selectedClass.droppedEnrollments}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {selectedClass.description && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-gray-700">{selectedClass.description}</p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollments Modal */}
      {showEnrollmentsModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Enrollments - {selectedClass.className}
              </h2>
              <button
                onClick={closeEnrollmentsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Total Enrollments</p>
                  <p className="text-xl font-bold text-blue-900">{selectedClass.totalEnrollments}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Active</p>
                  <p className="text-xl font-bold text-green-900">{selectedClass.activeEnrollments}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-purple-600">Completed</p>
                  <p className="text-xl font-bold text-purple-900">{selectedClass.completedEnrollments}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-600">Dropped</p>
                  <p className="text-xl font-bold text-red-900">{selectedClass.droppedEnrollments}</p>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, ID, or email..."
                  value={enrollmentSearchTerm}
                  onChange={(e) => setEnrollmentSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {(() => {
              // Filter enrollments based on search term
              const filteredEnrollments = selectedClass.enrollments.filter(enrollment => {
                if (!enrollmentSearchTerm) return true;
                
                const student = studentsData[enrollment.student_id];
                const searchLower = enrollmentSearchTerm.toLowerCase();
                
                // Search by student ID
                if (enrollment.student_id.toLowerCase().includes(searchLower)) return true;
                
                // Search by student name
                if (student) {
                  const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
                  if (fullName.includes(searchLower)) return true;
                  
                  // Search by email
                  if (student.email && student.email.toLowerCase().includes(searchLower)) return true;
                  
                  // Search by mobile
                  if (student.mobile && student.mobile.includes(searchLower)) return true;
                }
                
                return false;
              });

              // Process enrollment data for BasicTable
              const processedEnrollments = filteredEnrollments.map(enrollment => {
                const student = selectedClass.studentData?.[enrollment.student_id] || studentsData[enrollment.student_id];
                
                // Calculate payment breakdown from payment backend data
                let cashAmount = 0;
                let onlineAmount = 0;
                let paymentMethod = 'unknown';
                
                // Get payments for this student and class from the payment data
                const studentPayments = selectedClass.payments?.filter(payment => 
                  payment.user_id === enrollment.student_id && payment.class_id == selectedClass.classId
                ) || [];
                
                studentPayments.forEach(payment => {
                  if (payment.payment_method === 'cash') {
                    cashAmount += parseFloat(payment.amount || 0);
                  } else if (payment.payment_method === 'online') {
                    onlineAmount += parseFloat(payment.amount || 0);
                  }
                });
                
                // Get primary payment method
                if (studentPayments.length > 0) {
                  paymentMethod = studentPayments[0].payment_method || 'unknown';
                }

                return {
                  ...enrollment,
                  student,
                  cashAmount,
                  onlineAmount,
                  paymentMethod,
                  totalAmount: cashAmount + onlineAmount
                };
              });

              // Define columns for BasicTable
              const enrollmentColumns = [
                {
                  key: 'studentInfo',
                  label: 'Student Information',
                  render: (row) => (
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <FaUser className="mr-2 text-blue-500" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {row.student ? `${row.student.first_name} ${row.student.last_name}` : row.student_id}
                          </div>
                          <div className="text-sm text-gray-600">ID: {row.student_id}</div>
                          {row.student && (
                            <div className="text-xs text-gray-500">
                              {row.student.stream} • {row.student.school}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'contactDetails',
                  label: 'Contact Details',
                  render: (row) => (
                    <div className="flex flex-col text-sm">
                      {row.student ? (
                        <>
                          <div className="flex items-center">
                            <FaEnvelope className="mr-1 text-blue-500" />
                            <span>{row.student.email}</span>
                          </div>
                          <div className="flex items-center">
                            <FaPhone className="mr-1 text-green-500" />
                            <span>{row.student.mobile_number}</span>
                          </div>
                          {row.student.parent_mobile_number && (
                            <div className="flex items-center">
                              <FaPhone className="mr-1 text-purple-500" />
                              <span className="text-xs">Parent: {row.student.parent_mobile_number}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-500">Student data not available</span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'enrollmentDetails',
                  label: 'Enrollment Details',
                  render: (row) => (
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <FaCalendar className="mr-2 text-purple-500" />
                        <span>{formatDate(row.enrollment_date)}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                  )
                },

                {
                  key: 'revenue',
                  label: 'Revenue',
                  render: (row) => (
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center">
                        <FaMoneyBill className="mr-1 text-green-500" />
                        <span className="font-semibold text-xs">{formatCurrency(row.totalAmount)}</span>
                      </div>
                      <div className="flex flex-col space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-600">Cash:</span>
                          <span className="text-green-700">{formatCurrency(row.cashAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Online:</span>
                          <span className="text-blue-700">{formatCurrency(row.onlineAmount)}</span>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'paymentStatus',
                  label: 'Payment Status',
                  render: (row) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.payment_status === 'paid' ? 'text-green-600 bg-green-100' :
                      row.payment_status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                      'text-red-600 bg-red-100'
                    }`}>
                      {row.payment_status}
                    </span>
                  )
                }
              ];

              return processedEnrollments.length > 0 ? (
                <BasicTable
                  columns={enrollmentColumns}
                  data={processedEnrollments}
                  className=""
                />
              ) : (
                <div className="text-center py-8">
                  <FaUsers className="text-gray-400 text-4xl mx-auto mb-4" />
                  <p className="text-gray-500">
                    {enrollmentSearchTerm ? 'No students found matching your search.' : 'No enrollments found for this class.'}
                  </p>
                </div>
              );
            })()}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeEnrollmentsModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default AllClasses;
