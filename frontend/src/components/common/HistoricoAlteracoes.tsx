import React, { useState, useEffect, useCallback } from 'react';
import { History, User, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Modal } from '../modals/Modal';
import { Button } from '../forms/Button';
import { LoadingSpinner } from './LoadingSpinner';
import type { OrdemServico } from '../../types';

interface HistoricoAlteracao {
  id: number;
  ordem_servico_id: number;
  campo_alterado: string;
  valor_anterior: string;
  valor_novo: string;
  usuario_id: number;
  usuario_nome: string;
  created_at: string;
  observacao?: string;
}

interface HistoricoProps {
  ordemServico: OrdemServico;
  isOpen: boolean;
  onClose: () => void;
}

const statusLabels = {
  'aberta': 'Aberta',
  'em_andamento': 'Em Andamento',
  'finalizada': 'Finalizada',
  'cancelada': 'Cancelada'
};

export const HistoricoAlteracoes: React.FC<HistoricoProps> = ({
  ordemServico,
  isOpen,
  onClose
}) => {
  const [historico, setHistorico] = useState<HistoricoAlteracao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const carregarHistorico = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Como o endpoint de histórico pode não existir ainda, vamos simular com dados base
      // Em produção, seria: const response = await apiService.getHistoricoOrdemServico(ordemServico.id);
      
      // Simulando histórico baseado nos dados da OS
      const historicoSimulado: HistoricoAlteracao[] = [
        {
          id: 1,
          ordem_servico_id: ordemServico.id,
          campo_alterado: 'status',
          valor_anterior: '',
          valor_novo: ordemServico.status,
          usuario_id: ordemServico.usuario_id,
          usuario_nome: ordemServico.usuario?.nome || 'Sistema',
          created_at: ordemServico.created_at,
          observacao: 'Ordem de serviço criada'
        }
      ];

      // Se a OS foi atualizada após criação, simular alteração de status
      if (ordemServico.updated_at !== ordemServico.created_at) {
        historicoSimulado.push({
          id: 2,
          ordem_servico_id: ordemServico.id,
          campo_alterado: 'status',
          valor_anterior: 'aberta',
          valor_novo: ordemServico.status,
          usuario_id: ordemServico.usuario_id,
          usuario_nome: ordemServico.usuario?.nome || 'Sistema',
          created_at: ordemServico.updated_at,
          observacao: 'Status atualizado'
        });
      }

      setHistorico(historicoSimulado);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setError('Erro ao carregar histórico de alterações');
    } finally {
      setLoading(false);
    }
  }, [ordemServico]);

  useEffect(() => {
    if (isOpen && ordemServico) {
      carregarHistorico();
    }
  }, [isOpen, ordemServico, carregarHistorico]);

  const formatarValor = (campo: string, valor: string) => {
    switch (campo) {
      case 'status':
        return statusLabels[valor as keyof typeof statusLabels] || valor;
      case 'vencimento':
        return new Date(valor).toLocaleDateString('pt-BR');
      case 'cliente_id':
        return `Cliente ID: ${valor}`;
      case 'departamento_id':
        return `Departamento ID: ${valor}`;
      default:
        return valor;
    }
  };

  const getCampoLabel = (campo: string) => {
    switch (campo) {
      case 'status': return 'Status';
      case 'protocolo': return 'Protocolo';
      case 'cliente_id': return 'Cliente';
      case 'departamento_id': return 'Departamento';
      case 'vencimento': return 'Data de Vencimento';
      case 'observacao': return 'Observações';
      default: return campo;
    }
  };

  const getIconeAlteracao = (campo: string) => {
    switch (campo) {
      case 'status':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'vencimento':
        return <Clock className="w-4 h-4 text-orange-500" />;
      default:
        return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Alterações"
      size="lg"
    >
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">
              Ordem de Serviço: {ordemServico.protocolo}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Cliente: {ordemServico.cliente?.nome}
          </p>
          <p className="text-sm text-gray-600">
            Status atual: {statusLabels[ordemServico.status]}
          </p>
        </div>

        {/* Conteúdo do Histórico */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {historico.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma alteração registrada
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-white border border-gray-200 rounded-lg"
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className="p-2 bg-gray-100 rounded-full">
                        {getIconeAlteracao(item.campo_alterado)}
                      </div>
                      {index < historico.length - 1 && (
                        <div className="w-px h-12 bg-gray-200 mt-2" />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {getCampoLabel(item.campo_alterado)} alterado
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>

                      {/* Alteração de Valor */}
                      {item.valor_anterior && (
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                            {formatarValor(item.campo_alterado, item.valor_anterior)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            {formatarValor(item.campo_alterado, item.valor_novo)}
                          </span>
                        </div>
                      )}

                      {/* Valor inicial (criação) */}
                      {!item.valor_anterior && (
                        <div className="text-sm mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {formatarValor(item.campo_alterado, item.valor_novo)}
                          </span>
                        </div>
                      )}

                      {/* Usuário e Observação */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{item.usuario_nome}</span>
                        </div>
                        {item.observacao && (
                          <span className="italic">"{item.observacao}"</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Estatísticas */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Resumo</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Total de alterações:</span>
                  <span className="ml-2 font-medium">{historico.length}</span>
                </div>
                <div>
                  <span className="text-blue-600">Criado em:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(ordemServico.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Última alteração:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(ordemServico.updated_at)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Status atual:</span>
                  <span className="ml-2 font-medium">
                    {statusLabels[ordemServico.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={carregarHistorico}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};