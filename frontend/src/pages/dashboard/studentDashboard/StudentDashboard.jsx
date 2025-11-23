import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import studentSidebarSections from '././StudentDashboardSidebar';
import Barcode from 'react-barcode';
import ClockProps from '../../../components/ClockProps';
import BasicCard from '../../../components/BasicCard';
import { useNavigate } from 'react-router-dom';
import { 
  LuMonitorSmartphone, 
  LuCreditCard, 
  LuMonitorPlay, 
  LuBookOpen,
  LuTrendingUp,
  LuCalendarCheck,
  LuClock,
  LuVideo,
  LuMapPin
} from 'react-icons/lu';
import { 
  FaChalkboardTeacher,
  FaChartLine,
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimes
} from 'react-icons/fa';
import {
  LineChart,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  Line,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

// Helper function to get the appropriate storage
const getStorage = () => {
  const usePersistentStorage = sessionStorage.getItem('usePersistentStorage');
  return usePersistentStorage === 'true' ? localStorage : sessionStorage;
};

// Function to fetch complete student profile from student backend
const fetchStudentProfile = async (userid) => {
  try {
    console.log('Fetching student profile for:', userid);
    const response = await axios.get(`http://localhost:8086/routes.php/get_with_id/${userid}`, {
      timeout: 5000
    });
    
    console.log('Student profile response:', response.data);
    
    if (response.data && !response.data.error) {
      return response.data;
    } else {
      console.error('Error fetching student profile:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return null;
  }
};

// Metric Card Component with Glassmorphism
function MetricCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colorClasses = {
    blue: 'from-blue-500/90 to-blue-600/90 border-blue-400/30',
    green: 'from-green-500/90 to-green-600/90 border-green-400/30',
    purple: 'from-purple-500/90 to-purple-600/90 border-purple-400/30',
    orange: 'from-orange-500/90 to-orange-600/90 border-orange-400/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-lg rounded-xl shadow-xl border p-4 sm:p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}>
      <div className="flex items-center justify-between mb-3">
        <div className="bg-white/30 backdrop-blur-md p-2 sm:p-3 rounded-lg shadow-lg">
          <Icon className="text-xl sm:text-2xl lg:text-3xl" />
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-sm opacity-95 font-medium">{title}</p>
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold drop-shadow-lg">{value}</h3>
        </div>
      </div>
      {subtitle && (
        <div className="flex items-center text-xs sm:text-sm opacity-90 mt-2">
          <span className="truncate bg-white/20 px-2 py-1 rounded-full">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

// Alert Component
function AlertCard({ type = 'info', children, onDismiss }) {
  const typeClasses = {
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    danger: 'bg-red-50 border-red-500 text-red-800',
    info: 'bg-blue-50 border-blue-500 text-blue-800',
    success: 'bg-green-50 border-green-500 text-green-800',
  };

  const icons = {
    warning: <FaExclamationTriangle className="text-yellow-600" />,
    danger: <FaExclamationTriangle className="text-red-600" />,
    info: <FaCheckCircle className="text-blue-600" />,
    success: <FaCheckCircle className="text-green-600" />,
  };

  return (
    <div className={`p-3 sm:p-4 rounded-lg border-l-4 ${typeClasses[type]} relative`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors duration-200"
          aria-label="Dismiss notification"
        >
          <FaTimes className="text-sm opacity-50 hover:opacity-100" />
        </button>
      )}
      <div className="flex items-start gap-3 pr-6">
        <span className="text-xl flex-shrink-0">{icons[type]}</span>
        <p className="text-sm sm:text-base flex-1">{children}</p>
      </div>
    </div>
  );
}

// Attendance Heatmap Component - Monthly Calendar View with Navigation
function AttendanceHeatmap({ data }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const appLangLocal = localStorage.getItem('appLang') || 'en';
  const translationsLocal = {
    en: {
      attendanceCalendar: 'Attendance Calendar',
      attendanceRecordsThisMonth: '{n} attendance record(s) this month',
      previousMonth: 'Previous Month',
      nextMonth: 'Next Month',
      todayBtn: 'Today',
      attended: 'Attended',
      notAttended: 'Not Attended',
      noAttendanceData: 'No attendance data available',
      attendanceWillAppear: 'Attendance records will appear here'
    },
    si: {
      attendanceCalendar: 'පන්ති පැමිනීමී දින දසුන',
      attendanceRecordsThisMonth: '{n} පන්ති පැමිනීමී වාර්තා(ය) මේ මාසයේ',
      previousMonth: 'පෙර මාසය',
      nextMonth: 'ඊළඟ මාසය',
      todayBtn: 'අද',
      attended: 'පැමිණියේ',
      notAttended: 'පැමිණී නොමැත',
      noAttendanceData: 'පන්ති පැමිනීමී දත්ත නොමැත',
      attendanceWillAppear: 'පන්ති පැමිනීමී වාර්තා මෙහි පෙන්වනු ඇත'
    }
  };
  const tLocal = (key, vars) => {
    let s = (translationsLocal[appLangLocal] && translationsLocal[appLangLocal][key]) || translationsLocal.en[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]); });
    return s;
  };

  // Get month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString(appLangLocal === 'si' ? 'si-LK' : 'en-US', { month: 'long', year: 'numeric' });
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Navigation handlers
  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    console.log('Navigating to previous month:', newDate.toLocaleDateString());
    setCurrentDate(newDate);
  };
  
  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    console.log('Navigating to next month:', newDate.toLocaleDateString());
    setCurrentDate(newDate);
  };
  
  const goToCurrentMonth = () => {
    const newDate = new Date();
    console.log('Navigating to current month:', newDate.toLocaleDateString());
    setCurrentDate(newDate);
  };
  
  // Helper to get attendance data for a specific day
  const getAttendanceForDay = (day) => {
    // Check if we have real data
    if (!data || data.length === 0) {
      return null; // No data, return null instead of dummy data
    }
    
    // Format date as YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Filter attendance records for this specific date
    const dayRecords = data.filter(record => {
      // Handle different date formats
      if (!record.date) return false;
      
      // Extract just the date part (YYYY-MM-DD) from datetime or date string
      const recordDate = record.date.split(' ')[0].split('T')[0];
      const match = recordDate === dateStr;
      
      // Debug first match
      if (match && !window.debuggedAttendance) {
        console.log('Attendance match found:', { dateStr, recordDate, record });
        window.debuggedAttendance = true;
      }
      
      return match;
    });
    
    return dayRecords.length > 0 ? dayRecords : null;
  };
  
  // Calculate attendance status for a day
  const getDayStatus = (day) => {
    const attendance = getAttendanceForDay(day);
    if (!attendance || attendance.length === 0) return 'none';
    
    const present = attendance.filter(a => a.status === 'present' || a.status === '1' || a.status === 1).length;
    
    // Simple logic: green if attended one or more classes, gray if no attendance
    if (present > 0) return 'attended';
    return 'none';
  };
  
  // Get color based on attendance status
  const getColorClass = (status) => {
    if (status === 'attended') return 'bg-green-500 hover:bg-green-600';
    return 'bg-gray-200 hover:bg-gray-300';
  };
  
  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null); // Empty cells before month starts
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  
  // Count records for current month
  const currentMonthRecords = data ? data.filter(record => {
    if (!record.date) return false;
    const recordDate = new Date(record.date);
    return recordDate.getMonth() === month && recordDate.getFullYear() === year;
  }).length : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 relative">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{monthName}</h3>
          <p className="text-xs text-gray-500">
            {data && data.length > 0 
              ? tLocal('attendanceRecordsThisMonth', { n: currentMonthRecords })
              : tLocal('attendanceCalendar')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hover:scale-110 active:scale-95"
            title={tLocal('previousMonth')}
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              title={tLocal('todayBtn')}
            >
              {tLocal('todayBtn')}
            </button>
          )}
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hover:scale-110 active:scale-95"
            title={tLocal('nextMonth')}
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((day, idx) => (
          <div key={idx} className="text-xs font-semibold text-gray-600 text-center py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="aspect-square" />;
          }
          
          const status = getDayStatus(day);
          const attendance = getAttendanceForDay(day);
          const isToday = day === today.getDate() && 
                         month === today.getMonth() && 
                         year === today.getFullYear();
          
          return (
            <div
              key={idx}
              className="relative"
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              <div
                className={`aspect-square rounded-md ${getColorClass(status)} 
                  flex items-center justify-center text-xs font-semibold cursor-pointer
                  transition-all duration-200 ${isToday ? 'ring-2 ring-blue-500' : ''}
                  ${status !== 'none' ? 'text-white' : 'text-gray-600'}`}
              >
                {day}
              </div>
              
              {/* Tooltip on hover */}
              {hoveredDay === day && attendance && attendance.length > 0 && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                  bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl min-w-max max-w-xs">
                  <div className="font-bold mb-2 border-b border-gray-700 pb-1">
                    {monthName.split(' ')[0]} {day}
                  </div>
                  {attendance.map((record, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        record.status === 'present' || record.status === '1' || record.status === 1 ? 'bg-green-400' :
                        record.status === 'late' ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`} />
                      <span className="truncate flex-1">{record.className || record.class_name || 'Class'}</span>
                      <span className={`ml-auto font-semibold flex-shrink-0 ${
                        record.status === 'present' || record.status === '1' || record.status === 1 ? 'text-green-400' :
                        record.status === 'late' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {record.status === 'present' || record.status === '1' || record.status === 1 ? '✓' : 
                         record.status === 'late' ? '⏰' : '✗'}
                      </span>
                    </div>
                  ))}
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                    w-0 h-0 border-l-4 border-r-4 border-t-4 
                    border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-600 justify-center flex-wrap border-t border-gray-200 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>{tLocal('attended')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-gray-200 rounded-sm border border-gray-300" />
          <span>{tLocal('notAttended')}</span>
        </div>
      </div>
      
      {/* No data message */}
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl">
          <div className="text-center p-4">
            <div className="text-gray-400 text-4xl mb-2">📅</div>
            <div className="text-gray-600 font-medium">{tLocal('noAttendanceData')}</div>
            <div className="text-gray-500 text-xs mt-1">{tLocal('attendanceWillAppear')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Performance Chart Component
function PerformanceChart({ data }) {
  // Check if we have real data
  const hasData = data && data.length > 0;
  const appLangLocal = localStorage.getItem('appLang') || 'en';
  const translationsLocal = {
    en: {
      performanceTrends: 'Performance Trends',
      noExamResults: 'No exam results available yet',
      performanceDataWillAppear: 'Your performance data will appear here after taking exams',
      best: 'Best',
      exams: 'Exams'
    },
    si: {
      performanceTrends: 'කාර්ය සාධන ප්‍රවණතා',
      noExamResults: 'තවම විභාග ප්‍රතිඵල නොමැත',
      performanceDataWillAppear: 'ඔබගේ කාර්ය සාධන දත්ත විභාග ගත් පසු මෙහි පෙන්නුම් වේවි',
      best: 'හොඳම',
      exams: 'විභාග'
    }
  };
  const tLocal = (key) => (translationsLocal[appLangLocal] && translationsLocal[appLangLocal][key]) || translationsLocal.en[key] || key;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <FaChartLine className="text-purple-600 text-2xl" />
        <h2 className="text-xl font-bold text-gray-800">{tLocal('performanceTrends')}</h2>
      </div>
      
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
          <FaChartLine className="text-6xl mb-4 opacity-20" />
          <p className="text-lg font-medium">{tLocal('noExamResults')}</p>
          <p className="text-sm">{tLocal('performanceDataWillAppear')}</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
          <defs>
            <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="exam" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="marks" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorMarks)" 
            name="Marks Obtained"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-sm text-gray-600">{tLocal('best')}</div>
          <div className="text-xl font-bold text-green-600">
            {data.length > 0 
              ? Math.max(...data.map(item => item.marks))
              : 0}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">{tLocal('exams')}</div>
          <div className="text-xl font-bold text-blue-600">
            {data.length}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function DashboardNavButtons() {
  const navigate = useNavigate();
  const appLangLocal = localStorage.getItem('appLang') || 'en';
  const translationsLocal = {
    en: { quickActions: 'Quick Actions', myClasses: 'MY CLASSES', purchase: 'PURCHASE', payments: 'PAYMENTS', materials: 'MATERIALS' },
    si: { quickActions: 'ඉක්මන් ක්‍රියා', myClasses: 'මගේ පන්ති', purchase: 'මිලදී ගන්න', payments: 'ගෙවීම්', materials: 'අධ්‍යයන ද්‍රව්‍ය' }
  };
  const tLocal = (key) => (translationsLocal[appLangLocal] && translationsLocal[appLangLocal][key]) || translationsLocal.en[key] || key;
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">{tLocal('quickActions')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/student/my-classes')}
          className="flex flex-col items-center justify-center rounded-xl bg-blue-50 shadow-sm hover:shadow-md px-4 py-4 sm:py-6 transition duration-200 hover:bg-blue-100 active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-gray-200"
        >
          <LuMonitorPlay size={32} className="sm:text-4xl mb-2 text-[#1a365d]" />
          <span className="font-bold text-xs sm:text-sm text-[#1a365d] text-center">{tLocal('myClasses')}</span>
        </button>
        <button
          onClick={() => navigate('/student/purchase-classes')}
          className="flex flex-col items-center justify-center rounded-xl bg-green-50 shadow-sm hover:shadow-md px-4 py-4 sm:py-6 transition duration-200 hover:bg-green-100 active:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 border border-gray-200"
        >
          <LuMonitorSmartphone size={32} className="sm:text-4xl mb-2 text-green-700" />
          <span className="font-bold text-xs sm:text-sm text-green-700 text-center">{tLocal('purchase')}</span>
        </button>
        <button
          onClick={() => navigate('/student/my-payments')}
          className="flex flex-col items-center justify-center rounded-xl bg-purple-50 shadow-sm hover:shadow-md px-4 py-4 sm:py-6 transition duration-200 hover:bg-purple-100 active:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 border border-gray-200"
        >
          <LuCreditCard size={32} className="sm:text-4xl mb-2 text-purple-700" />
          <span className="font-bold text-xs sm:text-sm text-purple-700 text-center">{tLocal('payments')}</span>
        </button>
        <button
          onClick={() => navigate('/student/lesson-packs')}
          className="flex flex-col items-center justify-center rounded-xl bg-orange-50 shadow-sm hover:shadow-md px-4 py-4 sm:py-6 transition duration-200 hover:bg-orange-100 active:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 border border-gray-200"
        >
          <LuBookOpen size={32} className="sm:text-4xl mb-2 text-orange-700" />
          <span className="font-bold text-xs sm:text-sm text-orange-700 text-center">{tLocal('materials')}</span>
        </button>
      </div>
    </div>
  );
}

const StudentDashboard = ({ onLogout }) => {
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecking, setSessionChecking] = useState(false);
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    activeClasses: 0,
    attendanceRate: 0,
    paymentsDue: 0,
    progress: 0
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const navigate = useNavigate();
  // Language selection (persisted)
  const [appLang, setAppLang] = useState(localStorage.getItem('appLang') || 'en');

  const translations = {
    en: {
      loadingProfile: 'Loading student profile...',
      redirectingToLogin: 'Redirecting to login...',
      accountBlocked: 'Your account has been blocked by the administrator. Redirecting to login...',
      checkingSession: 'Checking session validity...',
      studentReady: 'Student ID: #{id} • Ready to learn today',
      activeClasses: 'Active Classes',
      paymentsDue: 'Payments Due',
      pending: 'pending',
      notifications: 'Notifications',
      activeAlerts: '{n} active alerts',
      clearAll: 'Clear All',
      noNotifications: 'No notifications at this time',
      todaysSchedule: "Today's Schedule",
      noClassesToday: 'No classes scheduled for today',
      attendanceCalendar: 'Attendance Calendar',
      attendanceRecordsThisMonth: '{n} attendance record(s) this month',
      attended: 'Attended',
      notAttended: 'Not Attended',
      noAttendanceData: 'No attendance data available',
      attendanceWillAppear: 'Attendance records will appear here',
      performanceTrends: 'Performance Trends',
      noExamResults: 'No exam results available yet',
      performanceDataWillAppear: 'Your performance data will appear here after taking exams',
      best: 'Best',
      exams: 'Exams',
      quickActions: 'Quick Actions',
      myClasses: 'MY CLASSES',
      purchase: 'PURCHASE',
      payments: 'PAYMENTS',
      materials: 'MATERIALS',
  online: 'Online',
      studentDetails: 'Student Details',
      mobile: 'Mobile:',
      school: 'School:',
      stream: 'Stream:',
      attendanceCode: 'Attendance Code',
      idLabel: 'ID: #{id}',
      previousMonth: 'Previous Month',
      nextMonth: 'Next Month',
      todayBtn: 'Today'
    },
    si: {
      loadingProfile: 'ශිෂ්‍ය පැතිකඩ සම්බන්ද කරමින්...',
      redirectingToLogin: 'පිවිසුමට යොමු වෙමින්...',
      accountBlocked: 'මෙම ගිණුම පරිපාලක විසින් අත්හිටුවා ඇත. පිවිසුමට වෙත යළි යවමින්...',
      checkingSession: 'සැසිය වලංගුදැයි පරීක්ෂා කරමින්...',
      studentReady: 'ශිෂ්‍ය හැඳුනුම් අංකය: #{id} • ඉගෙනීමට සූදානම්',
      activeClasses: 'ක්‍රියාකාරී පන්ති',
      paymentsDue: 'ගෙවීම් හිඟයි',
      pending: 'සිදුවීම්',
      notifications: 'දැනුම්දීම්',
      activeAlerts: '{n} ක් ක්‍රියාකාරී දැනුම්දෙනු',
      clearAll: 'සියලුම මකන්න',
      noNotifications: 'මෙම අවස්ථාවේ දැනුම්දීම් නොමැත',
      todaysSchedule: 'අද කාලසටහන',
      noClassesToday: 'අද සඳහා පන්ති වෙන් තැබී නැත',
      attendanceCalendar: 'හමුවීම් දින දසුන',
      attendanceRecordsThisMonth: '{n} හමුවීම් වාර්තා(ය) මේ මාසයේ',
      attended: 'සහභාගී උනා',
      notAttended: 'පැමිණී නොමැත',
      noAttendanceData: 'හමුවීම් දත්ත නොමැත',
      attendanceWillAppear: 'හමුවීම් වාර්තා මෙහි පෙන්වනු ඇත',
      performanceTrends: 'කාර්ය සාධන ප්‍රවණතා',
      noExamResults: 'තවම විභාග ප්‍රතිඵල නොමැත',
      performanceDataWillAppear: 'විභාග ගෙන පසු ඔබගේ කාර්ය සාධන දත්ත මෙහි පෙන්වනු ඇත',
      best: 'හොඳම',
      exams: 'විභාග',
      quickActions: 'ඉක්මන් ක්‍රියා',
      myClasses: 'මගේ පන්ති',
      purchase: 'මිලදී ගන්න',
      payments: 'ගෙවීම්',
      materials: 'ද්‍රව්‍ය',
  online: 'ඔන්ලයින්',
      studentDetails: 'ශිෂ්‍ය විස්තර',
      mobile: 'ජංගම:',
      school: 'පාසල:',
      stream: 'ප්රවාහය:',
      attendanceCode: 'පැමිණීමේ කේතය',
      idLabel: 'හැඳුනුම් අංකය: #{id}',
      previousMonth: 'පෙර මාසය',
      nextMonth: 'ඊළඟ මාසය',
      todayBtn: 'අද'
    }
  };

  const t = (key, vars) => {
    let str = (translations[appLang] && translations[appLang][key]) || translations.en[key] || key;
    if (vars) {
      Object.keys(vars).forEach(k => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
      });
    }
    return str;
  };

  useEffect(() => {
    localStorage.setItem('appLang', appLang);
  }, [appLang]);

  // Listen for language changes from Navbar or other tabs and update local state
  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === 'appLang' && e.newValue) {
        setAppLang(e.newValue);
      }
    };

    const onCustom = (e) => {
      const newLang = e?.detail || localStorage.getItem('appLang');
      if (newLang) setAppLang(newLang);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('appLangChanged', onCustom);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('appLangChanged', onCustom);
    };
  }, []);

  useEffect(() => {
    // Load authenticated user data from appropriate storage
    const storage = getStorage();
    const userData = storage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        
        // Check if user is a student
        if (user.role === 'student') {
          console.log('Setting current student:', user);
          setCurrentStudent(user);
          
          // Fetch complete student profile from student backend
          const loadStudentProfile = async () => {
            try {
              console.log('Loading student profile for user:', user.userid);
              const profile = await fetchStudentProfile(user.userid);
              if (profile) {
                console.log('Setting student profile:', profile);
                console.log('Student name:', profile.first_name, profile.last_name);
                setStudentProfile(profile);
              } else {
                console.log('No profile data received');
              }
            } catch (error) {
              console.error('Error loading student profile:', error);
            } finally {
              setLoading(false);
            }
          };
          
          loadStudentProfile();
          
          // Check session validity every 30 seconds
          const checkSessionValidity = async () => {
            setSessionChecking(true);
            try {
              const response = await axios.get(`http://localhost:8081/routes.php/session-valid/${user.userid}`, {
                timeout: 5000 // 5 second timeout
              });
              if (response.data.success && !response.data.session_valid) {
                // Session is invalid (user is blocked)
                // Clear specific authentication data
                storage.removeItem('userData');
                storage.removeItem('authToken');
                storage.removeItem('refreshToken');
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                sessionStorage.removeItem('userData');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('refreshToken');
                
                // Show logout message
                setShowLogoutMessage(true);
                
                // Force complete page reload to clear all cached data and redirect
                setTimeout(() => {
                  window.location.replace('/login');
                }, 2000);
              }
            } catch (error) {
              console.error('Error checking session validity:', error);
              // Don't block the UI if session check fails
            } finally {
              setSessionChecking(false);
            }
          };
          
          // Check immediately after a short delay to avoid blocking initial render
          setTimeout(checkSessionValidity, 100);
          
          // Set up periodic checking every 30 seconds
          const intervalId = setInterval(checkSessionValidity, 30000);
          
          // Cleanup interval on unmount
          return () => clearInterval(intervalId);
        } else {
          // If not a student, redirect to appropriate dashboard
          console.log("User is not a student, redirecting...");
          navigate('/login');
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        navigate('/login');
      }
    } else {
      // If no user data, redirect to login
      console.log("No user data found, redirecting to login");
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  // Fetch dashboard data (attendance, exams, schedule, alerts, metrics)
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentStudent || !currentStudent.userid) return;

      const userid = currentStudent.userid;
      console.log('Fetching dashboard data for student:', userid);
      
      // Declare variables at function scope so they can be accessed across sections
      let classesData = [];
      let classIdToNameMap = {}; // Map to store class_id -> class_name

      try {
        // 1. Fetch Class Enrollments First (to get class names)
        try {
          const classesResponse = await axios.get(
            `http://localhost:8087/routes.php/get_enrollments_by_student?studentId=${userid}`,
            { timeout: 5000 }
          );
          
          console.log('Classes API Response:', classesResponse.data);
          classesData = classesResponse.data?.data || classesResponse.data || [];
          
          // Create mapping of class_id to class_name
          if (Array.isArray(classesData)) {
            classesData.forEach(cls => {
              if (cls.class_id && cls.class_name) {
                classIdToNameMap[cls.class_id] = cls.class_name;
              }
            });
          }
          console.log('Class ID to Name Map:', classIdToNameMap);
        } catch (error) {
          console.error('Error fetching classes for mapping:', error);
        }
        
        // 2. Fetch Attendance Data
        try {
          console.log('Fetching attendance for student:', userid);
          const attendanceResponse = await axios.get(
            `http://localhost:8092/student-attendance/${userid}`,
            { timeout: 5000 }
          );
          console.log('Attendance API Response:', attendanceResponse.data);
          
          if (attendanceResponse.data && !attendanceResponse.data.error) {
            // Handle both array and object responses
            const dataArray = Array.isArray(attendanceResponse.data) 
              ? attendanceResponse.data 
              : attendanceResponse.data.data || [];
            
            // Format attendance data for heatmap with actual class names
            const formattedAttendance = dataArray.map(record => ({
              date: record.date || record.attendance_date || record.join_time,
              className: classIdToNameMap[record.class_id] || record.class_name || record.title || record.subject || 'Class',
              class_id: record.class_id,
              status: record.status || record.attendance_status || (record.attended ? 'present' : 'absent')
            }));
            
            setAttendanceData(formattedAttendance);
            console.log('Attendance data formatted:', formattedAttendance.length, 'records');
            console.log('Sample record with class name:', formattedAttendance[0]);
          } else {
            console.log('No attendance data or error in response');
          }
        } catch (error) {
          console.error('Error fetching attendance:', error.message);
          console.error('Error details:', error.response?.data || error);
        }

        // 2. Fetch Exam Performance Data
        try {
          const marksResponse = await axios.get(
            `http://localhost:8088/exam.php/api/marks/student/${userid}`,
            { timeout: 5000 }
          );
          
          console.log('Marks API Response:', marksResponse.data);
          
          if (marksResponse.data && Array.isArray(marksResponse.data) && marksResponse.data.length > 0) {
            // Group marks by exam_id and calculate totals
            const examTotals = {};
            
            marksResponse.data.forEach(record => {
              const examId = record.exam_id;
              if (!examTotals[examId]) {
                examTotals[examId] = {
                  examId: examId,
                  examTitle: record.exam_title || `Exam ${examId}`,
                  totalScore: 0,
                  totalMaxMarks: 0
                };
              }
              
              // Only count parent questions (those without parent_part_id) to avoid double counting
              if (!record.parent_part_id) {
                examTotals[examId].totalScore += parseFloat(record.score_awarded || 0);
                examTotals[examId].totalMaxMarks += parseFloat(record.max_marks || 0);
              }
            });
            
            console.log('Exam totals:', examTotals);
            
            // Format performance data for chart
            const formattedPerformance = Object.values(examTotals).map(exam => ({
              exam: exam.examTitle,
              marks: exam.totalMaxMarks > 0 
                ? Math.round((exam.totalScore / exam.totalMaxMarks) * 100)
                : 0,
              maxMarks: 100,
              actualScore: exam.totalScore,
              actualMaxMarks: exam.totalMaxMarks
            }));
            
            setPerformanceData(formattedPerformance);
            console.log('Performance data loaded:', formattedPerformance.length, 'exams');
            console.log('Formatted performance:', formattedPerformance);
          } else {
            console.log('No exam marks found for student');
            setPerformanceData([]);
          }
        } catch (error) {
          console.error('Error fetching exam performance:', error);
          setPerformanceData([]);
        }

        // 3. Build Today's Schedule from already-fetched classes data
        if (classesData && Array.isArray(classesData)) {
          // Filter for today's classes
          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          console.log('Today is:', today);
          
          const todaysClasses = classesData
            .filter(cls => {
              const classDay = cls.day || cls.schedule_day;
              console.log('Class:', cls.class_name, 'Day:', classDay, 'Match:', classDay === today);
              return classDay === today;
            })
            .map(cls => ({
              subject: cls.title || cls.class_name || cls.name || cls.subject,
              teacher: cls.teacher_name || cls.teacher || 'Teacher',
              time: `${cls.schedule_start_time || cls.start_time || ''} - ${cls.schedule_end_time || cls.end_time || ''}`,
              mode: cls.delivery_method || cls.mode || cls.type || 'physical',
              location: cls.location || cls.venue || 'Physical Location'
            }));
          
          setTodaySchedule(todaysClasses);
          console.log('Schedule loaded:', todaysClasses.length, 'classes today');
        }

        // 4. Fetch Payment Data and Create Alerts
        try {
          const paymentsResponse = await axios.get(
            `http://localhost:8090/routes.php/get_student_payments?studentId=${userid}`,
            { timeout: 5000 }
          );
          
          console.log('Payments API Response:', paymentsResponse.data);
          
          const alertsList = [];
          let paymentsDue = 0;
          
          // Handle both response formats: direct array or {success, data} object
          const paymentsData = paymentsResponse.data?.data || paymentsResponse.data;
          
          if (paymentsData && Array.isArray(paymentsData)) {
            console.log('Total payments:', paymentsData.length);
            
            // Check for pending/overdue payments
            const pendingPayments = paymentsData.filter(
              payment => payment.status === 'pending' || payment.status === 'overdue'
            );
            
            paymentsDue = pendingPayments.length;
            console.log('Payments due:', paymentsDue);
            
            if (pendingPayments.length > 0) {
              alertsList.push({
                type: 'warning',
                title: 'Payment Reminder',
                message: `You have ${pendingPayments.length} pending payment(s). Please clear them soon.`,
                time: 'Now'
              });
            }
          }
          
          // ===== REAL ALERT GENERATION SYSTEM =====
          
          // 1. LOW ATTENDANCE ALERT
          if (attendanceData.length > 0) {
            const presentCount = attendanceData.filter(a => 
              a.status === 'present' || a.status === '1' || a.status === 1
            ).length;
            const attendanceRate = Math.round((presentCount / attendanceData.length) * 100);
            
            if (attendanceRate < 75) {
              alertsList.push({
                type: 'danger',
                title: 'Low Attendance Warning',
                message: `Your attendance is ${attendanceRate}%. Minimum 75% required. Please attend regularly.`,
                time: 'Now'
              });
            }
          }
          
          // 2. TODAY'S CLASS SCHEDULE ALERTS
          // classesData is already available from section 3
          if (Array.isArray(classesData) && classesData.length > 0) {
            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const todaysClasses = classesData.filter(cls => 
              (cls.day || cls.schedule_day) === today
            );
            
            if (todaysClasses.length > 0) {
              const classNames = todaysClasses.map(c => c.class_name || c.name).join(', ');
              alertsList.push({
                type: 'info',
                title: 'Classes Today',
                message: `You have ${todaysClasses.length} class(es) today: ${classNames}`,
                time: 'Today'
              });
            }
          }
          
          // 3. NEW CLASS ENROLLMENT ALERT (enrolled within last 7 days)
          if (Array.isArray(classesData)) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const newEnrollments = classesData.filter(cls => {
              const enrollmentDate = new Date(cls.enrollment_date || cls.created_at);
              return enrollmentDate >= sevenDaysAgo;
            });
            
            if (newEnrollments.length > 0) {
              newEnrollments.forEach(cls => {
                const daysAgo = Math.floor(
                  (new Date() - new Date(cls.enrollment_date || cls.created_at)) / (1000 * 60 * 60 * 24)
                );
                alertsList.push({
                  type: 'success',
                  title: 'New Class Enrolled',
                  message: `Welcome to "${cls.class_name}"! ${cls.schedule_day} at ${cls.schedule_start_time}`,
                  time: daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
                });
              });
            }
          }
          
          // 4. RECENT EXAM RESULTS ALERT (check if we have new performance data)
          if (performanceData.length > 0) {
            // Get the most recent exam
            const latestExam = performanceData[performanceData.length - 1];
            if (latestExam) {
              alertsList.push({
                type: latestExam.marks >= 75 ? 'success' : latestExam.marks >= 50 ? 'info' : 'warning',
                title: 'Exam Result Available',
                message: `${latestExam.exam}: You scored ${latestExam.marks}% (${latestExam.actualScore}/${latestExam.actualMaxMarks})`,
                time: 'Recent'
              });
            }
          }
          
          // 5. NEW MATERIALS UPLOADED ALERTS
          if (Array.isArray(classesData)) {
            for (const classInfo of classesData) {
              try {
                const materialsResponse = await axios.get(
                  `http://localhost:8088/materials.php?class_id=${classInfo.class_id}`,
                  { timeout: 5000 }
                );
                
                if (materialsResponse.data?.success && Array.isArray(materialsResponse.data.materials)) {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  
                  const newMaterials = materialsResponse.data.materials.filter(material => {
                    const uploadDate = new Date(material.upload_date || material.created_at);
                    return uploadDate >= sevenDaysAgo;
                  });
                  
                  if (newMaterials.length > 0) {
                    newMaterials.forEach(material => {
                      const daysAgo = Math.floor(
                        (new Date() - new Date(material.upload_date || material.created_at)) / (1000 * 60 * 60 * 24)
                      );
                      alertsList.push({
                        type: 'success',
                        title: 'New Material Available',
                        message: `"${material.title || material.file_name}" uploaded for ${classInfo.class_name}`,
                        time: daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
                      });
                    });
                  }
                }
              } catch (error) {
                console.log('Could not fetch materials for class:', classInfo.class_id);
              }
            }
          }
          
          // 6. NEW LECTURE RECORDINGS AVAILABLE ALERTS
          if (Array.isArray(classesData)) {
            for (const classInfo of classesData) {
              try {
                const recordingsResponse = await axios.get(
                  `http://localhost:8088/recordings.php?class_id=${classInfo.class_id}`,
                  { timeout: 5000 }
                );
                
                if (recordingsResponse.data?.success && Array.isArray(recordingsResponse.data.recordings)) {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  
                  const newRecordings = recordingsResponse.data.recordings.filter(recording => {
                    const uploadDate = new Date(recording.upload_date || recording.created_at);
                    return uploadDate >= sevenDaysAgo;
                  });
                  
                  if (newRecordings.length > 0) {
                    newRecordings.forEach(recording => {
                      const daysAgo = Math.floor(
                        (new Date() - new Date(recording.upload_date || recording.created_at)) / (1000 * 60 * 60 * 24)
                      );
                      alertsList.push({
                        type: 'info',
                        title: 'New Recording Available',
                        message: `Lecture recording "${recording.title || recording.file_name}" for ${classInfo.class_name}`,
                        time: daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
                      });
                    });
                  }
                }
              } catch (error) {
                console.log('Could not fetch recordings for class:', classInfo.class_id);
              }
            }
          }
          
          // 7. UPCOMING PAYMENT DUE ALERT (check next_payment_date)
          if (Array.isArray(classesData)) {
            const upcomingPayments = classesData.filter(cls => {
              if (!cls.next_payment_date) return false;
              const nextPaymentDate = new Date(cls.next_payment_date);
              const daysUntilPayment = Math.ceil(
                (nextPaymentDate - new Date()) / (1000 * 60 * 60 * 24)
              );
              return daysUntilPayment > 0 && daysUntilPayment <= 7;
            });
            
            if (upcomingPayments.length > 0) {
              upcomingPayments.forEach(cls => {
                const nextPaymentDate = new Date(cls.next_payment_date);
                const daysUntil = Math.ceil(
                  (nextPaymentDate - new Date()) / (1000 * 60 * 60 * 24)
                );
                alertsList.push({
                  type: 'warning',
                  title: 'Upcoming Payment',
                  message: `Payment for "${cls.class_name}" due in ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${nextPaymentDate.toLocaleDateString()})`,
                  time: `${daysUntil} day${daysUntil > 1 ? 's' : ''}`
                });
              });
            }
          }
          
          setAlerts(alertsList);
          console.log('Alerts created:', alertsList.length);
          console.log('Alert details:', alertsList);
          
          // 5. Calculate Dashboard Metrics
          const metricsResponse = await axios.get(
            `http://localhost:8087/routes.php/get_enrollments_by_student?studentId=${userid}`,
            { timeout: 5000 }
          );
          
          console.log('Metrics API Response:', metricsResponse.data);
          
          let activeClasses = 0;
          // Handle both response formats: direct array or {success, data} object
          const metricsData = metricsResponse.data?.data || metricsResponse.data;
          
          if (metricsData && Array.isArray(metricsData)) {
            activeClasses = metricsData.filter(
              cls => cls.status === 'active' || cls.class_status === 'active' || !cls.status
            ).length;
            console.log('Active classes count:', activeClasses);
          }
          
          // Calculate attendance rate
          let attendanceRate = 0;
          if (attendanceData.length > 0) {
            const presentCount = attendanceData.filter(a => a.status === 'present' || a.status === '1' || a.status === 1).length;
            attendanceRate = Math.round((presentCount / attendanceData.length) * 100);
            console.log('Attendance rate:', attendanceRate, '% (', presentCount, '/', attendanceData.length, ')');
          }
          
          // Calculate progress (based on completed exams)
          let progress = 0;
          if (performanceData.length > 0) {
            const avgMarks = performanceData.reduce((sum, exam) => sum + exam.marks, 0) / performanceData.length;
            progress = Math.round(avgMarks);
          }
          
          setDashboardMetrics({
            activeClasses,
            attendanceRate,
            paymentsDue,
            progress
          });
          
          console.log('Dashboard metrics calculated:', {
            activeClasses,
            attendanceRate,
            paymentsDue,
            progress
          });
          
        } catch (error) {
          console.error('Error fetching payments/metrics:', error);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [currentStudent, attendanceData.length, performanceData.length]);

  // Show loading while checking authentication or fetching profile
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-sm sm:text-lg text-gray-600">{t('loadingProfile')}</div>
        </div>
      </div>
    );
  }

  // Show loading or redirect if no student data
  if (!currentStudent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-sm sm:text-lg text-gray-600">{t('redirectingToLogin')}</div>
        </div>
      </div>
    );
  }

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    const firstInitial = firstName ? firstName.charAt(0) : '';
    const lastInitial = lastName ? lastName.charAt(0) : '';
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    return initials || 'S'; // Return 'S' for Student if no initials available
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <DashboardLayout
      userRole="Student"
      sidebarItems={studentSidebarSections}
      onLogout={onLogout}
    >
      <div className="p-4 sm:p-6 min-h-screen bg-gray-50">
        {/* Logout Message */}
        {showLogoutMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center text-red-600 text-sm font-medium">
              <span className="mr-2">⚠️</span>
              
              {t('accountBlocked')}
            </div>
          </div>
        )}
        
        {/* Session Status Indicator */}
        {sessionChecking && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center text-blue-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          
              {t('checkingSession')}
            </div>
          </div>
        )}
        
        {/* Header Section with Glassmorphism */}
        <div className="relative bg-gradient-to-r from-blue-600/95 to-purple-600/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 mb-6 text-white overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl -ml-16 -mb-16"></div>
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="bg-white/30 backdrop-blur-md w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-xl border-2 border-white/40">
              {getInitials(studentProfile?.first_name || currentStudent.firstName, studentProfile?.last_name || currentStudent.lastName)}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-bold mb-2 drop-shadow-lg">
                {getGreeting()}, {studentProfile?.first_name || currentStudent.firstName || 'Student'}!
              </div>
              <div className="text-blue-100 text-sm sm:text-base bg-white/10 backdrop-blur-sm inline-block px-4 py-2 rounded-full border border-white/20">
               
                {t('studentReady', { id: currentStudent.userid })}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metrics Cards Grid - 3 cards with notifications spanning 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Classes Card */}
              <MetricCard
                title={t('activeClasses')}
                value={dashboardMetrics.activeClasses}
                icon={FaChalkboardTeacher}
                color="blue"
              />
              
              {/* Payments Due Card */}
              <MetricCard
                title={t('paymentsDue')}
                value={dashboardMetrics.paymentsDue}
                icon={FaMoneyBillWave}
                color="orange"
                subtitle={t('pending')}
              />
              
              {/* Notifications Card - Spans 2 columns on desktop */}
              <div className="md:col-span-2">
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-lg rounded-xl shadow-lg p-4 border border-purple-200/30 h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <FaExclamationTriangle className="text-purple-600 text-xl" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{t('notifications')}</h3>
                        <p className="text-xs text-gray-600">{t('activeAlerts', { n: alerts.length })}</p>
                      </div>
                    </div>
                    {alerts.length > 0 && (
                      <button
                          onClick={() => setAlerts([])}
                          className="text-xs text-purple-600 hover:text-purple-800 font-semibold underline transition-colors"
                        >
                          {t('clearAll')}
                        </button>
                    )}
                  </div>
                  
                  {alerts.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {alerts.map((alert, index) => (
                        <AlertCard 
                          key={index} 
                          type={alert.type}
                          onDismiss={() => {
                            setAlerts(prevAlerts => prevAlerts.filter((_, i) => i !== index));
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="font-semibold text-sm mb-1">{alert.title}</div>
                              <div className="text-sm">{alert.message}</div>
                            </div>
                            {alert.time && (
                              <div className="text-xs opacity-75 whitespace-nowrap">{alert.time}</div>
                            )}
                          </div>
                        </AlertCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <FaCheckCircle className="text-4xl mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('noNotifications')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <LuCalendarCheck className="text-blue-600 text-2xl" />
                <h2 className="text-xl font-bold text-gray-800">{t('todaysSchedule')}</h2>
              </div>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((classItem, index) => (
                    <div key={index} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <LuClock className="text-blue-600 text-xl" />
                          <div>
                            <div className="font-semibold text-gray-800">{classItem.subject}</div>
                            <div className="text-sm text-gray-600">{classItem.teacher}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">{classItem.time}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            {classItem.mode === 'online' ? (
                              <>
                                <LuVideo size={12} />
                                {t('online')}
                              </>
                            ) : (
                              <>
                                <LuMapPin size={12} />
                                {classItem.location}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <LuCalendarCheck className="mx-auto text-4xl mb-2 opacity-50" />
                  <p>{t('noClassesToday')}</p>
                </div>
              )}
            </div>

            {/* Performance Chart */}
            <PerformanceChart data={performanceData} />

            {/* Quick Actions */}
            <DashboardNavButtons />
          </div>

          {/* Right Column: Sidebar (1/3) */}
          <div className="space-y-6">
            {/* Clock */}
            <BasicCard>
              <div className="flex justify-center">
                <ClockProps />
              </div>
            </BasicCard>

            {/* Profile Card */}
            <BasicCard>
              <div className="flex flex-col items-center p-4">
                {/* Avatar and Name */}
                <div className="flex flex-col items-center w-full mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg">
                    {getInitials(studentProfile?.first_name || currentStudent.firstName, studentProfile?.last_name || currentStudent.lastName)}
                  </div>
                  <div className="text-xl font-bold mb-1 text-center">
                    {studentProfile ? 
                      `${studentProfile.first_name} ${studentProfile.last_name}` : 
                      currentStudent.firstName ? 
                        `${currentStudent.firstName} ${currentStudent.lastName || ''}` : 
                        'Loading...'
                    }
                  </div>
                  <div className="text-sm text-blue-600 font-semibold">
                    ID: #{currentStudent.userid}
                  </div>
                </div>
                
                {/* Details Section */}
                <div className="w-full bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-gray-600 font-bold mb-3 uppercase tracking-wide">{t('studentDetails')}</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-600">📱</span>
                      <span className="text-gray-600">{t('mobile')}</span>
                      <span className="text-gray-800 font-medium ml-auto">
                        {studentProfile?.mobile_number || 'Loading...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-purple-600">🏫</span>
                      <span className="text-gray-600">{t('school')}</span>
                      <span className="text-gray-800 font-medium ml-auto truncate max-w-[150px]">
                        {studentProfile?.school || 'Loading...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">📚</span>
                      <span className="text-gray-600">{t('stream')}</span>
                      <span className="text-gray-800 font-medium ml-auto">
                        {studentProfile?.stream || 'Loading...'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Barcode */}
                <div className="w-full flex flex-col items-center pt-2">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{t('attendanceCode')}</div>
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Barcode 
                      value={currentStudent.userid} 
                      width={1.2} 
                      height={35} 
                      fontSize={10} 
                      displayValue={true} 
                      background="#fff" 
                      lineColor="#000" 
                    />
                  </div>
                </div>
              </div>
            </BasicCard>

            {/* Attendance Heatmap */}
            <AttendanceHeatmap data={attendanceData} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;