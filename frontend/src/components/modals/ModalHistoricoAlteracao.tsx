import React, { useState, useEffect, useCallback } from 'react';
import { History, User, Clock, ArrowRight, RefreshCw } from 'lucide-react';
// 1. Mudar para ModalPadrao para usar o padrão da aplicação
import { ModalPadrao } from '../ui/ModalPadrao';
// 2. Importar IconButton para o botão de "Atualizar"
import { IconButton } from '../ui/IconButton';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { StatusBadge } from '../ui/StatusBadge'; // Importar StatusBadge
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

// Objeto de mapeamento de status (alinhado com o backend)
const statusLabels: Record<string, string> = {
  'aberta': 'Aberta',
  'em_andamento': 'Em Andamento',
  'pausada': 'Pausada',
  'concluida': 'Concluída',
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
      
      // Simulação (substituir pela chamada real da API quando pronta)
      // const response = await apiService.getHistoricoOrdemServico(ordemServico.id);
      
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
      
      // Ordenar por data (mais recente primeiro)
      historicoSimulado.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
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
      default:
        return valor;
    }
  };

  const getCampoLabel = (campo: string) => {
    const labels: Record<string, string> = {
      'status': 'Status',
      'protocolo': 'Protocolo',
      'cliente_id': 'Cliente',
      'departamento_id': 'Departamento',
      'vencimento': 'Data de Vencimento',
      'observacao': 'Observações',
    };
    return labels[campo] || campo;
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
    // 3. Usar ModalPadrao com o footer padrão
    <ModalPadrao
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Alterações"
      size="lg"
      showFooter={true}
      confirmLabel="Fechar"
      onConfirm={onClose}
    >
      {/* 4. O ModalPadrao já tem um 'p-6' branco. 
           Vamos criar um wrapper para o scroll e para o fundo cinza claro,
           usando margem negativa para preencher o padding do modal.
      */}
      <div className="space-y-6 max-h-[70vh] overflow-y-auto -m-6 p-6 bg-gray-50">
        
        {/* 5. Cabeçalho de informações da OS, alinhado com o padrão */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 sticky top-0 bg-gray-50 pt-1 z-10">
          <div>
            <h3 className="font-semibold text-gray-900">
              OS: {ordemServico.protocolo}
            </h3>
            <p className="text-sm text-gray-600">
              Cliente: {ordemServico.cliente?.nome}
            </p>
            <StatusBadge status={ordemServico.status} className="mt-1" />
          </div>
          <IconButton
            icon={RefreshCw}
            label="Atualizar"
            onClick={carregarHistorico}
            variant="outline"
            size="sm"
            disabled={loading}
          />
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
              // 6. Timeline (container 'relative' para a linha)
              <div className="relative space-y-4">
                {/* Linha da timeline (opcional, mas visualmente bom) */}
                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-200" />
                
                {historico.map((item) => (
                  // 7. Card do item da timeline (branco sobre fundo cinza)
                  <div
                    key={item.id}
                    className="flex gap-4 relative z-0"
                  >
                    {/* Icone/Ponto da timeline */}
                    <div className="flex-shrink-0 z-10">
                      <div className="p-2 bg-gray-200 rounded-full border-4 border-gray-50">
                        {getIconeAlteracao(item.campo_alterado)}
                      </div>
                    </div>

                    {/* Conteúdo do card */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {getCampoLabel(item.campo_alterado)} alterado
                        </h4>
                        <span className="text-xs text-gray-500" title={formatDateTime(item.created_at)}>
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>

                      {/* Alteração de Valor */}
                      {item.valor_anterior ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded line-through">
                            {formatarValor(item.campo_alterado, item.valor_anterior)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            {formatarValor(item.campo_alterado, item.valor_novo)}
                          </span>
                        </div>
                      ) : (
                        // Valor inicial (criação)
                        <div className="text-sm mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {formatarValor(item.campo_alterado, item.valor_novo)}
                          </span>
                        </div>
                      )}

                      {/* Usuário e Observação */}
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{item.usuario_nome}</span>
                          </div>
                        </div>
                        {item.observacao && (
                          <p className="text-xs text-gray-500 italic mt-1">"{item.observacao}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 8. Resumo (estilizado como card) */}
            <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">Resumo</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total de alterações:</span>
                  <span className="ml-2 font-medium">{historico.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Criado em:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(ordemServico.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Última alteração:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(ordemServico.updated_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status atual:</span>
                  <span className="ml-2 font-medium">
                    {statusLabels[ordemServico.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 9. Remover o footer customizado daqui, pois o ModalPadrao já o fornece */}
      </div>
    </ModalPadrao>
  );
};