import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Tag,
  Percent
} from 'lucide-react';
import { ModalPadrao, IconButton } from '../ui';
import { apiService, ApiError } from '../../lib/api';
import { formatarMoeda } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import type {
  Cliente,
  Departamento,
  Servico,
  ItemOrdemServico,
  OrdemServico, 
  OrdemServicoUpdateData 
} from '../../types';

// Tipos de Status
type OrdemServicoStatus = 'aberta' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';

const STATUS_OPTIONS: { value: OrdemServicoStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

// --- Interfaces locais para o formulário ---

interface ItemOrdemServicoFormData {
  id?: number; 
  tempId: string; 
  servico_id: number | '';
  quantidade: number;
  valor_unitario: number;
  desconto: number; 
  valor_total: number;
}

interface OrdemServicoFormData {
  protocolo: string;
  cliente_id: string; // IDs como string para o <select>
  departamento_id: string; // IDs como string para o <select>
  vencimento: string;
  observacao: string;
  status: OrdemServicoStatus; 
  itens: ItemOrdemServicoFormData[];
  valor_total_os: number;
}

// --- Props do Modal ---

interface ModalEdicaoOrdemServicoProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void; 
  ordemParaEditar: OrdemServico | null; 
  clientes: Cliente[];
  departamentos: Departamento[];
  servicos: Servico[];
}

// --- Funções Helper ---

const createEmptyItem = (): ItemOrdemServicoFormData => ({
  tempId: `item-${Date.now()}-${Math.random()}`,
  servico_id: '',
  quantidade: 1,
  valor_unitario: 0,
  desconto: 0,
  valor_total: 0,
});

const calcularValorTotalItem = (item: ItemOrdemServicoFormData): number => {
  const subtotal = item.quantidade * item.valor_unitario;
  const descontoValor = subtotal * (item.desconto / 100);
  return subtotal - descontoValor;
};

// --- Componente ---

