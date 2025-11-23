import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, FaClock, FaUsers, FaChartLine, FaCheckCircle, 
  FaExclamationTriangle, FaTimesCircle, FaTimes, FaMousePointer
} from 'react-icons/fa';
import { getMonthlyAttendance, getJoinButtonClicks } from '../../api/attendance';

const MonthlyAttendanceReport = ({ classId, onClose }) => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchMonthlyAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching monthly attendance for:', { classId, selectedYear, selectedMonth });
      
      // Fetch both attendance data and join clicks data
      const [attendanceData, joinClicksData] = await Promise.all([
        getMonthlyAttendance(classId, selectedYear, selectedMonth),
        getJoinButtonClicks(classId, null, `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`, 
                          new Date(selectedYear, selectedMonth, 0).toISOString().slice(0, 10))
      ]);
      
      console.log('Monthly attendance data received:', attendanceData);
      console.log('Join clicks data received:', joinClicksData);
      
      // Combine the data
      const combinedData = {
        ...attendanceData,
        joinClicks: joinClicksData
      };
      
      setAttendanceData(combinedData);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch monthly attendance data';
      setError(errorMessage);
      console.error('Error fetching monthly attendance:', {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        classId,
        selectedYear,
        selectedMonth
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchMonthlyAttendance();
    }
  }, [classId, selectedYear, selectedMonth]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <FaCheckCircle className="h-4 w-4 text-green-500" />;
      case 'late':
        return <FaExclamationTriangle className="h-4 w-4 text-yellow-500" />;
      case 'absent':
        return <FaTimesCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300"></div>;
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading monthly attendance...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaCalendarAlt className="h-6 w-6 mr-2" />
              Monthly Attendance Report - Class {classId}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>

          {/* Month/Year Selector */}
          <div className="flex space-x-4 mt-4">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {monthNames.map((month, index) => (
                <option key={index + 1} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={fetchMonthlyAttendance}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : attendanceData && (attendanceData.success || (attendanceData.joinClicks?.success && attendanceData.joinClicks?.summary?.total_clicks > 0)) ? (
          <div className="p-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaCalendarAlt className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Class Days</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {attendanceData.summary.total_class_days}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaUsers className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Total Students</p>
                    <p className="text-2xl font-bold text-green-900">
                      {attendanceData.summary.unique_students}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaChartLine className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">Attendance Records</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {attendanceData.summary.total_student_attendances}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaMousePointer className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">Join Clicks</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {attendanceData.joinClicks?.summary?.total_clicks || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FaClock className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">One per Day</p>
                    <p className="text-lg font-bold text-purple-900">✓ Enforced</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Attendance Overview - Only show if there are attendance records */}
            {attendanceData.summary.total_student_attendances > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Daily Attendance Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attendanceData.daily_attendance.map((day, index) => (
                  <div key={index} className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{day.date}</span>
                      <span className="text-sm text-gray-500">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.day_of_week - 1]}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex items-center text-green-600">
                        <FaCheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">{day.present}</span>
                      </div>
                      <div className="flex items-center text-yellow-600">
                        <FaExclamationTriangle className="h-4 w-4 mr-1" />
                        <span className="text-sm">{day.late}</span>
                      </div>
                      <div className="flex items-center text-red-600">
                        <FaTimesCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">{day.absent}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Student Summary - Only show if there are attendance records */}
            {attendanceData.summary.total_student_attendances > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Student Attendance & Engagement Summary</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance Days</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Absent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Join Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(attendanceData.student_summary).map(([studentId, summary]) => {
                      const clickData = attendanceData.joinClicks?.student_summary?.find(s => s.student_id === studentId);
                      return (
                        <tr key={studentId}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {summary.student_name || studentId}
                              </div>
                              <div className="text-sm text-gray-500">{studentId}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {summary.total_days}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaCheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm text-gray-900">{summary.present_days}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaExclamationTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="text-sm text-gray-900">{summary.late_days}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaTimesCircle className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-sm text-gray-900">{summary.absent_days}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaMousePointer className="h-4 w-4 text-orange-500 mr-1" />
                              <span className="text-sm text-gray-900">
                                {clickData?.click_count || 0}
                              </span>
                              {clickData?.click_count > summary.total_days && (
                                <span className="ml-1 text-xs text-orange-600">
                                  ({clickData.click_count - summary.total_days} extra)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAttendanceColor(summary.attendance_percentage)}`}>
                              {summary.attendance_percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Message when no attendance records but there are join clicks */}
            {attendanceData.summary.total_student_attendances === 0 && attendanceData.joinClicks?.success && attendanceData.joinClicks?.summary?.total_clicks > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <FaMousePointer className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Join Clicks Detected</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Students have clicked the "Join Meeting" button {attendanceData.joinClicks.summary.total_clicks} times, 
                      but no attendance records have been created yet. Attendance records are created when students 
                      successfully join and participate in class sessions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Join Button Click Details */}
            {attendanceData.joinClicks?.success && attendanceData.joinClicks.detailed_clicks?.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Join Button Click History</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Total Clicks</div>
                      <div className="text-xl font-bold text-orange-600">
                        {attendanceData.joinClicks.summary.total_clicks}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Days with Clicks</div>
                      <div className="text-xl font-bold text-blue-600">
                        {attendanceData.joinClicks.summary.days_with_clicks}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-sm font-medium text-gray-600">Students Clicked</div>
                      <div className="text-xl font-bold text-green-600">
                        {attendanceData.joinClicks.summary.unique_students}
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full bg-white border border-gray-200 rounded">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Student</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Click Time</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Browser</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {attendanceData.joinClicks.detailed_clicks.slice(0, 20).map((click, index) => (
                          <tr key={click.id || index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium text-gray-900">{click.student_name}</div>
                              <div className="text-xs text-gray-500">{click.student_id}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">
                              {new Date(click.click_time).toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {click.user_agent ? click.user_agent.split(' ')[0] : 'Unknown'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {attendanceData.joinClicks.detailed_clicks.length > 20 && (
                      <div className="text-center py-2 text-sm text-gray-500">
                        Showing 20 of {attendanceData.joinClicks.detailed_clicks.length} clicks
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Summary */}
            {attendanceData.weekly_summary.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Weekly Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {attendanceData.weekly_summary.map((week) => (
                    <div key={week.week} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="text-lg font-semibold text-gray-800 mb-2">
                        Week {week.week}
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {week.days_with_classes} class day(s)
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">Present:</span>
                          <span>{week.present}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Late:</span>
                          <span>{week.late}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Absent:</span>
                          <span>{week.absent}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No attendance data available for the selected month.
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyAttendanceReport;
