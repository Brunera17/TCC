import React from 'react';

interface FormFieldProps {
  label: string;
  icon?: React.ElementType;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  className = '',
  rows
}) => {
  const inputId = `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  
  const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors disabled:bg-gray-50 disabled:text-gray-500`;
  const inputClasses = `${baseInputClasses} ${
    Icon ? 'pl-10' : ''
  } ${
    error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
  }`;

  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className={className}>
      <label 
        htmlFor={inputId}
        className={`block text-sm font-medium text-gray-700 mb-1 ${
          required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
        }`}
      >
        {label}
      </label>
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <InputComponent
          id={inputId}
          type={type === 'textarea' ? undefined : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={inputClasses}
        />
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};