import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

/**
 * StudentGrowthChart Component
 * Displays cumulative student growth over time
 */
const StudentGrowthChart = ({ data = [], loading = false }) => {
  
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Growth Over Time</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No growth data available</p>
        </div>
      </div>
    );
  }

  // Calculate growth metrics
  const currentTotal = data[data.length - 1]?.cumulativeTotal || 0;
  const previousTotal = data[data.length - 2]?.cumulativeTotal || 0;
  const growthRate = previousTotal > 0 ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1) : 0;
  const totalGrowth = currentTotal - (data[0]?.cumulativeTotal || 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Total Students: <span className="font-semibold">{payload[0].value}</span>
            </p>
            {payload[0].payload.newStudents && (
              <p className="text-sm text-green-600">
                New This Month: <span className="font-semibold">+{payload[0].payload.newStudents}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Student Growth Over Time</h3>
        <p className="text-sm text-gray-500 mt-1">Cumulative student enrollment trends</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
          data={data} 
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            stroke="#9CA3AF"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#9CA3AF"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="cumulativeTotal" 
            stroke="#3B82F6" 
            strokeWidth={3}
            fill="url(#colorStudents)" 
            name="Total Students"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Current Total</p>
          <p className="text-lg font-bold text-blue-600">
            {currentTotal.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Growth Rate</p>
          <p className={`text-lg font-bold ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growthRate >= 0 ? '+' : ''}{growthRate}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Growth</p>
          <p className="text-lg font-bold text-purple-600">
            +{totalGrowth.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentGrowthChart;
