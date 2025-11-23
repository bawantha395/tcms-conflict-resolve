import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import teacherSidebarSections from '././TeacherDashboardSidebar';
import { getTeacherDashboardAnalytics, getAttendanceHeatmapData } from '../../../api/teacherDashboard';
import { getClassesByTeacher } from '../../../api/classes';
import axios from 'axios';
import AttendanceHeatmap from '../../../components/AttendanceHeatmap';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  FaChalkboardTeacher, 
  FaUserGraduate, 
  FaMoneyBillWave, 
  FaCalendarDay, 
  FaChartLine, 
  FaClock,
  FaExclamationTriangle,
  FaBell,
  FaCheckCircle,
  FaTrophy,
  FaArrowUp,
  FaArrowDown,
  FaVideo,
  FaMapMarkerAlt,
  FaFileUpload,
  FaClipboardCheck,
  FaBullhorn,
  FaSync
} from 'react-icons/fa';

const TeacherDashboard = ({ onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [attendanceHeatmap, setAttendanceHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherSharePercentage, setTeacherSharePercentage] = useState(100);
  const [teacherName, setTeacherName] = useState('Teacher');
  const [teacherId, setTeacherId] = useState('');
  const [teacherRevenue, setTeacherRevenue] = useState(null); // { thisMonth, lastMonth }
  const [teacherRevenueData, setTeacherRevenueData] = useState(null); // array for charts
  const [teacherRevenueVsClassesData, setTeacherRevenueVsClassesData] = useState(null);
  // Permissions state (used to filter sidebar and guard UI)
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissions, setPermissions] = useState([]);

  // Get teacher name and ID from sessionStorage on mount
  useEffect(() => {
    try {
      // Try sessionStorage first (where userData is actually stored)
      let userStr = sessionStorage.getItem('userData');
      
      // Fallback to localStorage if not found in sessionStorage
      if (!userStr) {
        userStr = localStorage.getItem('user');
      }
      
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('👤 Teacher user object:', user);
        
        const name = user.name || user.username || user.first_name || 
                     (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Teacher');
        const id = user.userid || user.userId || user.teacherId || user.teacher_id || 
                   user.user_id || user.id || '';
        
        console.log('✅ Teacher name:', name);
        console.log('✅ Teacher ID:', id);
        
        setTeacherName(name);
        setTeacherId(id);
      }
    } catch (error) {
      console.error('❌ Error getting teacher info:', error);
    }
  }, []);

  // Fetch teacher permissions from RBAC API
  const fetchPermissions = async (teacherId) => {
    if (!teacherId) return;
    
    try {
      setPermissionsLoading(true);
      const response = await fetch(`http://localhost:8094/users/${teacherId}/permissions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Teacher permissions:', data);
        setPermissions(data.permissions || []);
      } else {
        console.error('❌ Failed to fetch permissions:', response.status);
        setPermissions([]);
      }
    } catch (error) {
      console.error('❌ Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Filter sidebar items based on permissions
  const getFilteredSidebarItems = () => {
    if (permissionsLoading || permissions.length === 0) {
      return teacherSidebarSections; // Show all items while loading or if no permissions
    }

    return teacherSidebarSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // If item has requiredPermissions, check if user has any of them
        if (item.requiredPermissions && item.requiredPermissions.length > 0) {
          return item.requiredPermissions.some(perm => permissions.some(p => p.name === perm));
        }
        // If no requiredPermissions, show the item (like Dashboard)
        return true;
      })
    })).filter(section => section.items.length > 0); // Remove empty sections
  };

  useEffect(() => {
    if (teacherId) {
      fetchPermissions(teacherId);
    }
  }, [teacherId]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // When teacherId is known, compute teacher revenue
  useEffect(() => {
    if (teacherId) loadTeacherRevenue(teacherId);
  }, [teacherId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTeacherDashboardAnalytics();
      
      if (response.success) {
        setAnalytics(response.data);
        
        // Fetch attendance heatmap data
        if (response.rawData && response.rawData.classes) {
          const attendanceData = await getAttendanceHeatmapData(response.rawData.classes);
          if (attendanceData.success) {
            setAttendanceHeatmap(attendanceData);
          }
        }
      } else {
        setError(response.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    // recompute teacher revenue after refresh
    if (teacherId) await loadTeacherRevenue(teacherId);
    setRefreshing(false);
  };

  // Compute teacher-specific revenue by querying classes for this teacher and global payments
  const loadTeacherRevenue = async (tid) => {
    if (!tid) return;
    try {
      // Fetch classes for this teacher
      const classesResp = await getClassesByTeacher(tid);
  const classIds = (classesResp.success && Array.isArray(classesResp.data)) ? classesResp.data.map(c => String(c.id)) : [];

      // Fetch all payments from payment backend (same endpoint used elsewhere)
      const paymentsResp = await axios.get('http://localhost:8090/routes.php/get_all_payments');
      const payments = (paymentsResp.data && paymentsResp.data.success && Array.isArray(paymentsResp.data.data)) ? paymentsResp.data.data : [];

      const now = new Date();
      const thisMonth = now.getMonth() + 1;
      const thisYear = now.getFullYear();
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = lastMonthDate.getMonth() + 1;
      const lastYear = lastMonthDate.getFullYear();

      let thisMonthTotal = 0;
      let lastMonthTotal = 0;

      for (const p of payments) {
  // Only consider payments for classes that belong to this teacher
  if (!p.class_id) continue;
  if (!classIds.includes(String(p.class_id))) continue;
        const amount = parseFloat(p.amount || 0) || 0;
        const pd = p.date ? new Date(p.date) : null;
        if (!pd) continue;
        const pm = pd.getMonth() + 1;
        const py = pd.getFullYear();
        if (pm === thisMonth && py === thisYear) thisMonthTotal += amount;
        if (pm === lastMonth && py === lastYear) lastMonthTotal += amount;
      }

      setTeacherRevenue({ thisMonth: thisMonthTotal, lastMonth: lastMonthTotal });
      // Build timeseries for the last 12 months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        months.push({ label, month: d.getMonth() + 1, year: d.getFullYear() });
      }

      const timeseries = months.map(m => ({ month: m.label, totalRevenue: 0 }));

      // Map class id -> short name if available
      const classMap = {};
      if (classesResp.success && Array.isArray(classesResp.data)) {
        classesResp.data.forEach(c => { classMap[String(c.id)] = c.classShortName || c.shortName || c.name || String(c.id); });
      }

      // For revenue vs classes: accumulate per (month, classShortName)
      const rvAccum = {}; // key = `${month}|${className}` => sum

      for (const p of payments) {
        if (!p.class_id) continue;
        if (!classIds.includes(String(p.class_id))) continue;
        const amount = parseFloat(p.amount || 0) || 0;
        const pd = p.date ? new Date(p.date) : null;
        if (!pd) continue;
        const pm = pd.getMonth() + 1;
        const py = pd.getFullYear();
        const monthLabel = new Date(py, pm - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

        // Add to timeseries
        const idx = timeseries.findIndex(t => t.month === monthLabel);
        if (idx !== -1) timeseries[idx].totalRevenue += amount;

        // Add to per-class accumulation
        const className = classMap[String(p.class_id)] || String(p.class_id);
        const key = `${monthLabel}|${className}`;
        rvAccum[key] = (rvAccum[key] || 0) + amount;
      }

      // Convert rvAccum to array of { month, classShortName, revenue }
      const rvArray = Object.keys(rvAccum).map(k => {
        const [monthLabel, className] = k.split('|');
        return { month: monthLabel, classShortName: className, revenue: rvAccum[k] };
      });

      setTeacherRevenueData(timeseries);
      setTeacherRevenueVsClassesData(rvArray);
    } catch (err) {
      console.error('Error loading teacher revenue:', err);
      setTeacherRevenue(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        userRole="Teacher"
        sidebarItems={getFilteredSidebarItems()}
        onLogout={onLogout}
      >
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        userRole="Teacher"
        sidebarItems={getFilteredSidebarItems()}
        onLogout={onLogout}
      >
        <div className="p-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 text-2xl mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h3>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={loadDashboardData}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { metrics, todaySchedule, revenueData, revenueVsClassesData, enrollmentData, paymentDistribution, recentActivities, alerts, attendanceRate, topPerformers, upcomingDeadlines } = analytics;

  // Debug: Log top performers data
  console.log('📊 Dashboard - Top Performers Data:', topPerformers);
  console.log('📊 Top Performers Count:', topPerformers?.length || 0);

  // If the logged-in user is a teacher_staff and they have no permitted sidebar items,
  // render a minimal dashboard showing only their name and id. Also honor the
  // `minimalView` navigation state (set when landing after login) so staff who
  // just logged in always see the minimal view first.
  const shouldShowMinimalForStaff = (() => {
    try {
      // Read stored user (session first, then fallback)
      let userStr = sessionStorage.getItem('userData');
      if (!userStr) userStr = localStorage.getItem('user');
      if (!userStr) return false;
      const user = JSON.parse(userStr);
      if (!user || user.role !== 'teacher_staff') return false;
      // If navigation flagged minimalView (from login), honor it immediately
      if (location && location.state && location.state.minimalView) return true;
      const perms = user.permissions || {};

      // Iterate canonical sidebar and check for any item with an explicit requiredPermission
      // that the user actually has. If none found, we will show the minimal view.
      for (const section of teacherSidebarSections) {
        if (!section.items) continue;
        for (const item of section.items) {
          const required = item.requiredPermission;
          if (required && typeof required === 'string') {
            if (perms[required]) return false; // user has at least one permitted item
          }
        }
      }

      // No permitted items found for this teacher_staff
      return true;
    } catch (err) {
      console.error('Error determining minimal staff view:', err);
      return false;
    }
  })();

  if (shouldShowMinimalForStaff) {
    return (
      <DashboardLayout
        userRole="Teacher"
        sidebarItems={teacherSidebarSections}
        onLogout={onLogout}
      >
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Teacher Staff Profile</h2>
            <p className="text-gray-600 mb-4">Welcome back...</p>
            <div className="bg-gray-50 border border-gray-100 rounded-md p-4 text-left">
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900 mb-3">{teacherName}</p>
              {teacherId && (
                <>
                  <p className="text-sm text-gray-500">ID</p>
                  <p className="font-medium text-gray-900">{teacherId}</p>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-4">If you believe this is incorrect, please contact your administrator to request access.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate teacher share based on percentage
  const calculateTeacherShare = (amount) => {
    return (amount * teacherSharePercentage) / 100;
  };

  // Determine which revenue datasets to display (teacher-specific when available)
  const displayRevenueData = (teacherRevenueData && Array.isArray(teacherRevenueData) && teacherRevenueData.length > 0) ? teacherRevenueData : revenueData;
  const displayRevenueVsClassesData = (teacherRevenueVsClassesData && Array.isArray(teacherRevenueVsClassesData) && teacherRevenueVsClassesData.length > 0) ? teacherRevenueVsClassesData : revenueVsClassesData;

  // Transform revenue vs classes data for grouped bar chart
  const transformRevenueVsClassesData = (data) => {
    if (!data || data.length === 0) return { chartData: [], classNames: [] };
    // Group data by month
    const monthGroups = {};
    const uniqueClasses = new Set();
    
    data.forEach(item => {
      if (!monthGroups[item.month]) {
        monthGroups[item.month] = { month: item.month };
      }
      // Use class short name as key for the bar
      monthGroups[item.month][item.classShortName] = item.revenue;
      uniqueClasses.add(item.classShortName);
    });
    
    const chartData = Object.values(monthGroups);
    const classNames = Array.from(uniqueClasses);
    
    return { chartData, classNames };
  };

  const { chartData: classRevenueChartData, classNames: uniqueClassNames } = transformRevenueVsClassesData(displayRevenueVsClassesData);

  // Generate colors for each class
  const generateClassColors = (count) => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
      '#06b6d4', '#a855f7', '#eab308', '#22c55e', '#f43f5e'
    ];
    return colors.slice(0, count);
  };

  const classColors = generateClassColors(uniqueClassNames.length);

  return (
    <DashboardLayout
      userRole="Teacher"
      sidebarItems={getFilteredSidebarItems()}
      onLogout={onLogout}
    >
      <div className="space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
        {/* Header with Refresh Button */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, <span className="font-semibold">{teacherName}</span>!
              </p>
              {teacherId && (
                <>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <p className="text-xs sm:text-sm text-gray-500">
                    ID: <span className="font-medium">{teacherId}</span>
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Teacher Share Percentage Input */}
            <div className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-lg shadow">
              <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Teacher Share:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={teacherSharePercentage}
                onChange={(e) => setTeacherSharePercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-14 sm:w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs sm:text-sm text-gray-600">%</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all whitespace-nowrap ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FaSync className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts && alerts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                  alert.type === 'danger' ? 'bg-red-50 border-red-500' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">{alert.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 break-words">{alert.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 break-words">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {/* Active Classes */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
                <FaChalkboardTeacher className="text-xl sm:text-2xl lg:text-3xl" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm opacity-90">Active Classes</p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{metrics.activeClasses}</h3>
              </div>
            </div>
            <div className="flex items-center text-xs sm:text-sm opacity-90">
              <FaCheckCircle className="mr-1 flex-shrink-0" />
              <span className="truncate">{metrics.totalClasses} total classes</span>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
                <FaUserGraduate className="text-xl sm:text-2xl lg:text-3xl" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm opacity-90">Total Students</p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{metrics.totalStudents}</h3>
              </div>
            </div>
            <div className="flex items-center text-xs sm:text-sm opacity-90">
              <FaArrowUp className="mr-1 flex-shrink-0" />
              <span className="truncate">Across all classes</span>
            </div>
          </div>

          {/* This Month Revenue */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
                <FaMoneyBillWave className="text-xl sm:text-2xl lg:text-3xl" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm opacity-90">This Month</p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold">Rs. {calculateTeacherShare((teacherRevenue && typeof teacherRevenue.thisMonth === 'number') ? teacherRevenue.thisMonth : metrics.thisMonthRevenue).toLocaleString()}</h3>
              </div>
            </div>
            <div className="flex items-center text-xs sm:text-sm opacity-90">
              <span className="truncate">Total: Rs. {((teacherRevenue && typeof teacherRevenue.thisMonth === 'number') ? teacherRevenue.thisMonth : metrics.thisMonthRevenue).toLocaleString()}</span>
            </div>
          </div>

          {/* Last Month Revenue */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
                <FaMoneyBillWave className="text-xl sm:text-2xl lg:text-3xl" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm opacity-90">Last Month</p>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold">Rs. {calculateTeacherShare((teacherRevenue && typeof teacherRevenue.lastMonth === 'number') ? teacherRevenue.lastMonth : metrics.lastMonthRevenue).toLocaleString()}</h3>
              </div>
            </div>
            <div className="flex items-center text-xs sm:text-sm opacity-90">
              <span className="truncate">Total: Rs. {((teacherRevenue && typeof teacherRevenue.lastMonth === 'number') ? teacherRevenue.lastMonth : metrics.lastMonthRevenue).toLocaleString()}</span>
            </div>
          </div>

          {/* Today's Classes */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
                <FaCalendarDay className="text-xl sm:text-2xl lg:text-3xl" />
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm opacity-90">Today's Classes</p>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{metrics.todayClasses}</h3>
              </div>
            </div>
            <div className="flex items-center text-xs sm:text-sm opacity-90">
              <FaClock className="mr-1 flex-shrink-0" />
              <span className="truncate">Scheduled for today</span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Moved up for easy access
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <button 
              onClick={() => navigate('/teacher/attendance-management')}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <FaClipboardCheck className="text-2xl sm:text-3xl text-blue-600 mb-2" />
              <span className="text-xs sm:text-sm font-medium text-blue-900 text-center">Mark Attendance</span>
            </button>
            <button 
              onClick={() => navigate('/teacher/my-classes')}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <FaFileUpload className="text-2xl sm:text-3xl text-green-600 mb-2" />
              <span className="text-xs sm:text-sm font-medium text-green-900 text-center">Upload Materials</span>
            </button>
            
            <button 
              onClick={() => navigate('/teacher/payments')}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <FaMoneyBillWave className="text-2xl sm:text-3xl text-orange-600 mb-2" />
              <span className="text-xs sm:text-sm font-medium text-orange-900 text-center">View Payments</span>
            </button>
          </div>
        </div> */}

        {/* Today's Focus: Schedule & Payment Status */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Today's Focus</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Today's Schedule */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Today's Schedule</h3>
              {todaySchedule && todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((cls, index) => (
                    <div
                      key={index}
                      className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                        cls.status === 'completed' ? 'bg-gray-50 border-gray-400' :
                        cls.status === 'in-progress' ? 'bg-green-50 border-green-500' :
                        'bg-blue-50 border-blue-500'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{cls.className}</h4>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <FaClock className="flex-shrink-0" />
                              <span className="truncate">{cls.formattedStartTime} - {cls.formattedEndTime}</span>
                            </div>
                            {cls.deliveryMethod === 'online' ? (
                              <div className="flex items-center gap-1">
                                <FaVideo className="flex-shrink-0" />
                                <span>Online</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <FaMapMarkerAlt />
                                <span>Physical</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          cls.status === 'completed' ? 'bg-gray-200 text-gray-800' :
                          cls.status === 'in-progress' ? 'bg-green-200 text-green-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {cls.status === 'completed' ? 'Completed' :
                           cls.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FaCalendarDay className="text-5xl mx-auto mb-3 opacity-50" />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </div>

            {/* Payment Status - Current Month */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Payment Status</h3>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="space-y-4">
                {/* Paid Students */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Paid Students</span>
                    <span className="text-2xl font-bold text-green-600">{paymentDistribution.paid}</span>
                  </div>
                </div>
                
                {/* Pending Payments */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Pending Payments</span>
                    <span className="text-2xl font-bold text-amber-600">{paymentDistribution.pending}</span>
                  </div>
                </div>
                
                {/* Collection Rate */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Collection Rate</span>
                    <span className="text-2xl font-bold text-blue-600">{paymentDistribution.collectionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Analytics */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>

          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Revenue Trend (Last 12 Months)</h3>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-600">Total Revenue</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value) => `Rs. ${value.toLocaleString()}`}
              />
              <Legend />
              <Line type="monotone" dataKey="totalRevenue" stroke="#8b5cf6" strokeWidth={3} name="Total Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Classes Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Revenue by Class</h3>
            <p className="text-sm text-gray-600">Monthly revenue breakdown for each class over the last 12 months</p>
          </div>
          {uniqueClassNames.length > 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart 
                data={classRevenueChartData}
                margin={{ top: 20, right: 40, bottom: 100, left: 60 }}
                barGap={8}
                barCategoryGap="20%"
              >
                <defs>
                  {uniqueClassNames.map((className, index) => (
                    <linearGradient key={`gradient-${index}`} id={`colorClass${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={classColors[index]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={classColors[index]} stopOpacity={0.6}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  tick={{ fontSize: 12, fill: '#4b5563' }}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                  tickLine={false}
                  interval={0}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: 12, fill: '#4b5563' }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `Rs ${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `Rs ${(value / 1000).toFixed(0)}k`;
                    return `Rs ${value}`;
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{ display: 'none' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      // Filter out zero/null values
                      const validPayloads = payload.filter(p => p.value && p.value > 0);
                      
                      if (validPayloads.length === 0) return null;
                      
                      return (
                        <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-100 p-5 min-w-[280px]">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                            <span className="font-bold text-gray-900 text-lg">{label}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                              {validPayloads.length} {validPayloads.length === 1 ? 'Class' : 'Classes'}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {validPayloads
                              .sort((a, b) => b.value - a.value)
                              .map((entry, index) => (
                                <div key={index} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div 
                                      className="w-4 h-4 rounded shadow-sm" 
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]" title={entry.name}>
                                      {entry.name}
                                    </span>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900 ml-3">
                                    Rs. {entry.value.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-600">Total Revenue:</span>
                              <span className="text-base font-bold text-blue-600">
                                Rs. {validPayloads.reduce((sum, p) => sum + p.value, 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '30px',
                    paddingBottom: '10px'
                  }}
                  iconType="circle"
                  iconSize={10}
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  formatter={(value) => (
                    <span className="text-sm text-gray-700 font-medium">{value}</span>
                  )}
                />
                {uniqueClassNames.map((className, index) => (
                  <Bar 
                    key={className}
                    dataKey={className} 
                    fill={`url(#colorClass${index})`}
                    name={className}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                    animationDuration={800}
                    animationBegin={index * 100}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaChartLine className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-600 font-medium text-lg mb-2">No Revenue Data Available</p>
                <p className="text-gray-500 text-sm">Revenue by class will appear here once payments are recorded</p>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Student Analytics */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Student Analytics</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrollment Trend */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Student Enrollment Trend</h3>
              {enrollmentData && enrollmentData.some(d => d.enrollments > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={enrollmentData}>
                    <defs>
                      <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="enrollments" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEnrollments)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <FaUserGraduate className="text-5xl mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No enrollment trend data</p>
                  <p className="text-sm text-gray-400 mt-2">Enroll students to see growth over time</p>
                </div>
              )}
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivities && recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`p-2 rounded-lg ${
                      activity.color === 'green' ? 'bg-green-100' :
                      activity.color === 'blue' ? 'bg-blue-100' :
                      'bg-purple-100'
                    }`}>
                      <span className="text-xl">{activity.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Heatmap by Class */}
        {attendanceHeatmap && attendanceHeatmap.classList && attendanceHeatmap.classList.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Attendance Calendar</h2>
              <p className="text-sm text-gray-600">Daily attendance tracking for each class</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {attendanceHeatmap.classList.map((classData) => (
                <AttendanceHeatmap key={classData.classId} classData={classData} />
              ))}
            </div>
          </div>
        )}

        {/* Top Performers per Exam */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaTrophy className="text-yellow-500 text-2xl" />
            <h3 className="text-xl font-semibold text-gray-900">Top Performers by Exam</h3>
          </div>
          {topPerformers && topPerformers.length > 0 ? (
            <div className="space-y-4">
              {topPerformers.slice(0, 5).map((performer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* Exam Title Header */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <FaTrophy className={`${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-600' :
                      'text-blue-500'
                    }`} />
                    <p className="font-semibold text-gray-700">{performer.examTitle}</p>
                  </div>
                  
                  {/* Student Performance */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <FaTrophy className="text-white text-xl" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-lg">{performer.name}</p>
                        <p className="text-sm text-gray-500">Student ID: {performer.studentId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{performer.average}%</p>
                        <p className="text-sm text-gray-500">{performer.marks} marks</p>
                      </div>
                      {performer.trend === 'up' ? (
                        <FaArrowUp className="text-green-500 text-xl" />
                      ) : (
                        <FaArrowDown className="text-red-500 text-xl" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaTrophy className="text-5xl mx-auto mb-3 opacity-30" />
              <p className="font-medium">No performance data available</p>
              <p className="text-sm text-gray-400 mt-2">Add exam results to see top performers</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard; 