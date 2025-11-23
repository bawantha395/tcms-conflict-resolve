import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * AttendanceCalendar Component
 * Displays student attendance in a monthly calendar view with color-coded indicators
 * Shows attendance for all classes the student is enrolled in
 */
const AttendanceCalendar = ({ attendanceData = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayAttendance, setSelectedDayAttendance] = useState([]);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  // Get number of days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(null);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(null);
  };

  // Navigate to current month
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Process attendance data to group by date
  const attendanceByDate = {};
  
  if (attendanceData && Array.isArray(attendanceData)) {
    attendanceData.forEach(record => {
      // Extract date from join_time or attendance_date
      let dateStr = null;
      
      if (record.attendance_date) {
        dateStr = record.attendance_date.split(' ')[0]; // Get date part only
      } else if (record.join_time) {
        dateStr = new Date(record.join_time).toISOString().split('T')[0];
      }
      
      if (dateStr) {
        if (!attendanceByDate[dateStr]) {
          attendanceByDate[dateStr] = [];
        }
        attendanceByDate[dateStr].push(record);
      }
    });
  }

  // Get attendance status for a specific date
  const getDateAttendanceStatus = (year, month, day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const records = attendanceByDate[dateStr] || [];
    
    if (records.length === 0) return null;
    
    // Count statuses
    const statusCounts = {
      present: 0,
      late: 0,
      absent: 0
    };
    
    records.forEach(record => {
      const status = (record.attendance_status || '').toLowerCase();
      if (status === 'present') statusCounts.present++;
      else if (status === 'late') statusCounts.late++;
      else if (status === 'absent') statusCounts.absent++;
    });
    
    return {
      records,
      statusCounts,
      totalClasses: records.length
    };
  };

  // Get color for date cell based on attendance
  const getDateColor = (attendanceInfo) => {
    if (!attendanceInfo) return 'bg-white';
    
    const { statusCounts, totalClasses } = attendanceInfo;
    
    // All present
    if (statusCounts.present === totalClasses) {
      return 'bg-green-100 border-green-400';
    }
    
    // All absent
    if (statusCounts.absent === totalClasses) {
      return 'bg-red-100 border-red-400';
    }
    
    // All late
    if (statusCounts.late === totalClasses) {
      return 'bg-yellow-100 border-yellow-400';
    }
    
    // Mixed statuses
    return 'bg-blue-100 border-blue-400';
  };

  // Handle date click
  const handleDateClick = (day, event) => {
    event.stopPropagation(); // Prevent event bubbling
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const records = attendanceByDate[dateStr] || [];
    
    if (records.length > 0) {
      setSelectedDate(new Date(currentYear, currentMonth, day));
      setSelectedDayAttendance(records);
    }
  };

  // Close detail view
  const closeDetailView = () => {
    setSelectedDate(null);
    setSelectedDayAttendance([]);
  };

  // Render calendar days
  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-1"></div>
      );
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const attendanceInfo = getDateAttendanceStatus(currentYear, currentMonth, day);
      const dateColor = getDateColor(attendanceInfo);
      const isToday = 
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();
      
      days.push(
        <div
          key={day}
          onClick={(e) => attendanceInfo && handleDateClick(day, e)}
          className={`aspect-square p-1 border-2 rounded-lg transition-all cursor-pointer ${dateColor} ${
            isToday ? 'ring-2 ring-blue-500' : ''
          } ${
            attendanceInfo ? 'hover:shadow-md hover:scale-105' : 'cursor-default'
          }`}
        >
          <div className="h-full flex flex-col items-center justify-center">
            <div className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
              {day}
            </div>
            {attendanceInfo && (
              <div className="flex gap-0.5 mt-1">
                {attendanceInfo.statusCounts.present > 0 && (
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full" title={`${attendanceInfo.statusCounts.present} present`}></div>
                )}
                {attendanceInfo.statusCounts.late > 0 && (
                  <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full" title={`${attendanceInfo.statusCounts.late} late`}></div>
                )}
                {attendanceInfo.statusCounts.absent > 0 && (
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full" title={`${attendanceInfo.statusCounts.absent} absent`}></div>
                )}
              </div>
            )}
            {attendanceInfo && attendanceInfo.totalClasses > 1 && (
              <div className="text-[10px] text-slate-500 mt-0.5">
                {attendanceInfo.totalClasses}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-2xl" />
            <div>
              <h3 className="text-lg font-bold">Attendance Calendar</h3>
              <div className="text-sm opacity-90">View attendance across all classes</div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToCurrentMonth();
            }}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-slate-50 border-b border-slate-200 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousMonth();
            }}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Previous Month"
          >
            <FaChevronLeft className="text-slate-600" />
          </button>
          
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">
              {monthNames[currentMonth]} {currentYear}
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNextMonth();
            }}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            title="Next Month"
          >
            <FaChevronRight className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
            <span className="text-slate-700">All Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
            <span className="text-slate-700">All Late</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
            <span className="text-slate-700">All Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
            <span className="text-slate-700">Mixed Status</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white p-4 rounded-b-lg" onClick={(e) => e.stopPropagation()}>
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Attendance Details Modal */}
      {selectedDate && selectedDayAttendance.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetailView}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[70vh] overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            {/* Close Button - Positioned absolutely */}
            <button
              onClick={closeDetailView}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/30 rounded-full p-2 transition-colors text-2xl font-bold w-10 h-10 flex items-center justify-center bg-black/20"
              title="Close"
            >
              ✕
            </button>
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 pr-16">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FaCalendarAlt />
                  Attendance Details
                </h3>
                <div className="text-sm opacity-90 mt-1">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(70vh-160px)]">
              <div className="space-y-3">
                {selectedDayAttendance.map((record, index) => {
                  const status = (record.attendance_status || '').toLowerCase();
                  const statusIcon = 
                    status === 'present' ? <FaCheckCircle className="text-green-500 text-xl" /> :
                    status === 'late' ? <FaExclamationTriangle className="text-yellow-500 text-xl" /> :
                    <FaTimesCircle className="text-red-500 text-xl" />;
                  
                  const statusColor = 
                    status === 'present' ? 'bg-green-50 border-green-300' :
                    status === 'late' ? 'bg-yellow-50 border-yellow-300' :
                    'bg-red-50 border-red-300';
                  
                  const statusTextColor = 
                    status === 'present' ? 'text-green-700' :
                    status === 'late' ? 'text-yellow-700' :
                    'text-red-700';
                  
                  return (
                    <div key={index} className={`border-2 rounded-lg p-4 ${statusColor}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {statusIcon}
                            <div>
                              <div className="font-semibold text-slate-800">
                                {record.class_name || record.className || 'Unknown Class'}
                              </div>
                              <div className="text-sm text-slate-600">
                                {record.subject || 'Subject N/A'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                            <div>
                              <div className="text-xs text-slate-500">Status</div>
                              <div className={`font-semibold ${statusTextColor} capitalize`}>
                                {record.attendance_status || 'N/A'}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs text-slate-500">Tracking Method</div>
                              <div className="font-medium text-slate-700 capitalize">
                                {record.source ? record.source.replace(/_/g, ' ') : 'N/A'}
                              </div>
                            </div>
                            
                            {record.join_time && (
                              <div>
                                <div className="text-xs text-slate-500">Join Time</div>
                                <div className="font-medium text-slate-700">
                                  {new Date(record.join_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <div className="text-xs text-slate-500">Leave Time</div>
                              <div className="font-medium text-slate-700">
                                {record.leave_time ? new Date(record.leave_time).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'Not recorded'}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs text-slate-500">Duration</div>
                              <div className="font-medium text-slate-700">
                                {(record.duration_minutes !== undefined && record.duration_minutes !== null) 
                                  ? `${record.duration_minutes} minutes` 
                                  : 'Not recorded'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {selectedDayAttendance.length} class{selectedDayAttendance.length !== 1 ? 'es' : ''} attended
              </div>
              <button
                onClick={closeDetailView}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {attendanceData.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-b-lg">
          <FaCalendarAlt className="text-6xl text-slate-300 mx-auto mb-4" />
          <div className="text-slate-500 text-lg font-medium">No attendance records found</div>
          <div className="text-slate-400 text-sm mt-2">Attendance will appear here once the student starts attending classes</div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
