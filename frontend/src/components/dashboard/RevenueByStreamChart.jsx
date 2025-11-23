import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * RevenueByStreamChart Component
 * Displays revenue breakdown by class/subject
 */
const RevenueByStreamChart = ({ data = [], loading = false }) => {
  
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Class/Subject</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No revenue data available</p>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <p className="text-sm text-green-600">
            Revenue: <span className="font-semibold">Rs. {payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600">
            Share: <span className="font-semibold">{payload[0].payload.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Revenue by Class/Subject</h3>
        <p className="text-sm text-gray-500 mt-1">Top 10 revenue-generating classes</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          layout="horizontal"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11 }}
            stroke="#9CA3AF"
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#9CA3AF"
            tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            name="Revenue"
            fill="#10B981" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Top Class</p>
          <p className="text-sm font-bold text-gray-900 truncate">
            {data[0]?.name || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Top Revenue</p>
          <p className="text-lg font-bold text-green-600">
            Rs. {(data[0]?.value || 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Share</p>
          <p className="text-lg font-bold text-blue-600">
            {data[0]?.percentage || 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueByStreamChart;
