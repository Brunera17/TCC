// src/components/modals/ModalCadastroCategoria.tsx
import React, { useState } from 'react';
import { ModalPadrao } from '../ui/ModalPadrao'; // Ajuste o caminho conforme sua estrutura
import { apiService, ApiError } from '../../lib/api'; // Ajuste o caminho e importe ApiError
import type { Categoria } from '../../pages/ServicosPage'; // Importe a interface Categoria (ajuste caminho)
import { Tag } from 'lucide-react'; // Ícone opcional

interface ModalCadastroCategoriaProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriaCadastrada: (novaCategoria: Categoria) => void; // Callback com a nova categoria
}

export const ModalCadastroCategoria: React.FC<ModalCadastroCategoriaProps> = ({
  isOpen,
  onClose,
  onCategoriaCadastrada,
}) => {
  const [nomeCategoria, setNomeCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSalvar = async () => {
    if (!nomeCategoria.trim()) {
      setError('O nome da categoria é obrigatório.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Assumindo que a API espera { nome: 'Nome Categoria', ativo: true }
      // A lógica de reativação deve estar no backend agora
      const novaCategoria = await apiService.createCategoria({ nome: nomeCategoria.trim(), ativo: true });
      onCategoriaCadastrada(novaCategoria); // Chama o callback passando a nova categoria
      handleClose(); // Fecha o modal e reseta o estado interno
    } catch (err) {
      console.error("Erro ao criar categoria:", err);
      if (err instanceof ApiError && err.details) {
         // Tenta pegar a mensagem de erro específica do backend
         setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao salvar categoria.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reseta o estado ao fechar
  const handleClose = () => {
    setNomeCategoria('');
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova Categoria de Serviço"
      confirmLabel={loading ? 'Salvando...' : 'Salvar Categoria'}
      onConfirm={handleSalvar}
      size="sm" // Modal menor para cadastro simples
    >
      <div className="space-y-4">
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm flex items-start space-x-2" role="alert">
                <span className="font-bold">Erro:</span>
                <span>{error}</span>
            </div>
        )}
        <div>
          <label htmlFor="nome-categoria" className="flex items-center text-sm font-medium text-gray-700 mb-1">
             <Tag className="w-4 h-4 mr-2 text-gray-400"/> Nome da Nova Categoria *
          </label>
          <input
            type="text"
            id="nome-categoria"
            value={nomeCategoria}
            onChange={(e) => setNomeCategoria(e.target.value)}
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Consultoria Financeira"
            disabled={loading}
          />
        </div>
      </div>
    </ModalPadrao>
  );
};