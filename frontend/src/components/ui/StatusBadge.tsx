import React from 'react';
import { Check, Clock, Send, X, Ban, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalizedStatus = status.toLowerCase();

  const statusConfig = {
    aprovada: {
      icon: Check,
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Aprovada'
    },
    rascunho: {
      icon: AlertCircle,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Rascunho'
    },
    enviada: {
      icon: Send,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Enviada'
    },
    rejeitada: {
      icon: X,
      className: 'bg-red-100 text-red-800 border-red-200',
      label: 'Rejeitada'
    },
    cancelada: {
      icon: Ban,
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Cancelada'
    },
    pendente: {
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Pendente'
    },
    ativo: {
      icon: Check,
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Ativo'
    },
    inativo: {
      icon: X,
      className: 'bg-red-100 text-red-800 border-red-200',
      label: 'Inativo'
    },
    concluida: {
      icon: Check,
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Concluída'
    },
    'em andamento': {
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Em Andamento'
    }
  };

  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || {
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    label: status
  };

  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};