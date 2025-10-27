import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  helpText?: string;
  disabled?: boolean;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(({
  label,
  children,
  error,
  required = false,
  className = '',
  helpText,
  disabled = false
}, ref) => (
  <div ref={ref} className={cn('space-y-2', className)}>
    <label className={cn(
      'block text-sm font-medium',
      disabled ? 'text-gray-400' : 'text-gray-700'
    )}>
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {helpText && !error && (
      <p className="text-sm text-gray-500">{helpText}</p>
    )}
    {error && (
      <p className="text-sm text-red-600 flex items-center">
        <span className="mr-1">⚠</span>
        {error}
      </p>
    )}
  </div>
));

FormField.displayName = 'FormField';
