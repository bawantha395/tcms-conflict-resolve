import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * RevenueChart Component
 * Displays revenue trends over time with a line chart
 */
const RevenueChart = ({ data = [], loading = false }) => {
  
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>No revenue data available</p>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.find(p => p.dataKey === 'revenue')?.value || 0;
      const online = payload.find(p => p.dataKey === 'online')?.value || 0;
      const cash = payload.find(p => p.dataKey === 'cash')?.value || 0;
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-green-600">
              Total: <span className="font-semibold">Rs. {total.toLocaleString()}</span>
            </p>
            <p className="text-sm text-blue-600">
              Online: <span className="font-semibold">Rs. {online.toLocaleString()}</span>
            </p>
            <p className="text-sm text-orange-600">
              Cash: <span className="font-semibold">Rs. {cash.toLocaleString()}</span>
            </p>
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
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly revenue breakdown over the last 12 months</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Total</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Online</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Cash</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
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
            tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            name="Total Revenue"
            stroke="#10B981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
          <Area 
            type="monotone" 
            dataKey="online" 
            name="Online Revenue"
            stroke="#3B82F6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorOnline)" 
          />
          <Area 
            type="monotone" 
            dataKey="cash" 
            name="Cash Revenue"
            stroke="#F97316" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorCash)" 
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
          <p className="text-lg font-bold text-green-600">
            Rs. {data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Online</p>
          <p className="text-lg font-bold text-blue-600">
            Rs. {data.reduce((sum, item) => sum + (item.online || 0), 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Cash</p>
          <p className="text-lg font-bold text-orange-600">
            Rs. {data.reduce((sum, item) => sum + (item.cash || 0), 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Peak Month</p>
          <p className="text-lg font-bold text-gray-900">
            {data.reduce((max, item) => item.revenue > max.revenue ? item : max, data[0])?.month || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
