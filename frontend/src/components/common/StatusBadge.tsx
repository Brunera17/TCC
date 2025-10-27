import type {
  StatusProposta
} from '../../utils/statusColors';
import {
  getStatusConfig,
  getStatusClasses,
  getStatusIcon,
  normalizeStatus
} from '../../utils/statusColors';

// ✅ Interface para StatusBadge de Propostas
interface StatusBadgeProps {
  status: StatusProposta | string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// ✅ Interface para StatusBadge Genérico (compatibilidade)
interface GenericStatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

// ✅ Componente Principal: StatusBadge para Propostas
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  icon,
  size = 'md',
  showIcon = true,
  showTooltip = true,
  className = ''
}) => {
  // Normalizar status para garantir compatibilidade
  const normalizedStatus = normalizeStatus(status);
  const config = getStatusConfig(normalizedStatus);
  const classes = getStatusClasses(normalizedStatus, size);
  const IconComponent = getStatusIcon(normalizedStatus);

  const badgeContent = (
    <span className={`inline-flex items-center rounded-full font-medium border ${classes.base} ${className}`}>
      {showIcon && (
        <span className="mr-1.5">
          {icon || <IconComponent className={classes.icon} />}
        </span>
      )}
      {children || config.label}
    </span>
  );

  if (showTooltip) {
    return (
      <span
        title={config.description}
        className="cursor-help"
      >
        {badgeContent}
      </span>
    );
  }

  return badgeContent;
};

// ✅ Componente de Compatibilidade: StatusBadge Genérico
export const GenericStatusBadge: React.FC<GenericStatusBadgeProps> = ({
  status,
  children,
  icon,
  size = 'md'
}) => {
  const styles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-orange-100 text-orange-800 border-orange-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-custom-blue-light text-custom-blue-dark border-custom-blue',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${styles[status]} ${sizeClasses[size]}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
};
