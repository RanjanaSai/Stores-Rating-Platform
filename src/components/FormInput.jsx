import React from 'react';

function FormInput({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  error, 
  placeholder,
  required = false,
  maxLength,
  minLength,
  ...props 
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        minLength={minLength}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors
          ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default FormInput;
