import React from 'react';
import { FaExclamationTriangle, FaTruck, FaShieldAlt, FaExclamationCircle, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

/**
 * AlertCard Component
 * Displays critical alerts and issues that require attention
 */
const AlertCard = ({ 
  title, 
  count, 
  description, 
  severity = 'warning', // 'warning', 'danger', 'info'
  icon: Icon,
  actionText = 'View Details',
  actionLink,
  loading = false 
}) => {
  const navigate = useNavigate();

  const severityStyles = {
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800',
      button: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800',
      button: 'bg-red-100 text-red-700 hover:bg-red-200'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800',
      button: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    }
  };

  const styles = severityStyles[severity] || severityStyles.warning;

  const handleAction = () => {
    if (actionLink) {
      navigate(actionLink);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.bg} ${styles.border} border-l-4 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${styles.icon} bg-white`}>
            {Icon ? <Icon className="w-5 h-5" /> : <FaExclamationTriangle className="w-5 h-5" />}
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styles.badge}`}>
                  {count}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">{description}</p>
          </div>
        </div>
        
        {/* Action button */}
        {actionLink && (
          <button
            onClick={handleAction}
            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium ${styles.button} flex items-center gap-1 transition-colors duration-200`}
          >
            {actionText}
            <FaChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * AlertsGrid Component
 * Displays a grid of alert cards
 */
const AlertsGrid = ({ alerts = [], loading = false, layout = 'grid' }) => {
  if (loading) {
    return (
      <div className={layout === 'stack' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}>
        {[1, 2, 3, 4].map(i => (
          <AlertCard key={i} loading={true} />
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-green-100 rounded-full">
            <FaShieldAlt className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="text-lg font-semibold text-green-900">All Clear!</h4>
          <p className="text-sm text-green-700">No critical issues at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className={layout === 'stack' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
      {alerts.map((alert, index) => (
        <AlertCard key={index} {...alert} />
      ))}
    </div>
  );
};

export { AlertCard, AlertsGrid };
export default AlertCard;
