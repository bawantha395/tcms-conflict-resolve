import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * StudentEnrollmentChart Component
 * Displays student enrollment trends with breakdown by registration type
 */
const StudentEnrollmentChart = ({ data = [], loading = false }) => {
  
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

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Enrollment Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No enrollment data available</p>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const online = payload.find(p => p.dataKey === 'online')?.value || 0;
      const physical = payload.find(p => p.dataKey === 'physical')?.value || 0;
      const cumulativeTotal = payload.find(p => p.dataKey === 'cumulativeTotal')?.value || 0;
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              New Enrollments: <span className="font-semibold">{online + physical}</span>
            </p>
            <p className="text-sm text-green-600">
              Online: <span className="font-semibold">{online}</span>
            </p>
            <p className="text-sm text-purple-600">
              Physical: <span className="font-semibold">{physical}</span>
            </p>
            <div className="border-t border-gray-200 my-1 pt-1">
              <p className="text-sm text-gray-900 font-semibold">
                Total Students: <span className="font-bold">{cumulativeTotal}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Student Enrollment Trends</h3>
          <p className="text-sm text-gray-500 mt-1">New enrollments and cumulative total over the last 12 months</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Online</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">Physical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Total Students</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="#9CA3AF"
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="#9CA3AF"
            allowDecimals={false}
            label={{ value: 'New Enrollments', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="#3B82F6"
            allowDecimals={false}
            label={{ value: 'Total Students', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar 
            yAxisId="left"
            dataKey="online" 
            name="Online Registrations"
            fill="#10B981" 
            radius={[8, 8, 0, 0]}
            stackId="a"
          />
          <Bar 
            yAxisId="left"
            dataKey="physical" 
            name="Physical Registrations"
            fill="#8B5CF6" 
            radius={[8, 8, 0, 0]}
            stackId="a"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="cumulativeTotal" 
            name="Total Students"
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">New Enrollments</p>
          <p className="text-lg font-bold text-gray-900">
            {data.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Online Reg.</p>
          <p className="text-lg font-bold text-green-600">
            {data.reduce((sum, item) => sum + item.online, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Physical Reg.</p>
          <p className="text-lg font-bold text-purple-600">
            {data.reduce((sum, item) => sum + item.physical, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Current Total</p>
          <p className="text-lg font-bold text-blue-600">
            {data.length > 0 ? data[data.length - 1].cumulativeTotal.toLocaleString() : '0'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentEnrollmentChart;
