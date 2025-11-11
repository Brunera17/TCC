import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  DollarSign,
  Package,
  Calendar,
  User,
  Building,
  FileText,
  Hash,
  AlertTriangle,
  Percent
} from 'lucide-react';
// --- CORREÇÃO AQUI ---
// Importar 'IconButton' junto com 'ModalPadrao' do índice 'ui'
import { ModalPadrao, IconButton } from '../ui';
// --- FIM DA CORREÇÃO ---
import { apiService, ApiError } from '../../lib/api';
import { formatarMoeda } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import type {
  Cliente,
  Departamento,
  Servico,
  ItemOrdemServico,
  OrdemServicoCreateData
} from '../../types';

// --- Interfaces locais para o formulário ---

interface ItemOrdemServicoFormData {
  // Usamos um ID temporário no frontend para o React 'key'
  tempId: string; 
  servico_id: number | '';
  quantidade: number;
  valor_unitario: number;
  desconto: number; // Em percentual
  valor_total: number; // Calculado
}

interface OrdemServicoFormData {
  protocolo: string;
  cliente_id: number | '';
  departamento_id: number | '';
  vencimento: string;
  observacao: string;
  itens: ItemOrdemServicoFormData[];
  valor_total_os: number;
}

// --- Props do Modal ---

interface ModalCadastroOrdemServicoProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  clientes: Cliente[];
  departamentos: Departamento[];
  servicos: Servico[];
  usuarioId: number; // ID do usuário logado
}

// --- Funções Helper ---

// Gera o protocolo no formato OS-YYYYMMDDHHMM
const gerarProtocolo = () => {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const MIN = String(now.getMinutes()).padStart(2, '0');
  return `OS-${YYYY}${MM}${DD}${HH}${MIN}`;
};

// Cria um item de formulário vazio
const createEmptyItem = (): ItemOrdemServicoFormData => ({
  tempId: `item-${Date.now()}-${Math.random()}`,
  servico_id: '',
  quantidade: 1,
  valor_unitario: 0,
  desconto: 0,
  valor_total: 0,
});

// Calcula o valor total de um item
const calcularValorTotalItem = (item: ItemOrdemServicoFormData): number => {
  const subtotal = item.quantidade * item.valor_unitario;
  const descontoValor = subtotal * (item.desconto / 100);
  return subtotal - descontoValor;
};

// --- Componente ---

