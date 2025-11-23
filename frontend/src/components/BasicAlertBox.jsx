import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaTimesCircle } from 'react-icons/fa';

/**
 * ModernAlertBox - A modern, industry-standard alert/confirmation box component.
 * Props:
 *  - open: boolean (show/hide)
 *  - message: string (main message)
 *  - title: string (optional title)
 *  - onConfirm: function (called on confirm/OK)
 *  - onCancel: function (called on cancel, only for confirmation)
 *  - confirmText: string (button text, default 'OK')
 *  - cancelText: string (button text, optional)
 *  - type: 'info' | 'success' | 'warning' | 'danger' (theme)
 *  - autoClose: boolean (auto close after 3 seconds, default false)
 *  - showCloseButton: boolean (show X button, default true)
 *
 * Usage:
 * <ModernAlertBox open={open} message="..." onConfirm={...} onCancel={...} confirmText="OK" cancelText="Cancel" type="success" />
 */

const theme = {
  info: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    btnBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    btnCancel: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
    iconComponent: FaInfoCircle,
  },
  success: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    text: 'text-green-800',
    icon: 'text-green-500',
    btnBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    btnCancel: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
    iconComponent: FaCheckCircle,
  },
  warning: {
    border: 'border-yellow-200',
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    btnBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    btnCancel: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
    iconComponent: FaExclamationTriangle,
  },
  danger: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-800',
    icon: 'text-red-500',
    btnBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    btnCancel: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
    iconComponent: FaTimesCircle,
  },
};

const ModernAlertBox = ({
  open,
  message,
  title,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = '',
  type = 'info',
  autoClose = false,
  showCloseButton = true,
}) => {
  const t = theme[type] || theme.info;
  const IconComponent = t.iconComponent;

  // Auto close functionality
  useEffect(() => {
    if (open && autoClose && onConfirm) {
      const timer = setTimeout(() => {
        onConfirm();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, onConfirm]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open && onConfirm) {
        onConfirm();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onCancel || onConfirm}
      />
      
      {/* Alert Box */}
      <div className="relative w-full max-w-md transform transition-all duration-300 ease-out">
        <div className={`relative rounded-xl shadow-2xl border ${t.border} ${t.bg} overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center space-x-3">
              <IconComponent className={`text-xl ${t.icon}`} />
              {title && (
                <h3 className={`text-lg font-semibold ${t.text}`}>
                  {title}
                </h3>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onCancel || onConfirm}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
              >
                <FaTimes size={16} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className={`text-sm leading-relaxed ${t.text}`}>
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6">
            {cancelText && (
              <button
                onClick={onCancel}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${t.btnCancel}`}
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${t.btnBg}`}
            >
              {confirmText}
            </button>
          </div>

          {/* Auto-close progress bar */}
          {autoClose && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div 
                className={`h-full ${t.icon.replace('text-', 'bg-')} transition-all duration-3000 ease-linear`}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Keep the old component name for backward compatibility
const BasicAlertBox = ModernAlertBox;

export default BasicAlertBox;
export { ModernAlertBox };
