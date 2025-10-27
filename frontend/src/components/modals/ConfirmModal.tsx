import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../forms/Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'danger';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    confirmVariant: 'primary' as const
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    confirmVariant: 'secondary' as const
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    confirmVariant: 'primary' as const
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    confirmVariant: 'danger' as const
  }
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={false}
    >
      <div className="text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${config.bgColor} mb-4`}>
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>

        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>

        <div className="flex justify-center space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>

          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
