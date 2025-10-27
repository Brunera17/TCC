import React from 'react';

interface IconButtonProps {
  icon: React.ElementType;
  label?: string;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  title
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: label ? 'px-2 py-1 text-xs' : 'p-1',
    md: label ? 'px-3 py-2 text-sm' : 'p-2',
    lg: label ? 'px-4 py-2 text-base' : 'p-3'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <Icon className={`${iconSizes[size]} ${label ? 'mr-2' : ''}`} />
      {label && <span>{label}</span>}
    </button>
  );
};