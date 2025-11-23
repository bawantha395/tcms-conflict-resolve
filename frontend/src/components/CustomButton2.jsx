import React from 'react';

const CustomButton2 = ({ children, color = 'mint', className = '', ...props }) => {
  const colorClasses = color === 'danger'
    ? 'bg-red-500 text-white hover:bg-red-600'
    : 'bg-[#2a9d8f] text-white hover:bg-[#21867a]';
  return (
    <button
      className={`w-full py-1.5 px-3 rounded-md font-semibold text-sm shadow-md border border-[#21867a]/20 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2a9d8f] focus:ring-opacity-50 ${colorClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default CustomButton2; 