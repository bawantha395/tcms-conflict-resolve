import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AdminDashboardSidebar from '././AdminDashboardSidebar';
import { getCurrentUserPermissions, filterSidebarByPermissions, clearPermissionsCache } from '../../../utils/permissionChecker';
import MetricCard from '../../../components/dashboard/MetricCard';
import RevenueChart from '../../../components/dashboard/RevenueChart';
import StudentEnrollmentChart from '../../../components/dashboard/StudentEnrollmentChart';
import StreamDistributionChart from '../../../components/dashboard/StreamDistributionChart';
import RevenueByStreamChart from '../../../components/dashboard/RevenueByStreamChart';
import StudentGrowthChart from '../../../components/dashboard/StudentGrowthChart';
import ClassScheduleHeatmap from '../../../components/dashboard/ClassScheduleHeatmap';
import { AlertsGrid } from '../../../components/dashboard/AlertCard';
import { getDashboardAnalytics, getDashboardAlerts } from '../../../api/dashboard';
import {
  FaMoneyBillWave,
  FaUsers,
  FaChalkboardTeacher,
  FaBook,
  FaCreditCard,
  FaMoneyBillAlt,
  FaUserGraduate,
  FaLaptop,
  FaBuilding,
  FaBlender,
  FaSync,
  FaTruck,
  FaShieldAlt,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaUserPlus,
  FaUserCheck,
  FaUserTimes,
  FaChartLine,
  FaCalendarAlt,
  FaPercentage,
  FaExchangeAlt
} from 'react-icons/fa';

