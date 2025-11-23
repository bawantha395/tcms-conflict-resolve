import React from 'react';

const CustomSelectField = ({
  id,
  name,
  label,
  value,
  onChange,
  options,
  error,
  touched,
  required = false,
  className = '',
  ...rest
}) => (
  <div className="flex flex-col mb-2">
    {label && (
      <label htmlFor={id || name} className="text-xs font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
    )}
    <select
      id={id || name}
      name={name}
      value={value}
      onChange={onChange}
      className={`border rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      style={{ borderColor: '#1a365d', borderWidth: '2px' }}
      required={required}
      {...rest}
    >
      {options.map(opt => (
        <option key={opt.key || opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && touched && (
      <span className="text-red-500 text-[10px] mt-1">{error}</span>
    )}
  </div>
);

export default CustomSelectField;
