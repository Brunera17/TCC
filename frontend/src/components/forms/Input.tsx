import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  error,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  disabled,
  ...props
}, ref) => {
  const baseClasses = cn(
    'w-full transition-colors duration-200 focus:outline-none',
    'placeholder:text-gray-400',
    {
      // Variants
      'border border-gray-300 bg-white focus:border-custom-blue focus:ring-2 focus:ring-custom-blue/20': variant === 'default',
      'border-0 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-custom-blue/20': variant === 'filled',
      'border-2 border-gray-200 bg-transparent focus:border-custom-blue': variant === 'outline',

      // Sizes
      'px-3 py-2 text-sm': size === 'sm',
      'px-4 py-2.5 text-base': size === 'md',
      'px-4 py-3 text-lg': size === 'lg',

      // States
      'opacity-50 cursor-not-allowed': disabled,
      'border-red-500 focus:border-red-500 focus:ring-red-500/20': error,
    }
  );

  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          baseClasses,
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          className
        )}
        disabled={disabled}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {rightIcon}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
