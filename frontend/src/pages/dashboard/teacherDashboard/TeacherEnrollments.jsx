import React, { useState, useEffect } from 'react';
import { FaUsers, FaGraduationCap, FaCalendar, FaSearch, FaFilter, FaDownload, FaPrint, FaEye, FaClock, FaCheckCircle, FaExclamationTriangle, FaUser, FaPhone, FaEnvelope, FaSchool, FaBook, FaChalkboardTeacher, FaVideo, FaMoneyBill, FaSync, FaTimes, FaMapMarkerAlt, FaIdCard, FaVenusMars, FaCalendarAlt } from 'react-icons/fa';
import { getClassesByTeacher } from '../../../api/classes';
import { getClassEnrollments } from '../../../api/enrollments';
import { getAllStudents } from '../../../api/students';
import { getUserData } from '../../../api/apiUtils';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from './TeacherDashboardSidebar';
import BasicTable from '../../../components/BasicTable';

const TeacherEnrollments = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('');
  const [studentsData, setStudentsData] = useState({});
  const [showEnrollmentDetails, setShowEnrollmentDetails] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get teacher data from storage using the same method as TeacherAllClasses
      const teacherData = getUserData();
      setCurrentTeacher(teacherData);
      
      console.log('Teacher data:', teacherData); // Debug log
      
              // Check if we have teacher data with teacherId
        const teacherId = teacherData?.teacherId || teacherData?.id || teacherData?.userid || null;
      
      if (teacherId) {
        // Load classes and students in parallel
        const [classesResponse, studentsResponse] = await Promise.all([
          getClassesByTeacher(teacherId),
          getAllStudents()
        ]);

        if (classesResponse.success) {
          const classesList = classesResponse.data || [];
          setClasses(classesList);
          console.log('Teacher Classes Found:', classesList.length);
          
          // Store students data for quick lookup
          if (studentsResponse && Array.isArray(studentsResponse)) {
            const studentsMap = {};
            studentsResponse.forEach(student => {
              studentsMap[student.user_id] = student;
            });
            setStudentsData(studentsMap);
            console.log('Students data loaded:', studentsResponse.length, 'students');
            console.log('Students map keys:', Object.keys(studentsMap));
          }
          
          // Calculate total enrollments after classes are loaded
          await calculateTotalEnrollments();
        } else {
          setError(classesResponse.message || 'Failed to load classes');
        }
      } else {
        setError('Teacher information not found. Please log in again.');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewEnrollments = async (classItem) => {
    try {
      console.log('Loading enrollments for class:', classItem.id);
      const enrollmentsResponse = await getClassEnrollments(classItem.id);
      console.log('Enrollments response:', enrollmentsResponse);
      
      if (enrollmentsResponse.success) {
        const enrollments = enrollmentsResponse.data || [];
        console.log('Enrollments data:', enrollments);
        console.log('Students data available:', Object.keys(studentsData));
        
        // Check if students exist for each enrollment
        enrollments.forEach(enrollment => {
          const student = studentsData[enrollment.student_id];
          console.log(`Enrollment ${enrollment.student_id}:`, student ? 'Found' : 'Not found');
        });
        
        setSelectedClass({
          ...classItem,
          enrollments: enrollments
        });
        setShowEnrollmentDetails(true);
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  };

  const closeEnrollmentDetails = () => {
    setShowEnrollmentDetails(false);
    setSelectedClass(null);
    setSelectedStudent(null);
  };

  const handleViewStudentDetails = (student) => {
    setSelectedStudent(student);
  };

  const closeStudentDetails = () => {
    setSelectedStudent(null);
  };

  // Calculate total enrollments across all classes
  const calculateTotalEnrollments = async () => {
    let total = 0;
    
    for (const classItem of classes) {
      try {
        const enrollmentsResponse = await getClassEnrollments(classItem.id);
        if (enrollmentsResponse.success) {
          total += (enrollmentsResponse.data || []).length;
        }
      } catch (error) {
        console.error(`Error loading enrollments for class ${classItem.id}:`, error);
      }
    }
    
    setTotalEnrollments(total);
  };

  // Filter classes based on search term and filters
  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = searchTerm === '' || 
      classItem.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStream = streamFilter === '' || classItem.stream === streamFilter;
    const matchesStatus = statusFilter === '' || classItem.status === statusFilter;
    const matchesDelivery = deliveryFilter === '' || classItem.deliveryMethod === deliveryFilter;
    const matchesCourseType = courseTypeFilter === '' || classItem.courseType === courseTypeFilter || classItem.course_type === courseTypeFilter;
    
    return matchesSearch && matchesStream && matchesStatus && matchesDelivery && matchesCourseType;
  });

  // Filter enrollments based on search term and status filter
  const getFilteredEnrollments = (enrollments) => {
    if (!enrollments) return [];
    
    return enrollments.filter(enrollment => {
      const student = studentsData[enrollment.student_id];
      if (!student) {
        console.log('Student not found for enrollment:', enrollment.student_id);
        console.log('Available student IDs:', Object.keys(studentsData));
        return false;
      }
      
      // Filter by status
      if (enrollmentStatusFilter && enrollment.status !== enrollmentStatusFilter) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (
          student.first_name?.toLowerCase().includes(searchLower) ||
          student.last_name?.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower) ||
          student.user_id?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  };
  const uniqueStreams = [...new Set(classes.map(c => c.stream))].filter(Boolean).sort();
  const uniqueStatuses = [...new Set(classes.map(c => c.status))].filter(Boolean);

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

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-700 bg-green-100 border border-green-200';
      case 'inactive':
        return 'text-red-700 bg-red-100 border border-red-200';
      case 'enrolled':
        return 'text-blue-700 bg-blue-100 border border-blue-200';
      case 'completed':
        return 'text-purple-700 bg-purple-100 border border-purple-200';
      default:
        return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
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

  // Calculate enrollment statistics
  const calculateEnrollmentStats = (enrollments) => {
    if (!enrollments) return { totalStudents: 0, activeStudents: 0, completedStudents: 0, droppedStudents: 0, suspendedStudents: 0 };
    
    const totalStudents = enrollments.length;
    const activeStudents = enrollments.filter(e => e.status === 'active').length;
    const completedStudents = enrollments.filter(e => e.status === 'completed').length;
    const droppedStudents = enrollments.filter(e => e.status === 'dropped').length;
    const suspendedStudents = enrollments.filter(e => e.status === 'suspended').length;
    
    return {
      totalStudents,
      activeStudents,
      completedStudents,
      droppedStudents,
      suspendedStudents
    };
  };



  // Define columns for classes table
  const classColumns = [
    {
      key: 'classInfo',
      label: 'Class Info',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="font-semibold text-gray-900 text-sm">{row.className}</div>
          <div className="text-xs text-gray-700">{row.subject}</div>
          <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded inline-block w-fit">
            ID: {row.id}
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
            <FaUser className="text-blue-600 text-sm" />
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
      label: 'Delivery',
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
                {row.currentStudents || 0}
                <span className="text-gray-500 font-normal text-xs">/{row.maxStudents || 'N/A'}</span>
              </span>
            </div>
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${getStatusColor(row.status)}`}>
            {row.currentStudents && row.maxStudents ? 
              Math.round((row.currentStudents / row.maxStudents) * 100) : 0}% Full
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex justify-center">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${getStatusColor(row.status)}`}>
            {row.status || 'Unknown'}
          </span>
        </div>
      )
    }
  ];

  // Define actions for classes table
  const classActions = (row) => (
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => handleViewEnrollments(row)}
        className="flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-all duration-200 border border-blue-200 text-xs font-medium shadow-sm hover:shadow-md"
        title="View Enrollment Details"
      >
        <FaUsers size={12} className="mr-1" />
        Enrollments
      </button>
    </div>
  );

  // Define columns for students table
  const studentColumns = [
    {
      key: 'studentInfo',
      label: 'Student Info',
      render: (row) => {
        const student = studentsData[row.student_id];
        return (
          <div className="flex flex-col space-y-1">
            <div className="font-semibold text-gray-900 text-sm">
              {student ? `${student.first_name} ${student.last_name}` : row.student_id}
            </div>
            <div className="text-xs text-gray-700">{student?.school || 'School not specified'}</div>
            <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded inline-block w-fit">
              ID: {row.student_id}
            </div>
          </div>
        );
      }
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => {
        const student = studentsData[row.student_id];
        return (
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-1">
              <FaEnvelope className="text-blue-500 text-xs" />
              <span className="text-xs text-gray-800">{student?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FaPhone className="text-green-500 text-xs" />
              <span className="text-xs text-gray-800">{student?.mobile_number || 'N/A'}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'enrollment',
      label: 'Enrollment',
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <div className="text-xs text-gray-700">
            <FaCalendar className="inline mr-1" />
            {formatDate(row.enrollment_date)}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
            {row.status}
          </span>
        </div>
      )
    }
  ];

  // Define actions for students table
  const studentActions = (row) => {
    const student = studentsData[row.student_id];
    return (
      <div className="flex flex-col space-y-1">
        <button
          onClick={() => handleViewStudentDetails(student)}
          className="flex items-center justify-center px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded transition-all duration-200 border border-green-200 text-xs font-medium shadow-sm hover:shadow-md"
          title="View Student Details"
        >
          <FaEye size={12} className="mr-1" />
          Details
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading teacher enrollments...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      <div className="w-full max-w-7xl mx-auto bg-white p-8 rounded-lg shadow">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Class Enrollments</h1>
          <p className="text-gray-600 mt-2">Manage and view enrollments for your classes</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between space-x-4">
            {/* Left side - Search and Filters */}
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Stream Filter */}
              <div className="min-w-[140px]">
                <select
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Streams</option>
                  {uniqueStreams.map(stream => (
                    <option key={stream} value={stream}>{stream}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="min-w-[130px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Delivery Method Filter */}
              <div className="min-w-[140px]">
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Delivery</option>
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {/* Course Type Filter */}
              <div className="min-w-[140px]">
                <select
                  value={courseTypeFilter}
                  onChange={(e) => setCourseTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Types</option>
                  <option value="theory">📚 Theory</option>
                  <option value="revision">📝 Revision</option>
                </select>
              </div>
            </div>

            {/* Right side - Refresh Button */}
            <div className="flex-shrink-0">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FaSync className="text-sm" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center">
              <FaGraduationCap className="text-blue-600 text-2xl mr-4" />
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
              <FaMoneyBill className="text-purple-600 text-2xl mr-4" />
              <div>
                <p className="text-sm font-medium text-purple-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-purple-900">
                  {totalEnrollments}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Classes Table */}
        <BasicTable
          columns={classColumns}
          data={filteredClasses}
          actions={classActions}
          className=""
        />

        {/* Enrollment Details Modal */}
        {showEnrollmentDetails && selectedClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Enrollment Details - {selectedClass.className}
                </h2>
                <button
                  onClick={closeEnrollmentDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={24} />
                </button>
              </div>
              
              {/* Two Column Layout: Class Info (Left) + Table (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Side - Class Information */}
                <div className="lg:col-span-1">
                  {/* Class Information Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">Class Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-blue-100 p-1 rounded-full">
                            <FaGraduationCap className="text-blue-600 text-xs" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Stream</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">{selectedClass.stream || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-green-100 p-1 rounded-full">
                            {getDeliveryIcon(selectedClass.deliveryMethod)}
                          </div>
                          <span className="text-xs font-medium text-gray-700">Delivery</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 capitalize">
                          {selectedClass.deliveryMethod || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 rounded-full ${
                            (selectedClass.courseType || selectedClass.course_type || 'theory') === 'revision'
                              ? 'bg-amber-100'
                              : 'bg-indigo-100'
                          }`}>
                            <FaBook className={`text-xs ${
                              (selectedClass.courseType || selectedClass.course_type || 'theory') === 'revision'
                                ? 'text-amber-600'
                                : 'text-indigo-600'
                            }`} />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Type</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          (selectedClass.courseType || selectedClass.course_type || 'theory') === 'revision'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {(selectedClass.courseType || selectedClass.course_type || 'theory') === 'revision' ? '📝 Revision' : '📚 Theory'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-purple-100 p-1 rounded-full">
                            <FaCalendar className="text-purple-600 text-xs" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Day</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {selectedClass.schedule_day || selectedClass.scheduleDay || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-orange-100 p-1 rounded-full">
                            <FaClock className="text-orange-600 text-xs" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Time</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {(selectedClass.schedule_start_time || selectedClass.scheduleStartTime) && 
                           (selectedClass.schedule_end_time || selectedClass.scheduleEndTime) ? 
                            `${formatTime(selectedClass.schedule_start_time || selectedClass.scheduleStartTime)} - ${formatTime(selectedClass.schedule_end_time || selectedClass.scheduleEndTime)}` : 
                            'N/A'
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-indigo-100 p-1 rounded-full">
                            <FaSync className="text-indigo-600 text-xs" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Frequency</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {selectedClass.schedule_frequency || selectedClass.scheduleFrequency || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-teal-100 p-1 rounded-full">
                            <FaUsers className="text-teal-600 text-xs" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">Capacity</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {selectedClass.currentStudents || 0} / {selectedClass.maxStudents || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enrollment Statistics Card */}
                  {(() => {
                    const stats = calculateEnrollmentStats(selectedClass.enrollments);
                    return (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-700 mb-2">Enrollment Statistics</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs font-medium text-blue-600">Total</span>
                            <span className="text-sm font-bold text-blue-900">{stats.totalStudents}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs font-medium text-green-600">Active</span>
                            <span className="text-sm font-bold text-green-900">{stats.activeStudents}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs font-medium text-purple-600">Completed</span>
                            <span className="text-sm font-bold text-purple-900">{stats.completedStudents}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs font-medium text-red-600">Dropped</span>
                            <span className="text-sm font-bold text-red-900">{stats.droppedStudents}</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs font-medium text-orange-600">Suspended</span>
                            <span className="text-sm font-bold text-orange-900">{stats.suspendedStudents}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Right Side - Table and Search */}
                <div className="lg:col-span-3">
                  {/* Search and Filter Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                          type="text"
                          placeholder="Search students by name, email, or ID..."
                          value={searchTerm}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={enrollmentStatusFilter}
                          onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="dropped">Dropped</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Students Table */}
                  <BasicTable
                    columns={studentColumns}
                    data={getFilteredEnrollments(selectedClass.enrollments)}
                    actions={studentActions}
                    className=""
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeEnrollmentDetails}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Details Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Student Details
                  </h2>
                  <p className="text-gray-600 mt-1">View comprehensive information about the student</p>
                </div>
                <button
                  onClick={closeStudentDetails}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <FaUser className="text-blue-600 text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Information</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Full Name</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Student ID</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.userid}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Email</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Mobile</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.mobile}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Address</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.address || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">NIC Number</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.nic || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Gender</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.gender || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Age</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.age || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Date of Birth</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.dateOfBirth || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">School</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.school || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Stream</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.stream || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Parent Name</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.parentName || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Parent Mobile</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.parentMobile || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Registration Date</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedStudent.dateJoined || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherEnrollments;
