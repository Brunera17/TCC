import React from 'react';

interface CardProps {
  title?: string;
  value?: string | number;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'metric' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  title,
  value,
  children,
  className = '',
  icon: Icon,
  variant = 'default'
}) => {
  const baseClasses = 'rounded-lg shadow-sm transition-shadow';
  
  const variantClasses = {
    default: 'bg-white border border-gray-200 p-6',
    metric: 'bg-white border border-gray-200 p-6 hover:shadow-md',
    bordered: 'bg-white border-2 border-gray-100 p-6 hover:border-blue-200'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="h-5 w-5 text-gray-600" />}
            {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
          </div>
        </div>
      )}
      
      {value !== undefined && (
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      )}
      
      {children && (
        <div className="text-gray-600">
          {children}
        </div>
      )}
    </div>
  );
};