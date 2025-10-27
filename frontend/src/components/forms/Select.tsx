import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  error?: string;
  variant?: 'default' | 'filled' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  className,
  options,
  error,
  variant = 'default',
  size = 'md',
  disabled,
  placeholder,
  onChange,
  value,
  ...props
}, ref) => {
  const baseClasses = cn(
    'w-full appearance-none transition-colors duration-200 focus:outline-none',
    'bg-no-repeat bg-right',
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(baseClasses, 'pr-10', className)}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
});

Select.displayName = 'Select';
