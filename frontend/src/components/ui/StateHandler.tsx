import React from 'react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface StateHandlerProps {
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
  onErrorDismiss?: () => void;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
}

export const StateHandler: React.FC<StateHandlerProps> = ({
  loading,
  error,
  children,
  onErrorDismiss,
  emptyState,
  isEmpty = false
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        onDismiss={onErrorDismiss}
        className="mb-4"
      />
    );
  }

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
};