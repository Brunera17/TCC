import React from 'react';
import { ModalPadrao, StatusBadge } from '../ui';
import {
  Building,
  Hash,
  FileText,
  User,
  Phone,
  Tag,
  Calendar,
  Shield,
} from 'lucide-react';
import { formatarDataHora, formatarCNPJ } from '../../utils/formatters';

// Interface para Empresa (baseada na ClientesPage.tsx)
interface Empresa {
  id: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  contato?: string;
  status?: string;
  inscricao_estadual?: string;
  cliente_id: number; // ID do Cliente (Responsável)
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  cliente?: {
    nome?: string;
  };
}

interface ModalVisualizacaoEmpresaProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: Empresa | null;
}

/**
 * Componente de Campo de Informação reutilizável para o layout em grid
 */
const InfoField: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}> = ({ label, value, icon: Icon, className = '' }) => (
  <div className={`p-3 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
    <label className="flex items-center text-xs font-medium text-gray-500 mb-1">
      {Icon && <Icon className="w-3 h-3 mr-1.5" />}
      {label}
    </label>
    <p className="text-sm font-semibold text-gray-900 break-words">
      {value || '—'}
    </p>
  </div>
);

export const ModalVisualizacaoEmpresa: React.FC<ModalVisualizacaoEmpresaProps> = ({
  isOpen,
  onClose,
  empresa,
}) => {
  if (!empresa) return null;

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={onClose}
      title="Detalhes da Empresa"
      size="lg"
      showFooter={true}
      confirmLabel="Fechar"
      onConfirm={onClose}
    >
      <div className="space-y-6">
        {/* Seção de Identificação */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <Building className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">
              Identificação da Empresa
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField
              label="Razão Social"
              value={empresa.razao_social}
              icon={FileText}
            />
            <InfoField
              label="Nome Fantasia"
              value={empresa.nome_fantasia}
              icon={Tag}
            />
            <InfoField
              label="CNPJ"
              value={formatarCNPJ(empresa.cnpj)}
              icon={Hash}
            />
            <InfoField
              label="Inscrição Estadual"
              value={empresa.inscricao_estadual}
              icon={Hash}
            />
          </div>
        </div>

        {/* Seção de Contato e Status */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <User className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">
              Contato e Status
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField
              label="Contato (Telefone/Email)"
              value={empresa.contato}
              icon={Phone}
            />
            <InfoField
              label="Status"
              value={<StatusBadge status={empresa.ativo ? 'ativo' : 'inativo'} />}
              icon={Shield}
            />
            <InfoField
              label="Cliente Responsável (ID)"
              value={`${empresa.cliente?.nome || 'ID:'} ${empresa.cliente_id}`}
              icon={User}
            />
          </div>
        </div>

        {/* Seção de Datas */}
        <div className="space-y-4">
          <div className="flex items-center mb-3">
            <Calendar className="w-5 h-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Datas</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField
              label="Data de Criação"
              value={formatarDataHora(empresa.created_at)}
              icon={Calendar}
            />
            <InfoField
              label="Última Atualização"
              value={formatarDataHora(empresa.updated_at)}
              icon={Calendar}
            />
          </div>
        </div>
      </div>
    </ModalPadrao>
  );
};