export const ModalEdicaoOrdemServico: React.FC<ModalEdicaoOrdemServicoProps> = ({
  isOpen,
  onClose,
  onSaved,
  ordemParaEditar,
  clientes,
  departamentos,
  servicos
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState<OrdemServicoFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const servicoMap = useMemo(() => {
    const map = new Map<number, Servico>();
    servicos.forEach(s => map.set(s.id, s));
    return map;
  }, [servicos]);

  // Carrega os dados da OS para edição quando o modal é aberto
  useEffect(() => {
    if (isOpen && ordemParaEditar) {
      setError('');
      setLoading(false);
      
      const itensFormatados: ItemOrdemServicoFormData[] = ordemParaEditar.itens.map(item => ({
        ...item,
        tempId: `item-db-${item.id}`,
        servico_id: item.servico_id || '',
      }));

      // --- CORREÇÃO AQUI ---
      // Lendo o ID de dentro dos objetos aninhados (cliente.id e departamento.id)
      // O backend envia o objeto 'cliente', não o 'cliente_id' no nível raiz.
      setFormData({
        protocolo: ordemParaEditar.protocolo,
        cliente_id: ordemParaEditar.cliente?.id?.toString() || ordemParaEditar.cliente_id?.toString() || '',
        departamento_id: ordemParaEditar.departamento?.id?.toString() || ordemParaEditar.departamento_id?.toString() || '',
        vencimento: ordemParaEditar.vencimento ? ordemParaEditar.vencimento.split('T')[0] : '',
        observacao: ordemParaEditar.observacao || '',
        status: ordemParaEditar.status,
        itens: itensFormatados.length > 0 ? itensFormatados : [createEmptyItem()],
        valor_total_os: ordemParaEditar.valor_total_os,
      });
      // --- FIM DA CORREÇÃO ---

    } else {
      setFormData(null);
    }
  }, [isOpen, ordemParaEditar]);

  // Recalcula o valor total da OS sempre que os itens mudam
  useEffect(() => {
    if (formData) {
      const total = formData.itens.reduce((acc, item) => acc + item.valor_total, 0);
      setFormData(prev => (prev ? { ...prev, valor_total_os: total } : null));
    }
  }, [formData?.itens]);

  if (!formData) return null;

  const handleInputChange = (
    field: keyof OrdemServicoFormData,
    value: string | number
  ) => {
    setFormData(prev => (prev ? { ...prev, [field]: String(value) } : null));
    setError('');
  };

  const handleItemChange = (
    tempId: string,
    field: keyof ItemOrdemServicoFormData,
    value: string | number
  ) => {
    setFormData(prev => {
      if (!prev) return null;
      const novosItens = prev.itens.map(item => {
        if (item.tempId === tempId) {
          const updatedItem = { ...item, [field]: value };

          if (field === 'servico_id') {
            const servico = servicoMap.get(Number(value));
            const valorBase = servico?.valor_unitario ?? servico?.valor_base ?? 0;
            updatedItem.valor_unitario = valorBase;
          }
          
          updatedItem.valor_total = calcularValorTotalItem(updatedItem);
          return updatedItem;
        }
        return item;
      });
      return { ...prev, itens: novosItens };
    });
  };

  const handleAdicionarItem = () => {
    setFormData(prev => (prev ? {
      ...prev,
      itens: [...prev.itens, createEmptyItem()]
    } : null));
  };

  const handleRemoverItem = (tempId: string) => {
    setFormData(prev => (prev ? {
      ...prev,
      itens: prev.itens.filter(item => item.tempId !== tempId)
    } : null));
  };

  const handleSalvar = async () => {
    if (!ordemParaEditar || !formData) return;

    setError('');

    if (!formData.cliente_id) {
      setError('O Cliente é obrigatório.'); return;
    }
    if (!formData.departamento_id) {
        setError('O Departamento é obrigatório.'); return;
    }
    const itensInvalidos = formData.itens.some(item => !item.servico_id || item.quantidade < 1);
    if (itensInvalidos) {
      setError('Todos os itens devem ter um serviço selecionado e quantidade de pelo menos 1.'); return;
    }

    setLoading(true);

    const payloadItens: ItemOrdemServico[] = formData.itens.map(item => ({
      id: item.id,
      servico_id: Number(item.servico_id),
      quantidade: Number(item.quantidade),
      valor_unitario: Number(item.valor_unitario),
      desconto: Number(item.desconto),
      valor_total: item.valor_total,
    }));

    const payload: OrdemServicoUpdateData = {
      cliente_id: Number(formData.cliente_id),
      departamento_id: Number(formData.departamento_id),
      vencimento: formData.vencimento,
      observacao: formData.observacao,
      status: formData.status,
      valor_total_os: formData.valor_total_os,
      itens: payloadItens,
    };

    try {
      await apiService.updateOrdemServico(ordemParaEditar.id, payload);
      showSuccess('Sucesso!', 'Ordem de Serviço atualizada com sucesso.');
      onSaved();
      onClose();
    } catch (err) {
      console.error("Erro ao atualizar Ordem de Serviço:", err);
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
      title={loading ? 'Atualizando...' : `Editar OS: ${formData.protocolo}`}
      confirmLabel={loading ? 'Salvando...' : 'Salvar Alterações'}
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
              <label htmlFor="os-protocolo-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Hash className="w-4 h-4 mr-2 text-gray-400" /> Protocolo
              </label>
              <input
                id="os-protocolo-edit" type="text" value={formData.protocolo}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="os-cliente-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 mr-2 text-gray-400" /> Cliente *
              </label>
              <select
                id="os-cliente-edit" 
                value={formData.cliente_id} // value="6" (string)
                onChange={(e) => handleInputChange('cliente_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading || clientes.length === 0}
              >
                <option value="">{clientes.length === 0 ? 'Carregando...' : 'Selecione o cliente'}</option>
                {/* --- CORREÇÃO AQUI --- */}
                {/* Garante que o value da option também seja string */}
                {clientes.map(c => <option key={c.id} value={c.id.toString()}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="os-depto-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4 mr-2 text-gray-400" /> Departamento *
              </label>
              <select
                id="os-depto-edit" 
                value={formData.departamento_id} // value="3" (string)
                onChange={(e) => handleInputChange('departamento_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading || departamentos.length === 0}
              >
                <option value="">{departamentos.length === 0 ? 'Carregando...' : 'Selecione o depto.'}</option>
                {/* --- CORREÇÃO AQUI --- */}
                {/* Garante que o value da option também seja string */}
                {departamentos.map(d => <option key={d.id} value={d.id.toString()}>{d.nome}</option>)}
              </select>
            </div>

            {/* Vencimento e Status */}
            <div className="col-span-1">
              <label htmlFor="os-vencimento-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" /> Data de Vencimento *
              </label>
              <input
                id="os-vencimento-edit" type="date" value={formData.vencimento}
                onChange={(e) => handleInputChange('vencimento', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="os-status-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Tag className="w-4 h-4 mr-2 text-gray-400" /> Status *
              </label>
              <select
                id="os-status-edit" value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as OrdemServicoStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div className="md:col-span-3">
              <label htmlFor="os-obs-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 mr-2 text-gray-400" /> Observações (Opcional)
              </label>
              <textarea
                id="os-obs-edit" value={formData.observacao}
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

          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {formData.itens.length === 0 && (
              <p className="text-center text-gray-500 italic py-4">Nenhum item adicionado.</p>
            )}
            {formData.itens.map((item) => (
              <div key={item.tempId} className="grid grid-cols-12 gap-x-3 gap-y-2 p-3 bg-white border rounded-lg shadow-sm">
                
                {/* Serviço */}
                <div className="col-span-12 md:col-span-4">
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <Package className="w-3 h-3 mr-1" /> Serviço *
                  </label>
                  <select
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
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <Hash className="w-3 h-3 mr-1" /> Qtd *
                  </label>
                  <input
                    type="number" value={item.quantidade}
                    onChange={(e) => handleItemChange(item.tempId, 'quantidade', Number(e.target.value))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                  />
                </div>
                
                {/* Valor Unit. */}
                <div className="col-span-8 md:col-span-2">
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <DollarSign className="w-3 h-3 mr-1" /> Valor Unit.
                  </label>
                  <input
                    type="number" value={item.valor_unitario}
                    onChange={(e) => handleItemChange(item.tempId, 'valor_unitario', Number(e.target.value))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                    step="0.01" min="0"
                  />
                </div>

                {/* Desconto */}
                <div className="col-span-4 md:col-span-2">
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <Percent className="w-3 h-3 mr-1" /> Desconto (%)
                  </label>
                  <input
                    type="number" value={item.desconto}
                    onChange={(e) => handleItemChange(item.tempId, 'desconto', Number(e.target.value))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                    min="0" max="100"
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
                <div className="col-span-2 md:col-span-1 flex items-end">
                  <IconButton
                    icon={Trash2}
                    onClick={() => handleRemoverItem(item.tempId)}
                    variant="danger"
                    size="md"
                    title="Remover Item"
                    disabled={loading || formData.itens.length <= 1}
                  />
                </div>

              </div>
            ))}
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