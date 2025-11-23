import React from 'react';
import { FaClock, FaCalendarAlt, FaFire } from 'react-icons/fa';

/**
 * ClassScheduleHeatmap Component
 * Displays busy vs slow time periods in a visual heatmap
 */
const ClassScheduleHeatmap = ({ data = [], loading = false }) => {
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    { label: '6AM-9AM', value: 'morning' },
    { label: '9AM-12PM', value: 'midMorning' },
    { label: '12PM-3PM', value: 'afternoon' },
    { label: '3PM-6PM', value: 'evening' },
    { label: '6PM-9PM', value: 'night' }
  ];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Default data structure if no data provided
  const scheduleData = data.length > 0 ? data : days.map(day => ({
    day,
    morning: 0,
    midMorning: 0,
    afternoon: 0,
    evening: 0,
    night: 0
  }));

  // Find max value for intensity calculation
  const allValues = scheduleData.flatMap(day => 
    timeSlots.map(slot => day[slot.value] || 0)
  );
  const maxValue = Math.max(...allValues, 1);

  // Get color intensity based on value
  const getIntensityColor = (value) => {
    if (!value || value === 0) return 'bg-gray-100 text-gray-400';
    const intensity = value / maxValue;
    if (intensity > 0.8) return 'bg-red-600 text-white';
    if (intensity > 0.6) return 'bg-orange-500 text-white';
    if (intensity > 0.4) return 'bg-yellow-400 text-gray-900';
    if (intensity > 0.2) return 'bg-green-400 text-gray-900';
    return 'bg-blue-300 text-gray-900';
  };

  // Get activity label
  const getActivityLevel = (value) => {
    if (!value || value === 0) return 'None';
    const intensity = value / maxValue;
    if (intensity > 0.8) return 'Peak';
    if (intensity > 0.6) return 'Busy';
    if (intensity > 0.4) return 'Moderate';
    if (intensity > 0.2) return 'Light';
    return 'Low';
  };

  // Calculate peak times
  const busiestSlot = timeSlots.reduce((busiest, slot) => {
    const total = scheduleData.reduce((sum, day) => sum + (day[slot.value] || 0), 0);
    return total > busiest.total ? { slot: slot.label, total } : busiest;
  }, { slot: '', total: 0 });

  const busiestDay = scheduleData.reduce((busiest, day) => {
    const total = timeSlots.reduce((sum, slot) => sum + (day[slot.value] || 0), 0);
    return total > busiest.total ? { day: day.day, total } : busiest;
  }, { day: '', total: 0 });

  const totalClasses = scheduleData.reduce((sum, day) => 
    sum + timeSlots.reduce((daySum, slot) => daySum + (day[slot.value] || 0), 0), 0
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FaCalendarAlt className="text-purple-600" />
          Class Schedule Heatmap
        </h3>
        <p className="text-sm text-gray-500 mt-1">Busy vs slow time periods</p>
      </div>
      
      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header Row - Time Slots */}
          <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-2 mb-2">
            <div className="text-xs font-semibold text-gray-600 flex items-center">
              <FaClock className="mr-1" /> Time / Day
            </div>
            {timeSlots.map(slot => (
              <div key={slot.value} className="text-xs font-semibold text-gray-600 text-center">
                {slot.label}
              </div>
            ))}
          </div>

          {/* Data Rows - Days */}
          {scheduleData.map((dayData, dayIndex) => (
            <div key={dayIndex} className="grid grid-cols-[120px_repeat(5,1fr)] gap-2 mb-2">
              <div className="text-sm font-medium text-gray-700 flex items-center py-2">
                {dayData.day}
              </div>
              {timeSlots.map(slot => {
                const value = dayData[slot.value] || 0;
                return (
                  <div
                    key={slot.value}
                    className={`rounded-lg p-2 text-center transition-all duration-200 hover:scale-105 cursor-pointer ${getIntensityColor(value)}`}
                    title={`${dayData.day} ${slot.label}: ${value} class${value !== 1 ? 'es' : ''} - ${getActivityLevel(value)}`}
                  >
                    <div className="text-lg font-bold">{value}</div>
                    <div className="text-[10px] opacity-75 mt-0.5 uppercase tracking-wide">{getActivityLevel(value)}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-2">Activity Level:</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span className="text-xs text-gray-600">None</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <span className="text-xs text-gray-600">Light</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span className="text-xs text-gray-600">Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span className="text-xs text-gray-600">Busy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs text-gray-600">Very Busy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span className="text-xs text-gray-600">Peak</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Classes</p>
          <p className="text-lg font-bold text-gray-900">
            {totalClasses}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <FaFire className="text-orange-500" /> Peak Time
          </p>
          <p className="text-sm font-bold text-orange-600">
            {busiestSlot.slot}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Busiest Day</p>
          <p className="text-sm font-bold text-blue-600">
            {busiestDay.day}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClassScheduleHeatmap;