const AdminDashboard = () => {
  const [filteredSidebarSections, setFilteredSidebarSections] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [adminName, setAdminName] = useState('Admin');
  const [adminId, setAdminId] = useState('');

  // Get admin name and ID from sessionStorage/localStorage on mount
  useEffect(() => {
    try {
      // Try multiple possible storage keys
      let user = null;

      // First try sessionStorage 'userData' key (where user is actually stored)
      const sessionUserStr = sessionStorage.getItem('userData');
      console.log('📦 sessionStorage userData string:', sessionUserStr);

      if (sessionUserStr) {
        user = JSON.parse(sessionUserStr);
      } else {
        // Try localStorage 'user' key
        const userStr = localStorage.getItem('user');
        console.log('📦 localStorage user string:', userStr);
        if (userStr) {
          user = JSON.parse(userStr);
        } else {
          // Try 'coreAdmins' key (admin might be stored here)
          const coreAdminsStr = localStorage.getItem('coreAdmins');
          console.log('📦 localStorage coreAdmins string:', coreAdminsStr);
          if (coreAdminsStr) {
            const coreAdmins = JSON.parse(coreAdminsStr);
            // If it's an array, take the first admin (or the currently logged in one)
            if (Array.isArray(coreAdmins) && coreAdmins.length > 0) {
              user = coreAdmins[0];
            } else if (typeof coreAdmins === 'object') {
              user = coreAdmins;
            }
          }
        }
      }

      if (user) {
        console.log('👤 Parsed user object:', user);
        console.log('📋 User fields:', Object.keys(user));

        const name = user.name || user.username || user.first_name || 'Admin';
        const id = user.userid || user.userId || user.adminId || user.user_id ||
                   user.id || user.admin_id || '';

        console.log('✅ Setting admin name:', name);
        console.log('✅ Setting admin ID:', id);

        setAdminName(name);
        setAdminId(id);
      } else {
        console.warn('⚠️ No user data found in sessionStorage or localStorage');
      }
    } catch (error) {
      console.error('❌ Error getting admin info:', error);
    }
  }, []);

  // Load user permissions and dashboard data
  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        setError(null);

        // Get current user ID from stored user data
        const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');
        let userId = 'A002'; // Default admin user from database

        if (userData) {
          try {
            const user = JSON.parse(userData);
            userId = user.userid || userId;
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }

        console.log('Fetching permissions for user:', userId);

        // Get user permissions
        const userPermissions = await getCurrentUserPermissions(userId);

        console.log('User permissions:', userPermissions);

        // Filter sidebar sections based on permissions
        const filteredSections = AdminDashboardSidebar(userPermissions);

        console.log('Filtered sidebar sections:', filteredSections);

        setFilteredSidebarSections(filteredSections);
      } catch (error) {
        console.error('Failed to load user permissions:', error);
        setError(error.message);

        // Fallback: show all sections if permission loading fails
        console.log('Using fallback: showing all sidebar sections');
        setFilteredSidebarSections(AdminDashboardSidebar([]));
      }
    };

    const fetchDashboardData = async () => {
      try {
        console.log('Fetching dashboard data...');

        const [analyticsRes, alertsRes] = await Promise.all([
          getDashboardAnalytics(),
          getDashboardAlerts()
        ]);

        console.log('Analytics Response:', analyticsRes);
        console.log('Alerts Response:', alertsRes);

        if (analyticsRes.success) {
          setAnalytics(analyticsRes.data);
          console.log('Analytics data set successfully');
        } else {
          const errorMsg = analyticsRes.message || 'Failed to load analytics data';
          console.error('Analytics error:', errorMsg);
          setError(errorMsg);
        }

        if (alertsRes.success) {
          // Build alerts array
          const alertsData = [];
          const alertData = alertsRes.data;

          if (alertData.pendingDeliveries > 0) {
            alertsData.push({
              title: 'Pending Speed Post Deliveries',
              count: alertData.pendingDeliveries,
              description: 'Student materials awaiting delivery',
              severity: 'warning',
              icon: FaTruck,
              actionText: 'View Deliveries',
              actionLink: '/admin/speed-post-deliveries'
            });
          }

          if (alertData.overduePayments > 0) {
            alertsData.push({
              title: 'Overdue Payments',
              count: alertData.overduePayments,
              description: 'Payments pending for more than 30 days',
              severity: 'danger',
              icon: FaExclamationCircle,
              actionText: 'View Payments',
              actionLink: '/admin/students-payments'
            });
          }

          if (alertData.suspiciousActivities > 0) {
            alertsData.push({
              title: 'Suspicious Activities',
              count: alertData.suspiciousActivities,
              description: 'Unusual student login patterns detected',
              severity: 'danger',
              icon: FaShieldAlt,
              actionText: 'Review',
              actionLink: '/admin/monitoring'
            });
          }

          if (alertData.concurrentViolations > 0) {
            alertsData.push({
              title: 'Concurrent Login Violations',
              count: alertData.concurrentViolations,
              description: 'Students with multiple active sessions',
              severity: 'warning',
              icon: FaExclamationTriangle,
              actionText: 'Review',
              actionLink: '/admin/monitoring'
            });
          }

          setAlerts(alertsData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        console.error('Error stack:', err.stack);
        setError(`Failed to load dashboard data: ${err.message}`);
      }
    };

    const loadData = async () => {
      await Promise.all([loadUserPermissions(), fetchDashboardData()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Clear cache on component unmount
  useEffect(() => {
    return () => {
      clearPermissionsCache();
    };
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [analyticsRes, alertsRes] = await Promise.all([
        getDashboardAnalytics(),
        getDashboardAlerts()
      ]);

      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }

      if (alertsRes.success) {
        const alertsData = [];
        const alertData = alertsRes.data;

        if (alertData.pendingDeliveries > 0) {
          alertsData.push({
            title: 'Pending Speed Post Deliveries',
            count: alertData.pendingDeliveries,
            description: 'Student materials awaiting delivery',
            severity: 'warning',
            icon: FaTruck,
            actionText: 'View Deliveries',
            actionLink: '/admin/speed-post-deliveries'
          });
        }

        if (alertData.overduePayments > 0) {
          alertsData.push({
            title: 'Overdue Payments',
            count: alertData.overduePayments,
            description: 'Payments pending for more than 30 days',
            severity: 'danger',
            icon: FaExclamationCircle,
            actionText: 'View Payments',
            actionLink: '/admin/students-payments'
          });
        }

        if (alertData.suspiciousActivities > 0) {
          alertsData.push({
            title: 'Suspicious Activities',
            count: alertData.suspiciousActivities,
            description: 'Unusual student login patterns detected',
            severity: 'danger',
            icon: FaShieldAlt,
            actionText: 'Review',
            actionLink: '/admin/monitoring'
          });
        }

        if (alertData.concurrentViolations > 0) {
          alertsData.push({
            title: 'Concurrent Login Violations',
            count: alertData.concurrentViolations,
            description: 'Students with multiple active sessions',
            severity: 'warning',
            icon: FaExclamationTriangle,
            actionText: 'Review',
            actionLink: '/admin/monitoring'
          });
        }

        setAlerts(alertsData);
      }
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      setError(`Failed to refresh dashboard data: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
          <p className="mt-2 text-sm text-gray-500">Fetching user permissions and analytics</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      userRole="Administrator"
      sidebarItems={filteredSidebarSections}
    >
      {error && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <strong>Warning:</strong> Permission loading failed ({error}). Showing all menu items as fallback.
        </div>
      )}
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
              <p className="text-sm sm:text-base text-gray-600">
                Welcome back, <span className="font-semibold">{adminName}</span>!
              </p>
              {adminId && (
                <>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <p className="text-xs sm:text-sm text-gray-500">
                    ID: <span className="font-medium">{adminId}</span>
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <FaSync className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-md">
            <div className="flex items-start gap-3">
              <FaExclamationCircle className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-semibold mb-1">Error Loading Dashboard</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <p className="text-red-600 text-xs mt-2">
                  Please check if your backend services are running:
                </p>
                <ul className="text-red-600 text-xs mt-1 ml-4 list-disc">
                  <li>Payment API: http://localhost:8090</li>
                  <li>Student API: http://localhost:8086</li>
                  <li>Teacher API: http://localhost:8088</li>
                  <li>Class API: http://localhost:8087</li>
                </ul>
                <button
                  onClick={handleRefresh}
                  className="mt-3 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Section */}
        {alerts && alerts.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                  alert.severity === 'danger' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    {alert.icon && <alert.icon className={`text-xl sm:text-2xl flex-shrink-0 ${
                      alert.severity === 'danger' ? 'text-red-600' :
                      alert.severity === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900 break-words">
                        {alert.title}
                        {alert.count && <span className="ml-2 text-xs sm:text-sm font-bold">({alert.count})</span>}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">{alert.description}</p>
                    </div>
                  </div>
                  {alert.actionLink && (
                    <a
                      href={alert.actionLink}
                      className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap text-center transition-colors ${
                        alert.severity === 'danger'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {alert.actionText || 'View'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Layout: Left Sidebar + Right Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* LEFT SIDE - Alerts & Metric Cards */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 sm:space-y-6">

            {/* Revenue Metrics */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-5 border border-green-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                <FaMoneyBillWave className="text-green-600 text-lg sm:text-xl" />
                Revenue Overview
              </h2>
              {/* Primary Revenue Card - Full Width with emphasis */}
              <div className="mb-3 sm:mb-4 transform hover:scale-[1.02] transition-transform">
                <MetricCard
                  title="This Month Revenue"
                  value={analytics ? `Rs. ${analytics.revenue.thisMonth.total.toLocaleString()}` : '---'}
                  icon={FaMoneyBillWave}
                  subtitle={`Online: Rs. ${analytics ? analytics.revenue.thisMonth.online.toLocaleString() : '0'} | Cash: Rs. ${analytics ? analytics.revenue.thisMonth.cash.toLocaleString() : '0'}`}
                  trend={analytics?.revenue.trend}
                  trendLabel="vs last month"
                  color="green"
                  loading={loading}
                />
              </div>

              {/* Secondary Revenue Metrics - 2 Column Grid with better spacing */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <MetricCard
                  title="MRR"
                  value={analytics ? `Rs. ${(analytics.revenue.mrr / 1000).toFixed(1)}K` : '---'}
                  icon={FaCalendarAlt}
                  subtitle="3-month avg"
                  color="blue"
                  loading={loading}
                />
                <MetricCard
                  title="Outstanding"
                  value={analytics ? `Rs. ${(analytics.revenue.outstandingPayments / 1000).toFixed(1)}K` : '---'}
                  icon={FaExclamationCircle}
                  subtitle="Pending"
                  color="red"
                  loading={loading}
                />
              </div>

              {/* Growth Metrics - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <MetricCard
                  title="MoM"
                  value={analytics ? `${analytics.revenue.momGrowth}%` : '---'}
                  icon={FaChartLine}
                  subtitle="Monthly growth"
                  trend={analytics?.revenue.momGrowth}
                  color="purple"
                  loading={loading}
                />
                <MetricCard
                  title="YoY"
                  value={analytics ? `${analytics.revenue.yoyGrowth}%` : '---'}
                  icon={FaExchangeAlt}
                  subtitle="Yearly growth"
                  trend={analytics?.revenue.yoyGrowth}
                  color="indigo"
                  loading={loading}
                />
              </div>
            </div>

            {/* Student Lifecycle Metrics */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                <FaUserGraduate className="text-blue-600 text-lg sm:text-xl" />
                Student Lifecycle
              </h2>
              {/* Primary Student Metrics - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <MetricCard
                  title="Active Students"
                  value={analytics?.students.active || 0}
                  icon={FaUserCheck}
                  subtitle={`of ${analytics?.students.total || 0} total`}
                  color="blue"
                  loading={loading}
                />
                <MetricCard
                  title="New This Month"
                  value={analytics?.students.thisMonthEnrollments || 0}
                  icon={FaUserPlus}
                  subtitle={`Last: ${analytics?.students.lastMonthEnrollments || 0}`}
                  trend={analytics?.students.enrollmentTrend}
                  color="green"
                  loading={loading}
                />
              </div>

              {/* Retention Metrics - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <MetricCard
                  title="Retention"
                  value={analytics ? `${analytics.students.retentionRate}%` : '---'}
                  icon={FaPercentage}
                  subtitle="Success rate"
                  color="purple"
                  loading={loading}
                />
                <MetricCard
                  title="Drop-off"
                  value={analytics ? `${analytics.students.dropOffRate}%` : '---'}
                  icon={FaUserTimes}
                  subtitle="At risk"
                  color="red"
                  loading={loading}
                />
              </div>

              {/* Registration Source - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <MetricCard
                  title="Online"
                  value={analytics?.students.onlineRegistered || 0}
                  icon={FaLaptop}
                  subtitle="Web registrations"
                  color="blue"
                  loading={loading}
                />
                <MetricCard
                  title="Physical"
                  value={analytics?.students.physicalRegistered || 0}
                  icon={FaBuilding}
                  subtitle="In-person visits"
                  color="indigo"
                  loading={loading}
                />
              </div>
            </div>

            {/* Teachers & Classes */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 sm:p-5 border border-yellow-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-5 flex items-center gap-2">
                <FaChalkboardTeacher className="text-yellow-600 text-lg sm:text-xl" />
                Staff & Classes
              </h2>
              {/* Teachers & Total Classes - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <MetricCard
                  title="Teachers"
                  value={analytics?.teachers.active || 0}
                  icon={FaChalkboardTeacher}
                  subtitle={`of ${analytics?.teachers.total || 0} total`}
                  color="yellow"
                  loading={loading}
                />
                <MetricCard
                  title="Active Classes"
                  value={analytics?.classes.active || 0}
                  icon={FaBook}
                  subtitle={`of ${analytics?.classes.total || 0} total`}
                  color="indigo"
                  loading={loading}
                />
              </div>

              {/* Class Delivery Modes - 3 Column Grid with better spacing */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <MetricCard
                  title="Online"
                  value={analytics?.classes.online || 0}
                  icon={FaLaptop}
                  subtitle="Virtual"
                  color="blue"
                  loading={loading}
                />
                <MetricCard
                  title="Physical"
                  value={analytics?.classes.physical || 0}
                  icon={FaBuilding}
                  subtitle="On-site"
                  color="green"
                  loading={loading}
                />
                <MetricCard
                  title="Hybrid"
                  value={analytics?.classes.hybrid || 0}
                  icon={FaBlender}
                  subtitle="Mixed"
                  color="purple"
                  loading={loading}
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 sm:p-5 border border-red-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <FaExclamationTriangle className="text-red-600 text-lg sm:text-xl" />
                Critical Alerts
              </h2>
              <div className="space-y-3">
                <AlertsGrid alerts={alerts} loading={loading} layout="stack" />
              </div>
            </div>

          </div>

          {/* RIGHT SIDE - Charts */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4 sm:space-y-6">
            <RevenueChart
              data={analytics?.revenue.monthlyData || []}
              loading={loading}
            />
            <StudentEnrollmentChart
              data={analytics?.students.monthlyData || []}
              loading={loading}
            />

            {/* Additional Charts Row - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <StreamDistributionChart
                data={analytics?.students.streamDistribution || []}
                loading={loading}
              />
              <StudentGrowthChart
                data={analytics?.students.monthlyData || []}
                loading={loading}
              />
            </div>

            {/* More Charts */}

            <RevenueByStreamChart
              data={analytics?.revenue.revenueByStream || []}
              loading={loading}
            />

            <ClassScheduleHeatmap
              data={analytics?.classes.scheduleHeatmap || []}
              loading={loading}
            />


          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard; 