import React, { useMemo, useState } from 'react';
import { ModalPadrao } from '../ui/ModalPadrao';
import { apiService, ApiError } from '../../lib/api';
import type { Departamento } from '../../types';
import { Building, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ModalCadastroDepartamentoProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartamentoCadastrado: (novoDepartamento: Departamento) => void;
  empresa_id?: number | null; // ID da empresa vindo do usuário logado (opcional para fallback)
}

export const ModalCadastroDepartamento: React.FC<ModalCadastroDepartamentoProps> = ({
  isOpen,
  onClose,
  onDepartamentoCadastrado,
  empresa_id,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedEmpresaId = useMemo(() => {
    if (empresa_id && empresa_id > 0) {
      return empresa_id;
    }
    const userEmpresaId = user?.empresa_id ?? user?.empresa?.id;
    return typeof userEmpresaId === 'number' && userEmpresaId > 0 ? userEmpresaId : null;
  }, [empresa_id, user]);

  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      setError('O nome do departamento é obrigatório.');
      return;
    }
    if (!resolvedEmpresaId) {
      setError('ID da empresa não encontrado. Refaça o login ou tente novamente.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dadosParaApi = {
        ...formData,
        empresa_id: resolvedEmpresaId,
        ativo: true,
        status: 'ativo' // Garante que o status seja enviado se o modelo precisar
      };
      
      const resposta = await apiService.createDepartamento(dadosParaApi);
      const novoDepartamento = (resposta && typeof resposta === 'object' && 'data' in resposta)
        ? (resposta as { data: Departamento }).data
        : (resposta as Departamento);

      if (!novoDepartamento || typeof novoDepartamento.id === 'undefined') {
        throw new Error('Resposta inválida ao criar departamento.');
      }

      onDepartamentoCadastrado(novoDepartamento);
      handleClose();
    } catch (err) {
      console.error("Erro ao criar departamento:", err);
      if (err instanceof ApiError && err.details) {
         setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao salvar departamento.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ nome: '', descricao: '' });
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={handleClose}
      title="Novo Departamento"
      confirmLabel={loading ? 'Salvando...' : 'Salvar Departamento'}
      onConfirm={handleSalvar}
      size="md" // Um modal menor
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSalvar(); }} className="space-y-6">
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2" role="alert">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
            </div>
        )}
        
        <div>
          <label htmlFor="depto-nome-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Building className="w-4 h-4 mr-2 text-gray-400" /> Nome do Departamento *
          </label>
          <input
            id="depto-nome-cad"
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData(prev => ({...prev, nome: e.target.value}))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.nome.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
            placeholder="Ex: Contábil, Financeiro"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="depto-desc-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <FileText className="w-4 h-4 mr-2 text-gray-400" /> Descrição (Opcional)
          </label>
          <textarea
            id="depto-desc-cad"
            value={formData.descricao}
            onChange={(e) => setFormData(prev => ({...prev, descricao: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={3}
            placeholder="Descreva as responsabilidades do departamento"
            disabled={loading}
          />
        </div>
      </form>
    </ModalPadrao>
  );
};
