import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import adminSidebarSections from './AdminDashboardSidebar';
import cashierSidebarSections from '../cashierDashboard/CashierDashboardSidebar';
import { getUserData, logout as authLogout } from '../../../api/apiUtils';
import { 
  FaUsers, FaVideo, FaQrcode, FaChartBar, FaDownload, 
  FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, 
  FaExclamationTriangle, FaSearch, FaFilter, FaSync,
  FaEye, FaEdit, FaTrash, FaFileExport, FaCog, FaBell,
  FaUserGraduate, FaChalkboardTeacher, FaBook, FaMoneyBill, FaTimes, FaGraduationCap
} from 'react-icons/fa';
import BasicTable from '../../../components/BasicTable';
import BasicAlertBox from '../../../components/BasicAlertBox';
import { 
  getClassAttendance, 
  getAttendanceAnalytics, 
  updateAttendanceSettings,
  getAttendanceSettings,
  exportAttendanceReport
} from '../../../api/attendance';
import { getAllClasses } from '../../../api/classes';
import MonthlyAttendanceReport from '../../../components/reports/MonthlyAttendanceReport';

const AttendanceManagement = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', type: 'info', title: '' });
  const [user, setUser] = useState(null);
  
  // Data states
  const [classes, setClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [overviewCounts, setOverviewCounts] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [dayFilter, setDayFilter] = useState('');
  const [streamFilter, setStreamFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  // Settings state
  const [lateThreshold, setLateThreshold] = useState(15);
  const [absentThreshold, setAbsentThreshold] = useState(30);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [modalSortConfig, setModalSortConfig] = useState({ key: '', direction: 'asc' });

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [monthlyReportClassId, setMonthlyReportClassId] = useState(null);
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastRefresh, setLastRefresh] = useState(Date.now()); // Force re-calculations
  const [refreshingClass, setRefreshingClass] = useState(null); // Track which class is being refreshed

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    try {
      const u = getUserData();
      setUser(u);
    } catch (err) {
      setUser(null);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (err) {
      // ignore
    }
    window.location.href = '/login';
  };

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadAllAttendanceData();
        loadAttendanceAnalytics();
      }, refreshInterval);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Listen for global attendance updates (e.g., barcode scanner) and refresh immediately
  useEffect(() => {
    const handler = (e) => {
      // e.detail may contain studentId, classes, results
      loadAllAttendanceData();
      loadAttendanceAnalytics();
      setAlertBox({ open: true, title: 'Attendance Updated', message: 'Attendance data refreshed', type: 'success' });
    };
    try {
      window.addEventListener('attendance:updated', handler);
    } catch (e) {}
    return () => { try { window.removeEventListener('attendance:updated', handler); } catch (e) {} };
  }, []);

  // Helper to derive YYYY-MM-DD date string from a record. Prefer attendance_date, fallback to join_time.
  const getRecordDateStr = (record) => {
    if (!record) return null;
    if (record.attendance_date) return record.attendance_date;
    if (record.join_time) {
      const d = new Date(record.join_time);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
      // Fallback: try to extract YYYY-MM-DD from common SQL datetime formats
      const m = String(record.join_time).match(/(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    return null;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const classesRes = await getAllClasses();
      if (classesRes.success) {
        setClasses(classesRes.data || classesRes);
      }
      
      await loadAttendanceAnalytics();
      await loadAllAttendanceData();
      // Load saved settings from backend
      try {
        const settingsRes = await getAttendanceSettings();
        if (settingsRes && settingsRes.success && settingsRes.settings) {
          const s = settingsRes.settings;
          if (s.late_threshold_minutes) setLateThreshold(Number(s.late_threshold_minutes));
          if (s.absent_threshold_minutes) setAbsentThreshold(Number(s.absent_threshold_minutes));
        }
      } catch (e) {
        // ignore errors loading settings
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllAttendanceData = async () => {
    try {
      // Load attendance analytics for today to power the overview (daily counts)
      const today = new Date().toISOString().split('T')[0];
      const analyticsRes = await getAttendanceAnalytics(null, today, today);
      if (analyticsRes && analyticsRes.analytics && Array.isArray(analyticsRes.analytics.student_attendance)) {
        const sa = analyticsRes.analytics.student_attendance || [];
        setAttendanceData(sa);
        setLastRefresh(Date.now()); // Force component recalculation

        // compute overview counts based on today's attendance records (count each class record separately)
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySa = sa.filter(r => getRecordDateStr(r) === todayStr);
        const totalTodayRecords = todaySa.length;
        const presentTodayCount = todaySa.filter(r => String(r.attendance_status).toLowerCase() === 'present').length;
        const lateTodayCount = todaySa.filter(r => String(r.attendance_status).toLowerCase() === 'late').length;
        const absentTodayCount = todaySa.filter(r => String(r.attendance_status).toLowerCase() === 'absent').length;
        const barcodeTodayCount = todaySa.filter(r => {
          const s = String(r.source || '').toLowerCase();
          return s.includes('barcode') || s.includes('image');
        }).length;
        const zoomTodayCount = todaySa.filter(r => String(r.source || '').toLowerCase().includes('zoom')).length;
        const recordedVideoTodayCount = todaySa.filter(r => String(r.source || '').toLowerCase().includes('recorded')).length;
        setOverviewCounts({ totalTodayRecords, presentToday: presentTodayCount, lateToday: lateTodayCount, absentToday: absentTodayCount, barcodeToday: barcodeTodayCount, zoomToday: zoomTodayCount, recordedVideoToday: recordedVideoTodayCount });
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const loadAttendanceAnalytics = async () => {
    try {
      const analyticsRes = await getAttendanceAnalytics();
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.analytics || {});
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadClassAttendance = async (classId) => {
    try {
      setLoading(true);
      const response = await getClassAttendance(classId);
      if (response.success) {
        setAttendanceData(response.data || []);
        setSelectedClass(classId);
      }
    } catch (error) {
      setAlertBox({
        open: true,
        title: 'Error',
        message: 'Failed to load attendance data',
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format = 'json', classId = null) => {
    try {
      const targetClassId = classId || selectedClass;
      await exportAttendanceReport(targetClassId, format);
      setAlertBox({
        open: true,
        title: 'Success',
        message: `Report exported as ${format.toUpperCase()}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Export error:', error);
      setAlertBox({
        open: true,
        title: 'Error',
        message: 'Failed to export report',
        type: 'danger'
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await loadInitialData();
      setAlertBox({
        open: true,
        title: 'Success',
        message: 'Attendance data refreshed successfully',
        type: 'success'
      });
    } catch (error) {
      setAlertBox({
        open: true,
        title: 'Error',
        message: 'Failed to refresh attendance data',
        type: 'danger'
      });
    }
  };

  // Quick refresh for individual class
  const handleQuickRefresh = async (classId) => {
    try {
      setRefreshingClass(classId);
      
      // Get fresh data for this specific class
      const response = await getClassAttendance(classId);
      if (response.success) {
        // Update the main attendance data with fresh data for this class
        setAttendanceData(prevData => {
          const updatedData = prevData.filter(item => String(item.class_id) !== String(classId));
          return [...updatedData, ...(response.data || [])];
        });
        setLastRefresh(Date.now()); // Force component recalculation
        
        setAlertBox({
          open: true,
          title: 'Success',
          message: `Attendance data refreshed for class ${classId}`,
          type: 'success'
        });
      } else {
        throw new Error('Failed to get updated data');
      }
    } catch (error) {
      setAlertBox({
        open: true,
        title: 'Error',
        message: `Failed to refresh data for class ${classId}`,
        type: 'danger'
      });
    } finally {
      setRefreshingClass(null);
    }
  };

  // Refresh attendance data when filters change
  useEffect(() => {
    if (classes.length > 0) {
      loadAllAttendanceData();
    }
  }, [dateFilter, monthFilter, yearFilter, streamFilter, deliveryFilter]);

  const handleResetToPreviousMonth = () => {
    // Get current month filter or use current month
    const currentMonth = monthFilter && monthFilter !== 'All Months' ? parseInt(monthFilter) - 1 : new Date().getMonth();
    const currentYear = yearFilter && yearFilter !== 'All Years' ? parseInt(yearFilter) : new Date().getFullYear();
    
    // Calculate previous month
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    
    if (previousMonth < 0) {
      previousMonth = 11; // December
      previousYear = currentYear - 1;
    }
    
    // Clear the date filter and only set month/year
    setDateFilter(''); // Clear day filter
    setMonthFilter((previousMonth + 1).toString());
    setYearFilter(previousYear.toString());
  };

  const handleResetToThisMonth = () => {
    const now = new Date();
    setDateFilter(''); // Clear day filter
    setMonthFilter((now.getMonth() + 1).toString());
    setYearFilter(now.getFullYear().toString());
  };

  const handleClearAllFilters = () => {
    setDateFilter('');
    setMonthFilter('');
    setYearFilter('');
    setStreamFilter('All Streams');
    setDeliveryFilter('All Delivery Methods');
    setSearchTerm('');
  };

  const handleViewStudents = async (classItem) => {
    try {
      setLoading(true);
      
      // Load attendance data for this specific class from API
      const response = await getClassAttendance(classItem.classId);
      
      if (response.success) {
        let filteredAttendance = response.data || [];
        
        // Apply filters to the attendance data
        if (dateFilter) {
          const selectedDate = new Date(dateFilter);
          filteredAttendance = filteredAttendance.filter(item => {
            if (!item.join_time) return false;
            const joinDate = new Date(item.join_time);
            return joinDate.toDateString() === selectedDate.toDateString();
          });
        } else if (monthFilter && monthFilter !== 'All Months' && yearFilter && yearFilter !== 'All Years') {
          // Month and year filter (no specific day)
          const selectedMonth = parseInt(monthFilter) - 1; // 0-based month
          const selectedYear = parseInt(yearFilter);
          filteredAttendance = filteredAttendance.filter(item => {
            if (!item.join_time) return false;
            const joinDate = new Date(item.join_time);
            return joinDate.getMonth() === selectedMonth && joinDate.getFullYear() === selectedYear;
          });
        }
        // If no filters are applied, show all attendance records
        
        if (streamFilter && streamFilter !== 'All Streams') {
          // Note: Stream filtering would need to be done at the API level
          // For now, we'll show all data and let the user filter in the modal
        }
        
        if (deliveryFilter && deliveryFilter !== 'All Delivery Methods') {
          filteredAttendance = filteredAttendance.filter(item => {
            const source = item.source || '';
            switch (deliveryFilter) {
              case 'Zoom':
                return source.includes('zoom');
              case 'Manual':
                return source === 'manual';
              case 'Barcode':
                return source === 'barcode';
              case 'Recorded Video':
                return source === 'recorded_video';
              default:
                return true;
            }
          });
        }
        
        // Update the main attendance data with fresh data for this class
        // This ensures the Action column count reflects the latest data
        setAttendanceData(prevData => {
          // Remove old records for this class and add fresh ones
          const updatedData = prevData.filter(item => String(item.class_id) !== String(classItem.classId));
          return [...updatedData, ...(response.data || [])];
        });
        setLastRefresh(Date.now()); // Force component recalculation
        
        setSelectedAttendance({ 
          class: classItem, 
          attendance: filteredAttendance,
          totalRecords: response.data?.length || 0,
          filteredRecords: filteredAttendance.length
        });
        setShowDetailsModal(true);
      } else {
        setAlertBox({
          open: true,
          title: 'Error',
          message: 'Failed to load attendance data for this class',
          type: 'danger'
        });
      }
    } catch (error) {
      console.error('Error loading class attendance:', error);
      setAlertBox({
        open: true,
        title: 'Error',
        message: 'Failed to load attendance data for this class',
        type: 'danger'
      });
    } finally {
      setLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedAttendance(null);
  };

  // Transform classes data to include attendance counts
  const classesWithAttendance = classes.map(classItem => {
    // Count attendance records for this class from real data
  const classAttendance = attendanceData.filter(item => String(item.class_id) === String(classItem.id));
    

    
    // Filter by selected date range or month/year
    let filteredAttendance = classAttendance;
    if (dateFilter) {
      // Specific date filter
      const selectedDate = new Date(dateFilter);
      filteredAttendance = classAttendance.filter(item => {
        if (!item.join_time) return false;
        const joinDate = new Date(item.join_time);
        return joinDate.toDateString() === selectedDate.toDateString();
      });
    } else if (monthFilter && monthFilter !== 'All Months' && yearFilter && yearFilter !== 'All Years') {
      // Month and year filter (no specific day)
      const selectedMonth = parseInt(monthFilter) - 1; // 0-based month
      const selectedYear = parseInt(yearFilter);
      filteredAttendance = classAttendance.filter(item => {
        if (!item.join_time) return false;
        const joinDate = new Date(item.join_time);
        return joinDate.getMonth() === selectedMonth && joinDate.getFullYear() === selectedYear;
      });
    } else {
      // If no filters are applied, show all attendance records for this class
      filteredAttendance = classAttendance;
    }



    return {
      ...classItem,
      classId: classItem.id,
      className: classItem.className,
      subject: classItem.subject,
      teacher: classItem.teacher,
      stream: classItem.stream,
      deliveryMethod: classItem.deliveryMethod,
      courseType: classItem.course_type || classItem.courseType || 'theory',
      scheduleDay: classItem.schedule_day,
      scheduleStartTime: classItem.schedule_start_time,
      scheduleEndTime: classItem.schedule_end_time,
      scheduleFrequency: classItem.schedule_frequency,
      maxStudents: classItem.maxStudents,
      currentStudents: classItem.currentStudents,
      activeEnrollments: classItem.currentStudents || 0,
      capacityPercentage: classItem.maxStudents > 0 ? 
        Math.round((classItem.currentStudents / classItem.maxStudents) * 100) : 0,
      attendanceCount: filteredAttendance.length,
      totalAttendance: classAttendance.length // Total attendance for this class
    };
  });

  // Filter classes data
  const filteredClasses = classesWithAttendance.filter(classItem => {
    const matchesSearch = !searchTerm || 
      classItem.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.teacher?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.classId.toString().includes(searchTerm);
    
    const matchesDay = !dayFilter || classItem.scheduleDay === dayFilter;
    const matchesStream = !streamFilter || classItem.stream === streamFilter;
    const matchesDelivery = !deliveryFilter || classItem.deliveryMethod === deliveryFilter;
    const matchesCourseType = !courseTypeFilter || classItem.courseType === courseTypeFilter;
    
    return matchesSearch && matchesDay && matchesStream && matchesDelivery && matchesCourseType;
  });

  // Sort filtered classes
  const sortedAndFilteredClasses = React.useMemo(() => {
    if (!sortConfig.key) return filteredClasses;

    return [...filteredClasses].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle nested properties
      if (sortConfig.key.includes('.')) {
        const keys = sortConfig.key.split('.');
        aVal = keys.reduce((obj, key) => obj?.[key], a);
        bVal = keys.reduce((obj, key) => obj?.[key], b);
      }

      // Handle date sorting
      if (aVal && bVal && !isNaN(new Date(aVal))) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle string sorting
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredClasses, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle modal sort
  const handleModalSort = (key) => {
    setModalSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort modal attendance data
  const sortedModalAttendance = React.useMemo(() => {
    if (!selectedAttendance?.attendance || !modalSortConfig.key) return selectedAttendance?.attendance || [];

    return [...selectedAttendance.attendance].sort((a, b) => {
      let aVal = a[modalSortConfig.key];
      let bVal = b[modalSortConfig.key];

      // Handle nested properties
      if (modalSortConfig.key.includes('.')) {
        const keys = modalSortConfig.key.split('.');
        aVal = keys.reduce((obj, key) => obj?.[key], a);
        bVal = keys.reduce((obj, key) => obj?.[key], b);
      }

      // Handle date sorting
      if (aVal && bVal && !isNaN(new Date(aVal))) {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return modalSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle string sorting
      if (aVal < bVal) return modalSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return modalSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [selectedAttendance?.attendance, modalSortConfig]);

  // Calculate filtered attendance statistics
  const filteredAttendanceStats = React.useMemo(() => {
    // Get all attendance records for filtered classes
    const filteredAttendanceRecords = attendanceData.filter(record => {
      const classItem = classes.find(c => String(c.id) === String(record.class_id));
      if (!classItem) return false;

      // Apply the same filters as the main table
      const matchesSearch = !searchTerm || 
        classItem.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.teacher?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classItem.id.toString().includes(searchTerm);
      
      const matchesDay = !dayFilter || classItem.schedule_day === dayFilter;
      const matchesStream = !streamFilter || classItem.stream === streamFilter;
      const matchesDelivery = !deliveryFilter || classItem.deliveryMethod === deliveryFilter;
      
      return matchesSearch && matchesDay && matchesStream && matchesDelivery;
    });

    // Calculate today's attendance
    const today = new Date();
    const todayAttendance = filteredAttendanceRecords.filter(record => {
      if (!record.join_time) return false;
      const joinDate = new Date(record.join_time);
      return joinDate.toDateString() === today.toDateString();
    });

  // Calculate statistics
  // totalStudents should reflect unique students, not raw record count
  const uniqueStudentIds = new Set(filteredAttendanceRecords.map(r => r.student_id));
  const totalStudents = uniqueStudentIds.size;
  // For daily present/late/absent counts use unique students (a student may have multiple records)
  const presentStudentIds = new Set(todayAttendance.filter(r => String(r.attendance_status).toLowerCase() === 'present').map(r => r.student_id));
  const lateStudentIds = new Set(todayAttendance.filter(r => String(r.attendance_status).toLowerCase() === 'late').map(r => r.student_id));
  const absentStudentIds = new Set(todayAttendance.filter(r => String(r.attendance_status).toLowerCase() === 'absent').map(r => r.student_id));
  const presentToday = presentStudentIds.size;
  const lateToday = lateStudentIds.size;
  const absentToday = absentStudentIds.size;

  // Calculate attendance by type — treat any source containing the token as that type
  // Count unique students per source type for clearer overview
  const zoomStudentIds = new Set(filteredAttendanceRecords.filter(record => String(record.source || '').toLowerCase().includes('zoom')).map(r => r.student_id));
  const recordedVideoStudentIds = new Set(filteredAttendanceRecords.filter(record => String(record.source || '').toLowerCase() === 'recorded_video').map(r => r.student_id));
  // Count barcode attendances as raw attendance records (per-class). This makes the barcode count
  // reflect multiple attendances by the same student across different classes (e.g. 3 records -> 3).
  const barcodeAttendance = filteredAttendanceRecords.filter(record => {
    const s = String(record.source || '').toLowerCase();
    return s.includes('barcode') || s.includes('image');
  }).length;
  const zoomAttendance = zoomStudentIds.size;
  const recordedVideoAttendance = recordedVideoStudentIds.size;

    return {
      totalStudents,
      presentToday,
      lateToday,
      absentToday,
      zoomAttendance,
      recordedVideoAttendance,
      barcodeAttendance
    };
  }, [attendanceData, classes, searchTerm, dayFilter, streamFilter, deliveryFilter]);

  // Get unique values for filter dropdowns
  const uniqueDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const uniqueStreams = [...new Set(classes.map(c => c.stream))].filter(Boolean);
  const uniqueDeliveryMethods = [...new Set(classes.map(c => c.deliveryMethod))].filter(Boolean);

  // Today's date string and a safe fallback count computed from analytics.student_attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const analyticsBarcodeToday = (analytics?.student_attendance || []).filter(r => {
    const s = String(r.source || '').toLowerCase();
    return getRecordDateStr(r) === todayStr && (s.includes('barcode') || s.includes('image'));
  }).length || 0;

  // Helper functions

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK');
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

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

  const getCapacityColor = (percentage) => {
    if (percentage >= 90) return 'text-red-700 bg-red-100 border border-red-200';
    if (percentage >= 75) return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
    return 'text-green-700 bg-green-100 border border-green-200';
  };

  const getAttendanceTypeIcon = (source) => {
    switch (source) {
      case 'zoom_webhook':
        return <FaVideo className="text-blue-600" title="Zoom Webhook" />;
      case 'zoom_manual':
        return <FaVideo className="text-green-600" title="Zoom Manual" />;
      case 'recorded_video':
        return <FaVideo className="text-purple-600" title="Recorded Video" />;
      case 'barcode':
      case 'image':
        return <FaQrcode className="text-orange-600" title="Barcode" />;
      default:
        return <FaUsers className="text-gray-400" title="Unknown" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'text-green-700 bg-green-100 border border-green-200';
      case 'late':
        return 'text-yellow-700 bg-yellow-100 border border-yellow-200';
      case 'absent':
        return 'text-red-700 bg-red-100 border border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  // Define columns for BasicTable
  const columns = [
    {
      key: 'className',
      label: 'Class Info',
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
      sortable: true,
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
      key: 'scheduleDay',
      label: 'Schedule',
      sortable: true,
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
      key: 'activeEnrollments',
      label: 'Enrollments',
      sortable: true,
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

  ];

  // Define columns for student attendance table in modal
  const studentAttendanceColumns = [
    {
      key: 'studentInfo',
      label: 'Student Information',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-900">
            {row.student_name || row.studentName || row.student_id}
          </div>
          <div className="text-sm text-gray-500">
            ID: {row.student_id}
          </div>
        </div>
      )
    },
    {
      key: 'source',
      label: 'Attendance Type',
      sortable: true,
      render: (row) => (
        <div className="flex items-center space-x-2">
          {getAttendanceTypeIcon(row.source)}
          <span className="text-sm text-gray-900 capitalize">
            {row.source?.replace('_', ' ')}
          </span>
        </div>
      )
    },
    {
      key: 'attendance_status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.attendance_status)}`}>
          {row.attendance_status}
        </span>
      )
    },
    {
      key: 'join_time',
      label: 'Time Information',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <div className="text-sm text-gray-900">
            Join: {formatTime(row.join_time)}
          </div>
          {row.leave_time && (
            <div className="text-sm text-gray-500">
              Leave: {formatTime(row.leave_time)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'duration_minutes',
      label: 'Duration',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-900">
          {row.duration_minutes ? `${row.duration_minutes} min` : 'N/A'}
        </span>
      )
    }
  ];

  // Define actions for BasicTable
  const actions = (row) => (
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => handleViewStudents(row)}
        className="flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-all duration-200 border border-blue-200 text-xs font-medium shadow-sm hover:shadow-md"
        title={`View Students (${row.attendanceCount || 0} records) - Click to view details`}
      >
        <FaUsers size={12} className="mr-1" />
        Students({row.attendanceCount || 0})
      </button>
      <button
        onClick={() => {
          setMonthlyReportClassId(row.classId);
          setShowMonthlyReport(true);
        }}
        className="flex items-center justify-center px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-all duration-200 border border-purple-200 text-xs font-medium shadow-sm hover:shadow-md"
        title="View monthly attendance report for this class"
      >
        <FaCalendarAlt size={10} className="mr-1" />
        Monthly Report
      </button>
      <button
        onClick={() => handleQuickRefresh(row.classId)}
        disabled={refreshingClass === row.classId}
        className={`flex items-center justify-center px-2 py-1 rounded transition-all duration-200 border text-xs font-medium shadow-sm hover:shadow-md ${
          refreshingClass === row.classId 
            ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' 
            : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
        }`}
        title="Refresh attendance count for this class"
      >
        <FaSync size={10} className={`mr-1 ${refreshingClass === row.classId ? 'animate-spin' : ''}`} />
        {refreshingClass === row.classId ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                {overviewCounts ? overviewCounts.totalTodayRecords : filteredAttendanceStats.totalStudents}
                </p>
            </div>
            <FaUsers className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-gray-900">
                {overviewCounts ? overviewCounts.presentToday : filteredAttendanceStats.presentToday}
                </p>
            </div>
            <FaCheckCircle className="text-3xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late Today</p>
                <p className="text-2xl font-bold text-gray-900">
                {overviewCounts ? overviewCounts.lateToday : filteredAttendanceStats.lateToday}
                </p>
            </div>
            <FaExclamationTriangle className="text-3xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
                <p className="text-2xl font-bold text-gray-900">
                {overviewCounts ? overviewCounts.absentToday : filteredAttendanceStats.absentToday}
                </p>
            </div>
            <FaTimesCircle className="text-3xl text-red-500" />
          </div>
        </div>
      </div>

      {/* Attendance by Type */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <FaVideo className="text-3xl text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Zoom Attendance</p>
            <p className="text-2xl font-bold text-blue-600">
              {overviewCounts?.zoomToday ?? (analytics?.overall_stats?.zoom_count || filteredAttendanceStats.zoomAttendance)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <FaVideo className="text-3xl text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Recorded Video</p>
            <p className="text-2xl font-bold text-purple-600">
              {overviewCounts?.recordedVideoToday ?? (analytics?.overall_stats?.recorded_video_count || filteredAttendanceStats.recordedVideoAttendance)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <FaQrcode className="text-3xl text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Barcode</p>
            <p className="text-2xl font-bold text-orange-600">
              {overviewCounts?.barcodeToday ?? (analyticsBarcodeToday || analytics?.overall_stats?.barcode_count) ?? filteredAttendanceStats.barcodeAttendance}
            </p>
          </div>
        </div>
      </div>

      {/* Top classes by attendance (lightweight inline bar chart) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top classes by attendance</h3>
        <div className="grid grid-cols-1 gap-2">
          {(() => {
            // compute top classes from current computed classesWithAttendance
            const topN = 8;
            const ranked = [...classesWithAttendance].sort((a,b) => (b.attendanceCount || 0) - (a.attendanceCount || 0)).slice(0, topN);
            const maxVal = ranked.reduce((m, r) => Math.max(m, r.attendanceCount || 0), 0) || 1;
            if (ranked.length === 0) return <div className="text-sm text-gray-500">No attendance data available yet</div>;
            return ranked.map((r, i) => (
              <div key={r.classId || i} className="flex items-center gap-3">
                <div className="w-1/3 text-sm text-gray-700 truncate">{r.className || `Class ${r.classId}`}</div>
                <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                  <div style={{ width: `${Math.round(((r.attendanceCount||0)/maxVal)*100)}%` }} className="h-full bg-blue-500" />
                </div>
                <div className="w-14 text-right text-sm font-medium text-gray-800">{r.attendanceCount || 0}</div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );

  const renderDetailedTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search attendance..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Days</option>
          {uniqueDays.map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        
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
          <option value="">All Years</option>
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <button
          onClick={handleResetToPreviousMonth}
          className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Reset to Previous Month
        </button>
      </div>

      <div className="flex justify-end space-x-2 mb-4">
        <button
          onClick={handleResetToThisMonth}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reset to This Month
        </button>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => handleExportReport('csv')}
          className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FaDownload className="mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filter Summary */}
      {(dateFilter || streamFilter !== 'All Streams' || deliveryFilter !== 'All Delivery Methods' || searchTerm) && (
        <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold text-gray-700 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                Filters applied:
              </span>
              <div className="flex items-center space-x-2 flex-wrap">
                {dateFilter && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200 shadow-sm">
                    {new Date(dateFilter).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                )}
                {!dateFilter && monthFilter && monthFilter !== 'All Months' && yearFilter && yearFilter !== 'All Years' && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200 shadow-sm">
                    {new Date(parseInt(yearFilter), parseInt(monthFilter) - 1).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                )}
                {!dateFilter && (!monthFilter || monthFilter === 'All Months') && (!yearFilter || yearFilter === 'All Years') && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200 shadow-sm">
                    All Time
                  </span>
                )}
                {monthFilter && monthFilter !== 'All Months' && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full border border-indigo-200 shadow-sm">
                    Month: {new Date(2025, parseInt(monthFilter) - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </span>
                )}
                {yearFilter && yearFilter !== 'All Years' && (
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 text-sm font-medium rounded-full border border-teal-200 shadow-sm">
                    Year: {yearFilter}
                  </span>
                )}
                {streamFilter !== 'All Streams' && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200 shadow-sm">
                    {streamFilter}
                  </span>
                )}
                {deliveryFilter !== 'All Delivery Methods' && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full border border-purple-200 shadow-sm">
                    {deliveryFilter}
                  </span>
                )}
                {searchTerm && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full border border-orange-200 shadow-sm">
                    Search: "{searchTerm}"
                  </span>
                )}
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full border border-gray-200 shadow-sm">
                  {sortedAndFilteredClasses.length} classes shown
                </span>
              </div>
            </div>
            <button
              onClick={handleClearAllFilters}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors border border-red-200 hover:border-red-300"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Attendance Records</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {sortedAndFilteredClasses.length} classes
              </span>
            </div>
          </div>
        </div>

        <BasicTable
          data={sortedAndFilteredClasses}
          columns={columns}
          actions={actions}
          onSort={handleSort}
          sortConfig={sortConfig}
        />
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Attendance Rules</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Late Threshold (minutes)</label>
                <input
                  type="number"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Absent Threshold (minutes)</label>
                <input
                  type="number"
                  value={absentThreshold}
                  onChange={(e) => setAbsentThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="pt-2">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  onClick={async () => {
                    try {
                      const payload = {
                        late_threshold_minutes: lateThreshold,
                        absent_threshold_minutes: absentThreshold
                      };
                      const res = await updateAttendanceSettings(payload);
                      if (res.success) {
                        setAlertBox({ open: true, title: 'Saved', message: 'Attendance settings updated', type: 'success' });
                      } else {
                        setAlertBox({ open: true, title: 'Error', message: res.message || 'Failed to save settings', type: 'danger' });
                      }
                    } catch (err) {
                      console.error('Error saving settings', err);
                      setAlertBox({ open: true, title: 'Error', message: 'Failed to save settings', type: 'danger' });
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">System Health</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <FaCheckCircle className="text-3xl text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">Attendance Backend</p>
            <p className="text-sm text-green-600">Connected</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <FaVideo className="text-3xl text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-blue-800">Zoom Integration</p>
            <p className="text-sm text-blue-600">Active</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <FaQrcode className="text-3xl text-purple-600 mx-auto mb-2" />
            <p className="font-medium text-purple-800">Barcode System</p>
            <p className="text-sm text-purple-600">Ready</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'detailed':
        return renderDetailedTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (loading) {
    const layoutProps = user?.role === 'cashier' ? {
      userRole: 'Cashier',
      sidebarItems: cashierSidebarSections,
      onLogout: handleLogout,
      customTitle: 'TCMS',
      customSubtitle: `Cashier Dashboard - ${user?.name || 'Cashier'}`
    } : {
      userRole: 'Administrator',
      sidebarItems: adminSidebarSections,
      onLogout
    };

    return (
      <DashboardLayout {...layoutProps}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading attendance data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    const layoutProps = user?.role === 'cashier' ? {
      userRole: 'Cashier',
      sidebarItems: cashierSidebarSections,
      onLogout: handleLogout,
      customTitle: 'TCMS',
      customSubtitle: `Cashier Dashboard - ${user?.name || 'Cashier'}`
    } : {
      userRole: 'Administrator',
      sidebarItems: adminSidebarSections,
      onLogout
    };

    return (
      <DashboardLayout {...layoutProps}>
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
      </DashboardLayout>
    );
  }

  const layoutProps = user?.role === 'cashier' ? {
    userRole: 'Cashier',
    sidebarItems: cashierSidebarSections,
    onLogout: handleLogout,
    customTitle: 'TCMS',
    customSubtitle: `Cashier Dashboard - ${user?.name || 'Cashier'}`
  } : {
    userRole: 'Administrator',
    sidebarItems: adminSidebarSections,
    onLogout
  };

  return (
    <DashboardLayout {...layoutProps}>
      <div className="w-full max-w-7xl mx-auto bg-white p-8 rounded-lg shadow">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-gray-600 mt-2">Manage and track student attendance across all delivery methods</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Auto-refresh toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-refresh" className="text-sm text-gray-700">
                Auto-refresh ({refreshInterval / 1000}s)
              </label>
            </div>
            
            {/* Manual refresh button */}
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Manually refresh attendance data"
            >
              <FaSync className="mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: FaChartBar },
                { id: 'detailed', label: 'Detailed Records', icon: FaUsers },
                { id: 'settings', label: 'Settings', icon: FaCog }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Student Attendance Details Modal */}
        {showDetailsModal && selectedAttendance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Student Attendance - {selectedAttendance.class?.className}
                </h3>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700">Class</label>
                    <p className="text-sm text-gray-900">{selectedAttendance.class?.className}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700">Teacher</label>
                    <p className="text-sm text-gray-900">{selectedAttendance.class?.teacher}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700">Total Records</label>
                    <p className="text-sm text-gray-900">{selectedAttendance.totalRecords || 0}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700">Filtered Records</label>
                    <p className="text-sm text-gray-900">{selectedAttendance.filteredRecords || 0}</p>
                    {selectedAttendance.totalRecords !== selectedAttendance.filteredRecords && (
                      <p className="text-xs text-gray-500 mt-1">
                        (Filtered by current selections)
                      </p>
                    )}
                  </div>
                </div>

                <BasicTable
                  data={sortedModalAttendance}
                  columns={studentAttendanceColumns}
                  onSort={handleModalSort}
                  sortConfig={modalSortConfig}
                  emptyMessage="No attendance records found for this class"
                />
              </div>
              
              <div className="mt-6 flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExportReport('csv', selectedAttendance.class?.classId)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <FaDownload />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => handleExportReport('pdf', selectedAttendance.class?.classId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                  >
                    <FaFileExport />
                    <span>Export PDF</span>
                  </button>
                </div>
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

        {/* Monthly Attendance Report Modal */}
        {showMonthlyReport && monthlyReportClassId && (
          <MonthlyAttendanceReport
            classId={monthlyReportClassId}
            onClose={() => {
              setShowMonthlyReport(false);
              setMonthlyReportClassId(null);
            }}
          />
        )}

        {/* Alert Box */}
        <BasicAlertBox
          open={alertBox.open}
          title={alertBox.title}
          message={alertBox.message}
          type={alertBox.type}
          onConfirm={() => setAlertBox({ ...alertBox, open: false })}
          confirmText="OK"
        />
      </div>
    </DashboardLayout>
  );
};

export default AttendanceManagement;