export const ModalCadastroOrdemServico: React.FC<ModalCadastroOrdemServicoProps> = ({
  isOpen,
  onClose,
  onCreated,
  clientes,
  departamentos,
  servicos,
  usuarioId
}) => {
  const { showSuccess } = useToast();
  const [formData, setFormData] = useState<OrdemServicoFormData>(createInitialFormData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mapa de serviços para consulta rápida
  const servicoMap = useMemo(() => {
    const map = new Map<number, Servico>();
    servicos.forEach(s => map.set(s.id, s));
    return map;
  }, [servicos]);

  // Reseta o formulário quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setFormData(createInitialFormData());
      setError('');
    }
  }, [isOpen]);

  // Função inicial para criar o formulário
  function createInitialFormData(): OrdemServicoFormData {
    return {
      protocolo: gerarProtocolo(),
      cliente_id: '',
      departamento_id: '',
      vencimento: new Date().toISOString().split('T')[0], // Hoje
      observacao: '',
      itens: [createEmptyItem()], // Começa com um item
      valor_total_os: 0,
    };
  }

  // Recalcula o valor total da OS sempre que os itens mudam
  useEffect(() => {
    const total = formData.itens.reduce((acc, item) => acc + item.valor_total, 0);
    setFormData(prev => ({ ...prev, valor_total_os: total }));
  }, [formData.itens]);

  // --- Handlers ---

  const handleInputChange = (
    field: keyof OrdemServicoFormData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleItemChange = (
    tempId: string,
    field: keyof ItemOrdemServicoFormData,
    value: string | number
  ) => {
    setFormData(prev => {
      const novosItens = prev.itens.map(item => {
        if (item.tempId === tempId) {
          const updatedItem = { ...item, [field]: value };

          // Se mudar o serviço, atualiza o valor unitário
          if (field === 'servico_id') {
            const servico = servicoMap.get(Number(value));
            // Prioriza 'valor_unitario' (de ServicosPage), depois 'valor_base' (do model)
            const valorBase = servico?.valor_unitario ?? servico?.valor_base ?? 0;
            updatedItem.valor_unitario = valorBase;
          }

          // Recalcula o valor total do item
          updatedItem.valor_total = calcularValorTotalItem(updatedItem);
          return updatedItem;
        }
        return item;
      });
      return { ...prev, itens: novosItens };
    });
  };

  const handleAdicionarItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, createEmptyItem()]
    }));
  };

  const handleRemoverItem = (tempId: string) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.tempId !== tempId)
    }));
  };

  const handleSalvar = async () => {
    setError('');

    // --- Validação ---
    if (!formData.cliente_id) {
      setError('O Cliente é obrigatório.'); return;
    }
    if (!formData.departamento_id) {
      setError('O Departamento é obrigatório.'); return;
    }
    if (!formData.vencimento) {
      setError('A Data de Vencimento é obrigatória.'); return;
    }
    if (formData.itens.length === 0) {
      setError('Adicione pelo menos um serviço à Ordem de Serviço.'); return;
    }
    const itensInvalidos = formData.itens.some(item => !item.servico_id || item.quantidade < 1);
    if (itensInvalidos) {
      setError('Todos os itens devem ter um serviço selecionado e quantidade de pelo menos 1.'); return;
    }
    if (!usuarioId) {
      setError('Erro de autenticação: ID do usuário não encontrado. Faça login novamente.'); return;
    }

    setLoading(true);

    // --- Preparação do Payload ---
    const payloadItens: ItemOrdemServico[] = formData.itens.map(item => ({
      servico_id: Number(item.servico_id),
      quantidade: Number(item.quantidade),
      valor_unitario: Number(item.valor_unitario),
      desconto: Number(item.desconto),
      valor_total: item.valor_total,
    }));

    const payload: OrdemServicoCreateData = {
      protocolo: formData.protocolo,
      cliente_id: Number(formData.cliente_id),
      departamento_id: Number(formData.departamento_id),
      vencimento: formData.vencimento,
      observacao: formData.observacao,
      usuario_id: usuarioId,
      status: 'aberta', // Status inicial padrão
      valor_total_os: formData.valor_total_os,
      itens: payloadItens,
    };

    try {
      await apiService.createOrdemServico(payload);
      showSuccess('Sucesso!', 'Ordem de Serviço cadastrada com sucesso.');
      onCreated();
      onClose();
    } catch (err) {
      console.error("Erro ao criar Ordem de Serviço:", err);
      const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={onClose}
      title="Cadastrar Nova Ordem de Serviço"
      confirmLabel={loading ? 'Salvando...' : 'Salvar Ordem de Serviço'}
      onConfirm={handleSalvar}
      size="2xl"
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2" role="alert">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* --- Seção 1: Dados Básicos --- */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da OS</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="os-protocolo" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 mr-2 text-gray-400" /> Protocolo
              </label>
              <input
                id="os-protocolo" type="text" value={formData.protocolo}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="os-cliente" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 mr-2 text-gray-400" /> Cliente *
              </label>
              <select
                id="os-cliente" value={formData.cliente_id}
                onChange={(e) => handleInputChange('cliente_id', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading || clientes.length === 0}
              >
                <option value="">{clientes.length === 0 ? 'Carregando...' : 'Selecione o cliente'}</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="os-depto" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4 mr-2 text-gray-400" /> Departamento *
              </label>
              <select
                id="os-depto" value={formData.departamento_id}
                onChange={(e) => handleInputChange('departamento_id', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading || departamentos.length === 0}
              >
                <option value="">{departamentos.length === 0 ? 'Carregando...' : 'Selecione o depto.'}</option>
                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label htmlFor="os-vencimento" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Data de Vencimento *
              </label>
              <input
                id="os-vencimento" type="date" value={formData.vencimento}
                onChange={(e) => handleInputChange('vencimento', e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div className="md:col-span-3">
              <label htmlFor="os-obs" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 mr-2 text-gray-400" /> Observações (Opcional)
              </label>
              <textarea
                id="os-obs" value={formData.observacao}
                onChange={(e) => handleInputChange('observacao', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Detalhes sobre o serviço a ser executado..."
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* --- Seção 2: Itens da OS --- */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Itens da OS</h3>
            <IconButton
              icon={Plus}
              label="Adicionar Item"
              onClick={handleAdicionarItem}
              variant="outline"
              size="sm"
              disabled={loading}
            />
          </div>

          <div className="space-y-4">
            {formData.itens.length === 0 && (
              <p className="text-center text-gray-500 italic py-4">Nenhum item adicionado.</p>
            )}
            {formData.itens.map((item) => {
              const baseId = item.tempId;
              return (
                <div key={item.tempId} className="grid grid-cols-12 gap-x-3 gap-y-2 p-3 bg-white border rounded-lg shadow-sm">
                  {/* Serviço */}
                  <div className="col-span-12 md:col-span-4">
                    <label htmlFor={`servico-${baseId}`} className="flex items-center text-xs font-medium text-gray-700 mb-1">
                      <Package className="w-3 h-3 mr-1" /> Serviço *
                    </label>
                    <select
                      id={`servico-${baseId}`}
                      value={item.servico_id}
                      onChange={(e) => handleItemChange(item.tempId, 'servico_id', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md bg-white text-sm"
                    >
                      <option value="">{servicos.length === 0 ? 'Carregando...' : 'Selecione'}</option>
                      {servicos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nome} ({formatarMoeda(s.valor_unitario || s.valor_base || s.preco_base || 0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qtd */}
                  <div className="col-span-4 md:col-span-1">
                    <label htmlFor={`quantidade-${baseId}`} className="flex items-center text-xs font-medium text-gray-700 mb-1">
                      <Hash className="w-3 h-3 mr-1" /> Qtd *
                    </label>
                    <input
                      id={`quantidade-${baseId}`}
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => handleItemChange(item.tempId, 'quantidade', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                      placeholder="Quantidade"
                    />
                  </div>

                  {/* Valor Unit. */}
                  <div className="col-span-8 md:col-span-2">
                    <label htmlFor={`valor-unitario-${baseId}`} className="flex items-center text-xs font-medium text-gray-700 mb-1">
                      <DollarSign className="w-3 h-3 mr-1" /> Valor Unit.
                    </label>
                    <input
                      id={`valor-unitario-${baseId}`}
                      type="number"
                      value={item.valor_unitario}
                      onChange={(e) => handleItemChange(item.tempId, 'valor_unitario', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                      step="0.01"
                      min="0"
                      placeholder="Valor unitário"
                    />
                  </div>

                  {/* Desconto */}
                  <div className="col-span-4 md:col-span-2">
                    <label htmlFor={`desconto-${baseId}`} className="flex items-center text-xs font-medium text-gray-700 mb-1">
                      <Percent className="w-3 h-3 mr-1" /> Desconto (%)
                    </label>
                    <input
                      id={`desconto-${baseId}`}
                      type="number"
                      value={item.desconto}
                      onChange={(e) => handleItemChange(item.tempId, 'desconto', Number(e.target.value))}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                      min="0"
                      max="100"
                      placeholder="Desconto"
                    />
                  </div>

                  {/* Total Item */}
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total Item
                    </label>
                    <div className="px-2 py-2 bg-gray-100 rounded-md text-sm font-medium text-gray-900">
                      {formatarMoeda(item.valor_total)}
                    </div>
                  </div>

                  {/* Remover */}
                  <div className="col-span-12 flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleRemoverItem(item.tempId)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      disabled={formData.itens.length === 1}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* --- Seção 3: Total --- */}
        <div className="flex justify-end items-center p-4 bg-gray-100 rounded-lg">
          <span className="text-lg font-semibold text-gray-700 mr-2">Valor Total da OS:</span>
          <span className="text-2xl font-bold text-green-700">
            {formatarMoeda(formData.valor_total_os)}
          </span>
        </div>

      </form>
    </ModalPadrao>
  );
};