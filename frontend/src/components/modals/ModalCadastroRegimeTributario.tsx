import { useState, useEffect } from 'react';
import { X, Building, Check, AlertCircle } from 'lucide-react';
import type { RegimeTributarioPage } from '../../types';
import { apiService } from '../../lib/api';

interface ModalCadastroRegimeTributarioProps {
  isOpen: boolean;
  onClose: () => void;
  onRegimeCadastrado: (regime: RegimeTributarioPage) => void;
  regimeParaEditar?: RegimeTributarioPage | null;
}

export const ModalCadastroRegimeTributario: React.FC<ModalCadastroRegimeTributarioProps> = ({
  isOpen,
  onClose,
  onRegimeCadastrado,
  regimeParaEditar,
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    aplicavel_pf: false,
    aplicavel_pj: false,
    ativo: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(regimeParaEditar);

  useEffect(() => {
    if (regimeParaEditar) {
      setFormData({
        nome: regimeParaEditar.nome,
        codigo: regimeParaEditar.codigo,
        descricao: regimeParaEditar.descricao || '',
        aplicavel_pf: regimeParaEditar.aplicavel_pf,
        aplicavel_pj: regimeParaEditar.aplicavel_pj,
        ativo: regimeParaEditar.ativo,
      });
    } else {
      setFormData({
        nome: '',
        codigo: '',
        descricao: '',
        aplicavel_pf: false,
        aplicavel_pj: false,
        ativo: true,
      });
    }
    setError('');
  }, [regimeParaEditar, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing && regimeParaEditar) {
        await apiService.updateRegime(regimeParaEditar.id, formData);
      } else {
        await apiService.createRegime(formData);
      }

      onRegimeCadastrado(formData as RegimeTributarioPage);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar regime');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="rounded-lg overflow-hidden shadow-xl w-full max-w-md mx-4">
        {/* Header - CORREÇÃO: SEM rounded-t-lg */}
        <div className="bg-white flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Regime' : 'Novo Regime'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - CORREÇÃO: COM bg-white */}
        <form onSubmit={handleSubmit} className="bg-white p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código *
            </label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => handleInputChange('codigo', e.target.value)}
              placeholder="Ex: SN, LP, LR, MEI"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Aplicabilidade */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aplicabilidade
            </label>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplicavel_pf"
                checked={formData.aplicavel_pf}
                onChange={(e) => handleInputChange('aplicavel_pf', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="aplicavel_pf" className="ml-2 text-sm text-gray-700">
                Aplicável para Pessoa Física
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplicavel_pj"
                checked={formData.aplicavel_pj}
                onChange={(e) => handleInputChange('aplicavel_pj', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="aplicavel_pj" className="ml-2 text-sm text-gray-700">
                Aplicável para Pessoa Jurídica
              </label>
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => handleInputChange('ativo', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
              Ativo
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-custom-blue rounded-lg hover:bg-custom-blue-light disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
