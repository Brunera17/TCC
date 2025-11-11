import React, { useState, useEffect } from 'react';
import { ModalPadrao } from '../ui/ModalPadrao';
import { apiService, ApiError } from '../../lib/api';
import { Tag, Hash, FileText, User, Building, Power, AlertCircle } from 'lucide-react';
import type { RegimeTributario } from '../../types';

interface ModalCadastroRegimeTributarioProps {
  isOpen: boolean;
  onClose: () => void;
  onRegimeCadastrado: (regime: RegimeTributario) => void;
  regimeParaEditar?: RegimeTributario | null;
}

export const ModalCadastroRegimeTributario: React.FC<ModalCadastroRegimeTributarioProps> = ({
  isOpen,
  onClose,
  onRegimeCadastrado,
  regimeParaEditar,
}) => {
  // Estado do formulário SEM o campo 'codigo'
  const [formData, setFormData] = useState({
    nome: '',
    // codigo: '', // REMOVIDO
    descricao: '',
    aplicavel_pf: false,
    aplicavel_pj: false,
    ativo: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(regimeParaEditar);

  // Preenche/Reseta o formulário
  useEffect(() => {
    if (isOpen) {
        if (regimeParaEditar) {
        // Preenche para edição (sem 'codigo')
        setFormData({
            nome: regimeParaEditar.nome,
            // codigo: regimeParaEditar.codigo, // REMOVIDO
            descricao: regimeParaEditar.descricao || '',
            aplicavel_pf: regimeParaEditar.aplicavel_pf ?? false,
            aplicavel_pj: regimeParaEditar.aplicavel_pj ?? false,
            ativo: regimeParaEditar.ativo,
        });
        } else {
        // Reset para novo (sem 'codigo')
        setFormData({
            nome: '', /*codigo: '',*/ descricao: '',
            aplicavel_pf: false, aplicavel_pj: false, ativo: true,
        });
        }
        setError('');
    }
  }, [regimeParaEditar, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');

    // Validação básica (sem 'codigo')
    if (!formData.nome.trim()) {
        setError('Nome é obrigatório.');
        setLoading(false);
        return;
    }
    // O backend agora exige 'codigo' na rota, mas o 'service' o ignora.
    // Vamos enviar um placeholder ou string vazia para passar na validação da ROTA.
    // O ideal seria a ROTA não validar o 'codigo' na criação.
    try {
    let regimeSalvo: RegimeTributario;
        
        if (isEditing && regimeParaEditar) {
            // Na atualização, o backend ignora o 'codigo' se tentarmos mudar
      regimeSalvo = await apiService.updateRegime(regimeParaEditar.id, formData);
        } else {
            // Na criação, o backend gera o 'codigo'
      regimeSalvo = await apiService.createRegime(formData);
        }

        onRegimeCadastrado(regimeSalvo);
        handleClose();

    } catch (err: unknown) {
        console.error('Erro ao salvar regime:', err);
         if (err instanceof ApiError && err.details) {
             setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details));
         } else if (err instanceof Error) {
            setError(err.message);
         } else {
            setError('Erro desconhecido ao salvar regime.');
         }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleClose = () => {
     setFormData({ nome: '', /*codigo: '',*/ descricao: '', aplicavel_pf: false, aplicavel_pj: false, ativo: true });
     setError('');
     setLoading(false);
     onClose();
  };

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar Regime Tributário' : 'Novo Regime Tributário'}
      confirmLabel={loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Regime')}
      onConfirm={handleSubmit}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2" role="alert">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
            </div>
        )}

        {/* Nome */}
        <div>
          <label htmlFor="regime-nome" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <Tag className="w-4 h-4 mr-2 text-gray-400" /> Nome *
          </label>
          <input
            id="regime-nome"
            type="text"
            value={formData.nome}
            onChange={(e) => handleInputChange('nome', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm transition-colors ${error && !formData.nome.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
            required
            disabled={loading}
          />
        </div>

        {/* Código (REMOVIDO DO FORMULÁRIO DE CADASTRO/EDIÇÃO) */}
        {/* Se for edição, pode ser útil mostrar o código (mas não editável) */}
        {isEditing && regimeParaEditar?.codigo && (
             <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <Hash className="w-4 h-4 mr-2 text-gray-400" /> Código (Gerado automaticamente)
                </label>
                <p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">{regimeParaEditar.codigo}</p>
             </div>
        )}


        {/* Descrição */}
        <div>
          <label htmlFor="regime-descricao" className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <FileText className="w-4 h-4 mr-2 text-gray-400" /> Descrição (Opcional)
          </label>
          <textarea
            id="regime-descricao"
            value={formData.descricao}
            onChange={(e) => handleInputChange('descricao', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
            disabled={loading}
          />
        </div>

        {/* Aplicabilidade */}
        <fieldset className="space-y-3 pt-2">
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Aplicabilidade
          </legend>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplicavel_pf"
                checked={formData.aplicavel_pf}
                onChange={(e) => handleInputChange('aplicavel_pf', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="aplicavel_pf" className="ml-2 text-sm text-gray-700 flex items-center cursor-pointer">
                <User className="w-4 h-4 mr-1.5 text-blue-500" /> Pessoa Física
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="aplicavel_pj"
                checked={formData.aplicavel_pj}
                onChange={(e) => handleInputChange('aplicavel_pj', e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                disabled={loading}
              />
              <label htmlFor="aplicavel_pj" className="ml-2 text-sm text-gray-700 flex items-center cursor-pointer">
                <Building className="w-4 h-4 mr-1.5 text-green-500" /> Pessoa Jurídica
              </label>
            </div>
          </div>
        </fieldset>

        {/* Ativo */}
        <div className="flex items-center pt-2">
          <input
            type="checkbox"
            id="ativo"
            checked={formData.ativo}
            onChange={(e) => handleInputChange('ativo', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={loading}
          />
          <label htmlFor="ativo" className="ml-2 text-sm text-gray-700 flex items-center cursor-pointer">
            <Power className="w-4 h-4 mr-1.5 text-gray-400" /> Manter Ativo
          </label>
        </div>
      </form>
    </ModalPadrao>
  );
};
