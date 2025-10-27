import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  className = '',
  variant = 'error'
}) => {
  if (!message) return null;

  const variantStyles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  return (
    <div className={`p-3 rounded-lg border flex items-start space-x-2 ${variantStyles[variant]} ${className}`}>
      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <pre className="text-sm whitespace-pre-wrap font-sans">{message}</pre>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-current hover:opacity-70 transition-opacity"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};