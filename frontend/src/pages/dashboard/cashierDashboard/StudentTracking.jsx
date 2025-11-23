import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaExclamationTriangle, FaIdCard, FaUser, FaBook, FaCalendar, FaPhone, FaClock, FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import CashierDashboardSidebar from './CashierDashboardSidebar';
import { getUserData } from '../../../api/apiUtils';
import { getStudentById } from '../../../api/students';
import { getCurrentUserPermissions } from '../../../utils/permissionChecker';

const StudentTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Set initial tab based on URL path
  const getInitialTab = () => {
    if (location.pathname.includes('/forget-id-card')) {
      return 'forget-id-card';
    }
    return 'late-payments';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [latePayments, setLatePayments] = useState([]);
  const [forgetIdCards, setForgetIdCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Get user data from localStorage
  const user = useMemo(() => getUserData(), []);

  // Permission checking functions
  const hasPermission = (permissionName) => {
    return permissions.some(permission => permission.name === permissionName);
  };

  const canViewLatePayments = hasPermission('cashier_dashboard.late_payment_tracking');
  const canViewEntryPermits = hasPermission('cashier_dashboard.entry_permit_tracking');

  // Fetch permissions on component mount
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const perms = await getCurrentUserPermissions(user?.userid);
        setPermissions(perms);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setPermissions([]);
      } finally {
        setPermissionsLoading(false);
      }
    };

    if (user?.userid) {
      fetchPermissions();
    } else {
      setPermissionsLoading(false);
    }
  }, [user?.userid]);

  // Cache for cashier data to avoid repeated API calls
  const cashierCache = React.useRef({});

  // Function to fetch all cashiers and cache them
  const loadCashiers = async () => {
    if (Object.keys(cashierCache.current).length > 0) {
      return; // Already loaded
    }
    
    try {
      const response = await fetch('http://localhost:8081/routes.php/cashiers');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.cashiers) {
          // Build a map of cashier ID to cashier data
          data.cashiers.forEach(cashier => {
            cashierCache.current[cashier.userid] = cashier;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load cashiers:', e);
    }
  };

  // Function to fetch cashier name by ID (uses cache)
  const getCashierName = async (cashierId) => {
    if (!cashierId) return null;
    
    // Load cashiers if not already loaded
    await loadCashiers();
    
    // Get from cache
    const cashier = cashierCache.current[cashierId];
    return cashier ? cashier.name : null;
  };

  // Update tab when URL changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'late-payments' && canViewLatePayments) {
      loadLatePayments();
    } else if (activeTab === 'forget-id-card' && canViewEntryPermits) {
      loadForgetIdCards();
    }
  }, [activeTab, canViewLatePayments, canViewEntryPermits]);

  const loadLatePayments = useCallback(async () => {
    if (!canViewLatePayments) return;
    
    setLoading(true);
    try {
      // Fetch ALL late pay permissions (not just today)
      const response = await fetch('http://localhost:8087/routes.php/late_pay/all_history');
      const data = await response.json();
      
      if (data.success) {
        // Map the data to match the expected format
        const baseData = data.permissions.map(permission => ({
          id: permission.id,
          student_id: permission.student_id,
          class_name: permission.class_name,
          permission_date: permission.permission_date,
          reason: permission.reason,
          phone: permission.student_phone || null,
          student_name: null,
          cashier_id: permission.cashier_id,
          issued_time: permission.issued_time || permission.issued_at,
        }));

        // Enrich with student details and cashier names
        const enriched = await Promise.all(baseData.map(async (row) => {
          try {
            // Fetch student details
            const student = await getStudentById(row.student_id);
            
            // Fetch cashier name
            const cashierName = await getCashierName(row.cashier_id);
            
            return {
              ...row,
              student_name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || row.student_id,
              phone: row.phone || student.phone || student.mobile || '',
              cashier_name: cashierName
            };
          } catch (e) {
            // If enrichment fails, fallback to student_id as name
            return {
              ...row,
              student_name: row.student_id,
              cashier_name: null
            };
          }
        }));

        setLatePayments(enriched);
      } else {
        console.error('Failed to load late payments:', data.message);
        setLatePayments([]);
      }
    } catch (error) {
      console.error('Error loading late payments:', error);
      setLatePayments([]);
    } finally {
      setLoading(false);
    }
  }, [canViewLatePayments]);

  const loadForgetIdCards = useCallback(async () => {
    if (!canViewEntryPermits) return;
    
    setLoading(true);
    try {
      // Fetch ALL entry permit history (not just today)
      const response = await fetch('http://localhost:8087/routes.php/entry_permit/history');
      const data = await response.json();
      
      if (data.success) {
        // Map the data to match the expected format
        const baseData = data.permits.map(permit => ({
          id: permit.id,
          student_id: permit.student_id,
          class_name: permit.class_name,
          request_date: permit.permit_date,
          reason: permit.reason,
          notes: permit.notes || '',
          phone: permit.student_phone || null,
          student_name: null,
          cashier_id: permit.cashier_id,
          issued_time: permit.issued_time || permit.issued_at,
        }));

        // Enrich with student details and cashier names
        const enriched = await Promise.all(baseData.map(async (row) => {
          try {
            // Fetch student details
            const student = await getStudentById(row.student_id);
            
            // Fetch cashier name
            const cashierName = await getCashierName(row.cashier_id);
            
            return {
              ...row,
              student_name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || row.student_id,
              phone: row.phone || student.phone || student.mobile || '',
              cashier_name: cashierName
            };
          } catch (e) {
            // If enrichment fails, fallback to student_id as name
            return {
              ...row,
              student_name: row.student_id,
              cashier_name: null
            };
          }
        }));

        setForgetIdCards(enriched);
      } else {
        console.error('Failed to load entry permits:', data.message);
        setForgetIdCards([]);
      }
    } catch (error) {
      console.error('Error loading forget ID cards:', error);
      setForgetIdCards([]);
    } finally {
      setLoading(false);
    }
  }, [canViewEntryPermits]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Filter function for search
  const filterData = (data) => {
    if (!searchTerm.trim()) return data;
    
    const search = searchTerm.toLowerCase();
    return data.filter(item => 
      item.student_name?.toLowerCase().includes(search) ||
      item.student_id?.toLowerCase().includes(search)
    );
  };

  // Apply filters to current tab data
  const filteredLatePayments = useMemo(() => filterData(latePayments), [latePayments, searchTerm]);
  const filteredForgetIdCards = useMemo(() => filterData(forgetIdCards), [forgetIdCards, searchTerm]);

  return (
    <DashboardLayout 
      userRole="Cashier" 
      sidebarItems={CashierDashboardSidebar(permissions)}
      onLogout={handleLogout}
      customTitle="TCMS"
      customSubtitle={`Cashier Dashboard - ${user?.name || 'Cashier'}`}
    >
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Student Tracking</h1>
          <p className="text-gray-600">Monitor students with late payments and forgotten ID cards</p>
        </div>

        {/* Summary Cards at Top */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {canViewLatePayments && (
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/90 via-orange-500/90 to-red-500/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4 text-white hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-white/5"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-[10px] font-semibold uppercase tracking-wider mb-1">Late Payment Permissions</p>
                  <p className="text-3xl font-bold mt-0.5 drop-shadow-lg">
                    {latePayments.filter(item => {
                      const permissionDate = new Date(item.permission_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      permissionDate.setHours(0, 0, 0, 0);
                      return permissionDate.getTime() === today.getTime();
                    }).length}
                  </p>
                  <p className="text-white/80 text-[10px] mt-0.5 font-medium">Active today</p>
                  <p className="text-white/70 text-[9px] mt-1">
                    {latePayments.length} total in history
                  </p>
                </div>
                <FaExclamationTriangle className="h-12 w-12 text-white/30 drop-shadow-2xl" />
              </div>
            </div>
          )}

          {canViewEntryPermits && (
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/90 via-indigo-500/90 to-purple-600/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 p-4 text-white hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-white/5"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-[10px] font-semibold uppercase tracking-wider mb-1">Entry Permits (Forget ID Card)</p>
                  <p className="text-3xl font-bold mt-0.5 drop-shadow-lg">
                    {forgetIdCards.filter(item => {
                      const permitDate = new Date(item.request_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      permitDate.setHours(0, 0, 0, 0);
                      return permitDate.getTime() === today.getTime();
                    }).length}
                  </p>
                  <p className="text-white/80 text-[10px] mt-0.5 font-medium">Active today</p>
                  <p className="text-white/70 text-[9px] mt-1">
                    {forgetIdCards.length} total in history
                  </p>
                </div>
                <FaIdCard className="h-12 w-12 text-white/30 drop-shadow-2xl" />
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex border-b border-gray-200">
          {canViewLatePayments && (
            <button
              onClick={() => navigate('/cashier/late-payments')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === 'late-payments'
                  ? 'bg-orange-500 text-white border-b-2 border-orange-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaExclamationTriangle className="h-5 w-5" />
                <span>Late Payments</span>
                {latePayments.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {latePayments.length}
                  </span>
                )}
              </div>
            </button>
          )}

          {canViewEntryPermits && (
            <button
              onClick={() => navigate('/cashier/forget-id-card')}
              className={`flex-1 px-6 py-4 font-semibold text-sm transition-colors ${
                activeTab === 'forget-id-card'
                  ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FaIdCard className="h-5 w-5" />
                <span>Forget ID Card Students</span>
                {forgetIdCards.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {forgetIdCards.length}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : (
            <>
              {/* Late Payments Tab */}
              {activeTab === 'late-payments' && canViewLatePayments && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Late Payment Permissions History
                    </h2>
                    <span className="text-sm text-gray-500">
                      {searchTerm ? (
                        <>Showing {filteredLatePayments.length} of {latePayments.length}</>
                      ) : (
                        <>Total Permissions: {latePayments.length}</>
                      )}
                    </span>
                  </div>

                  {filteredLatePayments.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FaExclamationTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      {searchTerm ? (
                        <>
                          <p className="text-gray-500 text-lg">No results found for "{searchTerm}"</p>
                          <p className="text-gray-400 text-sm mt-2">Try searching with a different name or ID</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-500 text-lg">No late payment permissions in history</p>
                          <p className="text-gray-400 text-sm mt-2">All students are up to date with payments!</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredLatePayments.map((item) => {
                        // Check if permission is for today
                        const permissionDate = new Date(item.permission_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        permissionDate.setHours(0, 0, 0, 0);
                        const isToday = permissionDate.getTime() === today.getTime();
                        const isExpired = permissionDate < today;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 ${
                              isToday
                                ? 'bg-orange-50 border-orange-500'
                                : isExpired
                                ? 'bg-gray-50 border-gray-400'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <FaUser className={isToday ? 'text-orange-600' : isExpired ? 'text-gray-500' : 'text-blue-600'} />
                                  <h3 className="font-semibold text-gray-800 text-lg">
                                    {item.student_name}
                                  </h3>
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    isToday
                                      ? 'bg-orange-200 text-orange-800'
                                      : isExpired
                                      ? 'bg-gray-200 text-gray-700'
                                      : 'bg-blue-200 text-blue-800'
                                  }`}>
                                    {item.student_id}
                                  </span>
                                  
                                  {/* Permission Date Badge */}
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                                    isToday
                                      ? 'bg-green-500 text-white animate-pulse'
                                      : isExpired
                                      ? 'bg-red-500 text-white'
                                      : 'bg-blue-500 text-white'
                                  }`}>
                                    <FaCalendar className="h-3 w-3" />
                                    {isToday ? 'TODAY' : isExpired ? 'EXPIRED' : new Date(item.permission_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>

                                <div className="ml-6 space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaBook className={isToday ? 'text-orange-500' : isExpired ? 'text-gray-400' : 'text-blue-500'} />
                                    <span className="font-medium">Class:</span>
                                    <span>{item.class_name}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaCalendar className={isToday ? 'text-orange-500' : isExpired ? 'text-gray-400' : 'text-blue-500'} />
                                    <span className="font-medium">Permission Date:</span>
                                    <span className="font-semibold">
                                      {new Date(item.permission_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaPhone className={isToday ? 'text-orange-500' : isExpired ? 'text-gray-400' : 'text-blue-500'} />
                                    <span className="font-medium">Contact:</span>
                                    <span>{item.phone}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaUser className={isToday ? 'text-orange-500' : isExpired ? 'text-gray-400' : 'text-blue-500'} />
                                    <span className="font-medium">Issued by Cashier:</span>
                                    <span className="font-semibold text-orange-700">
                                      {item.cashier_name 
                                        ? `${item.cashier_name} (${item.cashier_id})`
                                        : item.cashier_id || 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaClock className={isToday ? 'text-orange-500' : isExpired ? 'text-gray-400' : 'text-blue-500'} />
                                    <span className="font-medium">Issued Time:</span>
                                    <span className="text-sm">
                                      {item.issued_time ? new Date(item.issued_time).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      }) : 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-start gap-2 text-gray-700">
                                    <FaClock className={`${isToday ? 'text-orange-500' : isExpired ? 'text-gray-400' : 'text-blue-500'} mt-1`} />
                                    <div>
                                      <span className="font-medium">Reason:</span>
                                      <p className="text-gray-600 mt-1">{item.reason}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="ml-4">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                  isToday
                                    ? 'bg-orange-500 text-white'
                                    : isExpired
                                    ? 'bg-gray-500 text-white'
                                    : 'bg-blue-500 text-white'
                                }`}>
                                  {isToday ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'LATE PAY'}
                                </span>
                              </div>
                            </div>

                            <div className={`mt-3 pt-3 border-t ${
                              isToday ? 'border-orange-200' : isExpired ? 'border-gray-200' : 'border-blue-200'
                            }`}>
                              <p className={`text-xs font-medium ${
                                isToday
                                  ? 'text-orange-700'
                                  : isExpired
                                  ? 'text-gray-600'
                                  : 'text-blue-700'
                              }`}>
                                {isToday
                                  ? '✅ Active permission - Student can attend today'
                                  : isExpired
                                  ? '❌ Expired - Payment was required'
                                  : '📅 Future permission'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Forget ID Card Tab */}
              {activeTab === 'forget-id-card' && canViewEntryPermits && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Entry Permit History (Forgotten ID Cards)
                    </h2>
                    <span className="text-sm text-gray-500">
                      {searchTerm ? (
                        <>Showing {filteredForgetIdCards.length} of {forgetIdCards.length}</>
                      ) : (
                        <>Total Permits: {forgetIdCards.length}</>
                      )}
                    </span>
                  </div>

                  {filteredForgetIdCards.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FaIdCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      {searchTerm ? (
                        <>
                          <p className="text-gray-500 text-lg">No results found for "{searchTerm}"</p>
                          <p className="text-gray-400 text-sm mt-2">Try searching with a different name or ID</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-500 text-lg">No entry permit history</p>
                          <p className="text-gray-400 text-sm mt-2">All students have their ID cards!</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredForgetIdCards.map((item) => {
                        // Check if permit is for today
                        const permitDate = new Date(item.request_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        permitDate.setHours(0, 0, 0, 0);
                        const isToday = permitDate.getTime() === today.getTime();
                        const isExpired = permitDate < today;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg p-4 hover:shadow-md transition-shadow border-l-4 ${
                              isToday
                                ? 'bg-blue-50 border-blue-500'
                                : isExpired
                                ? 'bg-gray-50 border-gray-400'
                                : 'bg-purple-50 border-purple-500'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <FaUser className={isToday ? 'text-blue-600' : isExpired ? 'text-gray-500' : 'text-purple-600'} />
                                  <h3 className="font-semibold text-gray-800 text-lg">
                                    {item.student_name}
                                  </h3>
                                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                    isToday
                                      ? 'bg-blue-200 text-blue-800'
                                      : isExpired
                                      ? 'bg-gray-200 text-gray-700'
                                      : 'bg-purple-200 text-purple-800'
                                  }`}>
                                    {item.student_id}
                                  </span>
                                  
                                  {/* Permit Date Badge */}
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${
                                    isToday
                                      ? 'bg-green-500 text-white animate-pulse'
                                      : isExpired
                                      ? 'bg-red-500 text-white'
                                      : 'bg-purple-500 text-white'
                                  }`}>
                                    <FaCalendar className="h-3 w-3" />
                                    {isToday ? 'TODAY' : isExpired ? 'PAST' : new Date(item.request_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>

                                <div className="ml-6 space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaBook className={isToday ? 'text-blue-500' : isExpired ? 'text-gray-400' : 'text-purple-500'} />
                                    <span className="font-medium">Class:</span>
                                    <span>{item.class_name}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaCalendar className={isToday ? 'text-blue-500' : isExpired ? 'text-gray-400' : 'text-purple-500'} />
                                    <span className="font-medium">Permit Date:</span>
                                    <span className="font-semibold">
                                      {new Date(item.request_date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaPhone className={isToday ? 'text-blue-500' : isExpired ? 'text-gray-400' : 'text-purple-500'} />
                                    <span className="font-medium">Contact:</span>
                                    <span>{item.phone}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaUser className={isToday ? 'text-blue-500' : isExpired ? 'text-gray-400' : 'text-purple-500'} />
                                    <span className="font-medium">Issued by Cashier:</span>
                                    <span className="font-semibold text-blue-700">
                                      {item.cashier_name 
                                        ? `${item.cashier_name} (${item.cashier_id})`
                                        : item.cashier_id || 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-700">
                                    <FaClock className={isToday ? 'text-blue-500' : isExpired ? 'text-gray-400' : 'text-purple-500'} />
                                    <span className="font-medium">Issued Time:</span>
                                    <span className="text-sm">
                                      {item.issued_time ? new Date(item.issued_time).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      }) : 'N/A'}
                                    </span>
                                  </div>

                                  <div className="flex items-start gap-2 text-gray-700">
                                    <FaClock className={`${isToday ? 'text-blue-500' : isExpired ? 'text-gray-400' : 'text-purple-500'} mt-1`} />
                                    <div>
                                      <span className="font-medium">Reason:</span>
                                      <p className="text-gray-600 mt-1">{item.reason}</p>
                                      {item.notes && (
                                        <p className="text-gray-500 text-xs mt-1 italic">Notes: {item.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="ml-4">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                  isToday
                                    ? 'bg-blue-500 text-white'
                                    : isExpired
                                    ? 'bg-gray-500 text-white'
                                    : 'bg-purple-500 text-white'
                                }`}>
                                  {isToday ? 'ACTIVE' : isExpired ? 'PAST' : 'NO ID CARD'}
                                </span>
                              </div>
                            </div>

                            <div className={`mt-3 pt-3 border-t ${
                              isToday ? 'border-blue-200' : isExpired ? 'border-gray-200' : 'border-purple-200'
                            }`}>
                              <p className={`text-xs font-medium ${
                                isToday
                                  ? 'text-blue-700'
                                  : isExpired
                                  ? 'text-gray-600'
                                  : 'text-purple-700'
                              }`}>
                                {isToday
                                  ? '🪪 Entry permit active - Student can attend today'
                                  : isExpired
                                  ? '📅 Past entry permit - Student should have ID card'
                                  : '📅 Future entry permit'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentTracking;
