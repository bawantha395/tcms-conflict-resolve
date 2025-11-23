import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from './TeacherDashboardSidebar';
import { 
  FaUsers, FaVideo, FaQrcode, FaChartBar, FaDownload, 
  FaCalendarAlt, FaClock, FaCheckCircle, FaTimesCircle, 
  FaExclamationTriangle, FaSearch, FaFilter, FaSync,
  FaEye
} from 'react-icons/fa';
import BasicTable from '../../../components/BasicTable';
import BasicAlertBox from '../../../components/BasicAlertBox';
import { 
  getClassAttendance, 
  getAttendanceAnalytics,
  exportAttendanceReport
} from '../../../api/attendance';
import { getClassesByTeacher } from '../../../api/classes';
import { getUserData } from '../../../api/apiUtils';
import MonthlyAttendanceReport from '../../../components/reports/MonthlyAttendanceReport';

const TeacherAttendanceManagement = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertBox, setAlertBox] = useState({ open: false, message: '', type: 'info', title: '' });
  
  // Get current teacher data
  const currentTeacher = getUserData();
  const teacherId = currentTeacher?.teacherId || currentTeacher?.id || currentTeacher?.userid;
  
  // Data states
  const [classes, setClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [overviewCounts, setOverviewCounts] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [dayFilter, setDayFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState((new Date().getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [monthlyReportClassId, setMonthlyReportClassId] = useState(null);
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshingClass, setRefreshingClass] = useState(null);

  useEffect(() => {
    if (teacherId) {
      loadInitialData();
    } else {
      setError('Teacher information not found');
      setLoading(false);
    }
  }, [teacherId]);

  // Auto-refresh effect
  useEffect(() => {
    let interval;
    if (autoRefresh && teacherId) {
      interval = setInterval(() => {
        loadAllAttendanceData();
      }, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, teacherId]);

  // Listen for global attendance updates
  useEffect(() => {
    const handler = () => {
      loadAllAttendanceData();
      setAlertBox({ open: true, title: 'Attendance Updated', message: 'Attendance data refreshed', type: 'success' });
    };
    try {
      window.addEventListener('attendance:updated', handler);
    } catch (e) {}
    return () => { try { window.removeEventListener('attendance:updated', handler); } catch (e) {} };
  }, []);

  const getRecordDateStr = (record) => {
    if (!record) return null;
    if (record.attendance_date) return record.attendance_date;
    if (record.join_time) {
      const d = new Date(record.join_time);
      if (!isNaN(d)) return d.toISOString().split('T')[0];
      const m = String(record.join_time).match(/(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    return null;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load only this teacher's classes
      const classesRes = await getClassesByTeacher(teacherId);
      if (classesRes.success) {
        setClasses(classesRes.data || []);
      }
      
      await loadAllAttendanceData();
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllAttendanceData = async () => {
    try {
      // Load attendance for all teacher's classes
      const today = new Date().toISOString().split('T')[0];
      const allAttendance = [];
      
      for (const classItem of classes) {
        try {
          const response = await getClassAttendance(classItem.id);
          if (response.success && response.data) {
            allAttendance.push(...response.data);
          }
        } catch (err) {
          console.error(`Error loading attendance for class ${classItem.id}:`, err);
        }
      }
      
      setAttendanceData(allAttendance);
      setLastRefresh(Date.now());

      // Compute overview counts for today
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySa = allAttendance.filter(r => getRecordDateStr(r) === todayStr);
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
      
      setOverviewCounts({ 
        totalTodayRecords, 
        presentToday: presentTodayCount, 
        lateToday: lateTodayCount, 
        absentToday: absentTodayCount, 
        barcodeToday: barcodeTodayCount, 
        zoomToday: zoomTodayCount, 
        recordedVideoToday: recordedVideoTodayCount 
      });
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const handleExportReport = async (classId = null) => {
    try {
      await exportAttendanceReport(classId, 'json');
      setAlertBox({
        open: true,
        title: 'Success',
        message: 'Report exported successfully',
        type: 'success'
      });
    } catch (error) {
      setAlertBox({
        open: true,
        title: 'Error',
        message: 'Failed to export report',
        type: 'danger'
      });
    }
  };

  const handleRefresh = async () => {
    await loadInitialData();
    setAlertBox({
      open: true,
      title: 'Success',
      message: 'Attendance data refreshed successfully',
      type: 'success'
    });
  };

  const handleQuickRefresh = async (classId) => {
    try {
      setRefreshingClass(classId);
      const response = await getClassAttendance(classId);
      
      if (response.success) {
        setAttendanceData(prevData => {
          const updatedData = prevData.filter(item => String(item.class_id) !== String(classId));
          return [...updatedData, ...(response.data || [])];
        });
        setLastRefresh(Date.now());
        
        setAlertBox({
          open: true,
          title: 'Success',
          message: `Attendance refreshed for class ${classId}`,
          type: 'success'
        });
      }
    } catch (error) {
      setAlertBox({
        open: true,
        title: 'Error',
        message: `Failed to refresh class ${classId}`,
        type: 'danger'
      });
    } finally {
      setRefreshingClass(null);
    }
  };

  const handleViewStudents = async (classItem) => {
    try {
      setLoading(true);
      const response = await getClassAttendance(classItem.classId);
      
      if (response.success) {
        let filteredAttendance = response.data || [];
        
        // Apply date filters
        if (dateFilter) {
          const selectedDate = new Date(dateFilter);
          filteredAttendance = filteredAttendance.filter(item => {
            if (!item.join_time) return false;
            const joinDate = new Date(item.join_time);
            return joinDate.toDateString() === selectedDate.toDateString();
          });
        } else if (monthFilter && monthFilter !== 'All Months' && yearFilter && yearFilter !== 'All Years') {
          const selectedMonth = parseInt(monthFilter) - 1;
          const selectedYear = parseInt(yearFilter);
          filteredAttendance = filteredAttendance.filter(item => {
            if (!item.join_time) return false;
            const joinDate = new Date(item.join_time);
            return joinDate.getMonth() === selectedMonth && joinDate.getFullYear() === selectedYear;
          });
        }
        
        setSelectedAttendance({ 
          class: classItem, 
          attendance: filteredAttendance,
          totalRecords: response.data?.length || 0,
          filteredRecords: filteredAttendance.length
        });
        setShowDetailsModal(true);
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

  // Transform classes with attendance counts
  const classesWithAttendance = classes.map(classItem => {
    const classAttendance = attendanceData.filter(item => String(item.class_id) === String(classItem.id));
    
    let filteredAttendance = classAttendance;
    if (dateFilter) {
      const selectedDate = new Date(dateFilter);
      filteredAttendance = classAttendance.filter(item => {
        if (!item.join_time) return false;
        const joinDate = new Date(item.join_time);
        return joinDate.toDateString() === selectedDate.toDateString();
      });
    } else if (monthFilter && monthFilter !== 'All Months' && yearFilter && yearFilter !== 'All Years') {
      const selectedMonth = parseInt(monthFilter) - 1;
      const selectedYear = parseInt(yearFilter);
      filteredAttendance = classAttendance.filter(item => {
        if (!item.join_time) return false;
        const joinDate = new Date(item.join_time);
        return joinDate.getMonth() === selectedMonth && joinDate.getFullYear() === selectedYear;
      });
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
      maxStudents: classItem.maxStudents,
      currentStudents: classItem.currentStudents,
      attendanceCount: filteredAttendance.length,
      totalAttendance: classAttendance.length
    };
  });

  // Filter classes
  const filteredClasses = classesWithAttendance.filter(classItem => {
    const matchesSearch = !searchTerm || 
      classItem.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDay = !dayFilter || classItem.scheduleDay === dayFilter;
    const matchesDelivery = !deliveryFilter || classItem.deliveryMethod === deliveryFilter;
    const matchesCourseType = !courseTypeFilter || classItem.courseType === courseTypeFilter;
    
    return matchesSearch && matchesDay && matchesDelivery && matchesCourseType;
  });

  // Helper functions
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'present') return 'bg-green-100 text-green-800';
    if (s === 'late') return 'bg-yellow-100 text-yellow-800';
    if (s === 'absent') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getAttendanceTypeIcon = (source) => {
    const s = String(source || '').toLowerCase();
    if (s.includes('zoom')) return <FaVideo className="text-blue-600" />;
    if (s.includes('barcode') || s.includes('image')) return <FaQrcode className="text-orange-600" />;
    if (s.includes('recorded')) return <FaVideo className="text-purple-600" />;
    return <FaCheckCircle className="text-gray-600" />;
  };

  // Table columns
  const classColumns = [
    {
      key: 'className',
      label: 'Class Name',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-900">{row.className}</div>
          <div className="text-sm text-gray-500">{row.subject}</div>
        </div>
      )
    },
    {
      key: 'stream',
      label: 'Stream',
      sortable: true
    },
    {
      key: 'scheduleDay',
      label: 'Day',
      sortable: true
    },
    {
      key: 'schedule',
      label: 'Time',
      render: (row) => (
        <div className="text-sm text-gray-900">
          {row.scheduleStartTime} - {row.scheduleEndTime}
        </div>
      )
    },
    {
      key: 'deliveryMethod',
      label: 'Mode',
      sortable: true,
      render: (row) => {
        const method = row.deliveryMethod || 'physical';
        if (method === 'online') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Online</span>;
        if (method === 'hybrid') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Hybrid</span>;
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Physical</span>;
      }
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
      key: 'currentStudents',
      label: 'Students',
      sortable: true,
      render: (row) => (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{row.currentStudents || 0}</div>
          <div className="text-xs text-gray-500">enrolled</div>
        </div>
      )
    },
    {
      key: 'attendanceCount',
      label: 'Attendance',
      sortable: true,
      render: (row) => (
        <div className="text-center">
          <div className="text-sm font-bold text-blue-700">{row.attendanceCount}</div>
          <div className="text-xs text-gray-500">records</div>
        </div>
      )
    }
  ];

  const actions = (row) => (
    <div className="flex flex-col space-y-1">
      <button
        onClick={() => handleViewStudents(row)}
        className="flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-all duration-200 border border-blue-200 text-xs font-medium"
        title={`View Students (${row.attendanceCount || 0} records)`}
      >
        <FaUsers size={12} className="mr-1" />
        Students({row.attendanceCount || 0})
      </button>
      <button
        onClick={() => {
          setMonthlyReportClassId(row.classId);
          setShowMonthlyReport(true);
        }}
        className="flex items-center justify-center px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-all duration-200 border border-purple-200 text-xs font-medium"
      >
        <FaCalendarAlt size={10} className="mr-1" />
        Monthly Report
      </button>
      <button
        onClick={() => handleQuickRefresh(row.classId)}
        disabled={refreshingClass === row.classId}
        className={`flex items-center justify-center px-2 py-1 rounded transition-all duration-200 border text-xs font-medium ${
          refreshingClass === row.classId 
            ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' 
            : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
        }`}
      >
        <FaSync size={10} className={`mr-1 ${refreshingClass === row.classId ? 'animate-spin' : ''}`} />
        {refreshingClass === row.classId ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );

  if (loading && !classes.length) {
    return (
      <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
        <div className="p-6">
          <div className="text-center">Loading attendance data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="Teacher" sidebarItems={teacherSidebarSections}>
      {alertBox.open && (
        <BasicAlertBox
          title={alertBox.title}
          message={alertBox.message}
          type={alertBox.type}
          onClose={() => setAlertBox({ ...alertBox, open: false })}
        />
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Classes Attendance</h1>
              <p className="text-gray-600 mt-1">Manage and track attendance for your classes</p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaSync />
              Refresh All
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewCounts?.totalTodayRecords || 0}
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
                  {overviewCounts?.presentToday || 0}
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
                  {overviewCounts?.lateToday || 0}
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
                  {overviewCounts?.absentToday || 0}
                </p>
              </div>
              <FaTimesCircle className="text-3xl text-red-500" />
            </div>
          </div>
        </div>

        {/* Attendance by Type */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance by Type (Today)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FaVideo className="text-3xl text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Zoom</p>
              <p className="text-2xl font-bold text-blue-600">{overviewCounts?.zoomToday || 0}</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <FaVideo className="text-3xl text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Recorded Video</p>
              <p className="text-2xl font-bold text-purple-600">{overviewCounts?.recordedVideoToday || 0}</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <FaQrcode className="text-3xl text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Barcode</p>
              <p className="text-2xl font-bold text-orange-600">{overviewCounts?.barcodeToday || 0}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search classes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Method</label>
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="online">Online</option>
                <option value="physical">Physical</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course Type</label>
              <select
                value={courseTypeFilter}
                onChange={(e) => setCourseTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="theory">📚 Theory</option>
                <option value="revision">📝 Revision</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">My Classes ({filteredClasses.length})</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Auto-refresh:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          <BasicTable
            columns={classColumns}
            data={filteredClasses}
            actions={actions}
          />

          {filteredClasses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No classes found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showDetailsModal && selectedAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedAttendance.class.className}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Showing {selectedAttendance.filteredRecords} of {selectedAttendance.totalRecords} records
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {selectedAttendance.attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAttendance.attendance.map((record, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.student_name || record.studentName || record.student_id}
                            </div>
                            <div className="text-sm text-gray-500">ID: {record.student_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getAttendanceTypeIcon(record.source)}
                              <span className="text-sm capitalize">{record.source?.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.attendance_status)}`}>
                              {record.attendance_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>Join: {formatTime(record.join_time)}</div>
                            {record.leave_time && <div className="text-gray-500">Leave: {formatTime(record.leave_time)}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.duration_minutes ? `${record.duration_minutes} min` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found for this class.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Report Modal */}
      {showMonthlyReport && monthlyReportClassId && (
        <MonthlyAttendanceReport 
          classId={monthlyReportClassId}
          onClose={() => {
            setShowMonthlyReport(false);
            setMonthlyReportClassId(null);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default TeacherAttendanceManagement;
