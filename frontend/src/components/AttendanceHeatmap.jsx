import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const AttendanceHeatmap = ({ classData }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  if (!classData || !classData.data || classData.data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{classData?.className || 'Class'}</h3>
            {classData?.grade && classData?.subject && (
              <p className="text-sm text-gray-600">Grade {classData.grade} - {classData.subject}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm">No attendance data available</p>
        </div>
      </div>
    );
  }

  // Get calendar data for the selected month
  const getMonthCalendarData = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const calendarData = [];
    
    // Create a map of attendance data by date
    const attendanceMap = {};
    classData.data.forEach(record => {
      attendanceMap[record.date] = record;
    });

    let dayCounter = 1;
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        if (week === 0 && day < startDayOfWeek) {
          // Empty cells before month starts
          calendarData.push({ week, day, value: null, date: null });
        } else if (dayCounter <= daysInMonth) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
          const attendance = attendanceMap[dateStr];
          
          calendarData.push({
            week,
            day,
            value: attendance ? attendance.uniqueStudents : 0,
            intensity: attendance ? attendance.intensity : 0,
            date: dateStr,
            dayNum: dayCounter,
            count: attendance ? attendance.count : 0
          });
          dayCounter++;
        } else {
          // Empty cells after month ends
          calendarData.push({ week, day, value: null, date: null });
        }
      }
    }

    return calendarData.filter(d => d.value !== null || d.date !== null);
  };

  const calendarData = getMonthCalendarData();

  // Color scheme for intensity levels
  const getColor = (intensity) => {
    const colors = {
      0: '#f3f4f6', // gray-100 - no attendance
      1: '#bfdbfe', // blue-200 - low
      2: '#60a5fa', // blue-400 - medium-low
      3: '#3b82f6', // blue-500 - medium
      4: '#1e40af', // blue-700 - high
    };
    return colors[intensity] || colors[0];
  };

  const previousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const now = new Date();
    if (selectedMonth.getMonth() < now.getMonth() || selectedMonth.getFullYear() < now.getFullYear()) {
      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
    }
  };

  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonth = selectedMonth.getMonth() === new Date().getMonth() && 
                         selectedMonth.getFullYear() === new Date().getFullYear();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{classData.className}</h3>
          {classData.grade && classData.subject && (
            <p className="text-sm text-gray-600">Grade {classData.grade} - {classData.subject}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <FaChevronLeft className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
            <FaCalendarAlt className="text-blue-600" />
            <span className="font-medium text-gray-900">{monthName}</span>
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`p-2 rounded-lg transition-colors ${
              isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'
            }`}
            aria-label="Next month"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarData.map((cell, index) => (
            <div
              key={index}
              className="relative aspect-square group"
            >
              {cell.date ? (
                <div
                  className="w-full h-full rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-pointer flex flex-col items-center justify-center"
                  style={{ backgroundColor: getColor(cell.intensity) }}
                >
                  <span className={`text-sm font-medium ${cell.intensity > 2 ? 'text-white' : 'text-gray-700'}`}>
                    {cell.dayNum}
                  </span>
                  {cell.value > 0 && (
                    <span className={`text-xs ${cell.intensity > 2 ? 'text-blue-100' : 'text-blue-600'}`}>
                      {cell.value}
                    </span>
                  )}
                  
                  {/* Tooltip on hover */}
                  {cell.value > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                        <div className="font-semibold">{new Date(cell.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        <div>{cell.value} student{cell.value !== 1 ? 's' : ''}</div>
                        <div>{cell.count} attendance{cell.count !== 1 ? 's' : ''}</div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-transparent"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Attendance Level:</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-6 h-6 rounded"
                style={{ backgroundColor: getColor(level) }}
                title={`Level ${level}`}
              />
            ))}
            <span className="text-xs text-gray-500">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
