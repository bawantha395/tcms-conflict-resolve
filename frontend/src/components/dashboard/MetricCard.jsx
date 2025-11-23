import React from 'react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

/**
 * MetricCard Component
 * Displays a single metric with icon, value, trend, and subtitle
 */
const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle, 
  trend, 
  trendLabel,
  color = 'blue',
  loading = false 
}) => {
  
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      trend: 'text-green-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      trend: 'text-purple-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      trend: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      trend: 'text-red-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      trend: 'text-indigo-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  const getTrendIcon = () => {
    if (trend === null || trend === undefined) return <FaMinus className="w-3 h-3" />;
    if (trend > 0) return <FaArrowUp className="w-3 h-3" />;
    if (trend < 0) return <FaArrowDown className="w-3 h-3" />;
    return <FaMinus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend === null || trend === undefined) return 'text-gray-500';
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-9 w-9 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-7 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-gray-600 leading-tight">{title}</h3>
        <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
          {Icon && <Icon className={`w-5 h-5 ${colors.icon}`} />}
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        
        {subtitle && (
          <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>
        )}
        
        {(trend !== null && trend !== undefined) && (
          <div className="flex items-center gap-1 mt-2">
            <span className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(trend)}%</span>
            </span>
            {trendLabel && (
              <span className="text-xs text-gray-500 ml-1">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
