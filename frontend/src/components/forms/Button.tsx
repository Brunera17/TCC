import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// Interface atualizada para incluir todas as variantes do seu design system
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'link' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  ...props
}, ref) => {
  
  // Base classes padronizadas do seu buttonStyles.ts
  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  return (
    <button
      ref={ref}
      className={cn(
        baseClasses,
        {
          // Variants padronizadas (copiadas de src/styles/components/buttonStyles.ts)
          'bg-custom-blue text-white hover:bg-custom-blue-light focus:ring-blue-500 shadow-sm': variant === 'primary',
          'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500 shadow-sm': variant === 'secondary',
          'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm': variant === 'success',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm': variant === 'danger',
          'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500': variant === 'warning',
          'text-gray-700 hover:bg-gray-100 focus:ring-gray-500': variant === 'ghost',
          'text-blue-600 hover:text-blue-800 focus:ring-blue-500 underline-offset-4 hover:underline': variant === 'link',
          'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 focus:ring-blue-500': variant === 'outline',

          // Sizes padronizados (copiados de src/styles/components/buttonStyles.ts)
          'px-2 py-1 text-xs': size === 'xs',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md', // Corrigido (era text-base)
          'px-6 py-3 text-base': size === 'lg', // Corrigido (era text-lg)
          'px-8 py-4 text-lg': size === 'xl',
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {/* Lógica de ícones (mantida como estava, pois estava correta) */}
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {!loading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';