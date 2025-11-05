import React from 'react';
// Adicionei 'Pause' e 'Loader2' para os novos status
import { Check, Clock, Send, X, Ban, AlertCircle, Pause, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  // Garantir que o status esteja em minúsculas e sem espaços extras
  const normalizedStatus = status.toLowerCase().trim();

  const statusConfig = {
    // --- Status de Proposta (Já existentes) ---
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
    pendente: {
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      label: 'Pendente'
    },
    
    // --- Status Binários (Já existentes) ---
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

    // --- (NOVO) Status da Ordem de Serviço ---
    aberta: {
      icon: Clock,
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Aberta'
    },
    'em_andamento': { // Vindo do backend com underscore
      icon: Loader2, // Ícone de "carregando"
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-spin', // Adiciona animação de spin
      label: 'Em Andamento'
    },
    pausada: {
      icon: Pause,
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      label: 'Pausada'
    },
    concluida: { // 'concluida' do backend
      icon: Check,
      className: 'bg-green-100 text-green-800 border-green-200',
      label: 'Concluída'
    },
    cancelada: { // 'cancelada' do backend (corrigido para vermelho)
      icon: Ban,
      className: 'bg-red-100 text-red-800 border-red-200',
      label: 'Cancelada'
    },

    // --- (REMOVIDO) Status duplicado/incorreto ---
    // 'em andamento': { ... } // Removido pois o backend usa 'em_andamento'
  };

  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || {
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    label: status // Exibe o status original se não for mapeado
  };

  const IconComponent = config.icon;
  // Adiciona a classe de animação se for 'em_andamento'
  const iconClassName = `w-3 h-3 mr-1 ${normalizedStatus === 'em_andamento' ? 'animate-spin' : ''}`;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}>
      <IconComponent className={iconClassName} />
      {config.label}
    </span>
  );
};