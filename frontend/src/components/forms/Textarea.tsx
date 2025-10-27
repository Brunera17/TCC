import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  error,
  variant = 'default',
  size = 'md',
  disabled,
  ...props
}, ref) => {
  const baseClasses = cn(
    'w-full transition-colors duration-200 focus:outline-none resize-none',
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
    <textarea
      ref={ref}
      className={cn(baseClasses, className)}
      disabled={disabled}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
