import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Clock, AlertTriangle, X, Eye } from 'lucide-react';
import { apiService } from '../../lib/api';
import type {
  ListarNotificacoesVencimentoResponse,
  NotificacaoVencimento,
  NotificacoesVencimentoFiltro,
  OrdemServico,
} from '../../types';
import type { PaginatedResponse } from '../../lib/api';

const FILTRO_PADRAO: NotificacoesVencimentoFiltro = {
  dias: 7,
  incluir_atrasadas: true,
};

interface NotificacoesVencimentoProps {
  onNotificacaoClick?: (ordemServico: OrdemServico) => void;
}

export const NotificacoesVencimento: React.FC<NotificacoesVencimentoProps> = ({
  onNotificacaoClick
}) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoVencimento[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizarNotificacoes = useCallback((
    payload: ListarNotificacoesVencimentoResponse | NotificacaoVencimento[] | null | undefined
  ): NotificacaoVencimento[] => {
    if (!payload) {
      return [];
    }

    const itens = Array.isArray(payload) ? payload : payload.data ?? [];

    return itens
      .map((item) => {
        if (!item?.ordem_servico) return null;

        const { ordem_servico } = item;

        const calculoDias = () => {
          const { vencimento } = ordem_servico;
          if (!vencimento) return 0;
          const hoje = new Date();
          const dataVenc = new Date(vencimento);
          const diffTime = dataVenc.getTime() - hoje.getTime();
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        const dias = typeof item.dias_restantes === 'number'
          ? item.dias_restantes
          : calculoDias();

        const tipo = item.tipo ?? (dias < 0 ? 'vencida' : dias <= 2 ? 'critica' : 'vencendo');

        const normalizada: NotificacaoVencimento = {
          id: item.id ?? ordem_servico.id,
          ordem_servico,
          tipo,
          dias_restantes: dias,
          lida: Boolean(item.lida),
          created_at: item.created_at ?? new Date().toISOString(),
        };

        if (item.mensagem !== undefined) {
          normalizada.mensagem = item.mensagem;
        }

        return normalizada;
      })
      .filter((item): item is NotificacaoVencimento => Boolean(item));
  }, []);

  const gerarFallbackNotificacoes = useCallback(async (): Promise<NotificacaoVencimento[]> => {
    try {
      const response = await apiService.getOrdensServico({
        per_page: 100,
        status: 'aberta,em_andamento',
      });

      const lista = Array.isArray((response as PaginatedResponse<OrdemServico>)?.data)
        ? (response as PaginatedResponse<OrdemServico>).data
        : Array.isArray(response)
          ? (response as OrdemServico[])
          : [];

      const hoje = new Date();

      const notificacoesCalculadas = lista
        .map((ordem): NotificacaoVencimento | null => {
          if (!ordem?.vencimento) return null;

          const vencimento = new Date(ordem.vencimento);
          const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDias > (FILTRO_PADRAO.dias ?? 7) && diffDias >= 0) return null;

          let tipo: NotificacaoVencimento['tipo'] = 'vencendo';
          if (diffDias < 0) tipo = 'vencida';
          else if (diffDias <= 2) tipo = 'critica';
          else if (diffDias > 2 && diffDias <= 7) tipo = 'vencendo';
          else return null;

          return {
            id: ordem.id,
            ordem_servico: ordem,
            tipo,
            dias_restantes: diffDias,
            lida: false,
            created_at: new Date().toISOString(),
            mensagem: diffDias < 0
              ? `${ordem.protocolo} venceu há ${Math.abs(diffDias)} dia(s)`
              : `${ordem.protocolo} vence em ${diffDias} dia(s)`,
          };
        })
        .filter((item): item is NotificacaoVencimento => Boolean(item));

      notificacoesCalculadas.sort((a, b) => {
        const prioridade = { vencida: 3, critica: 2, vencendo: 1 } as const;
        return prioridade[b.tipo] - prioridade[a.tipo];
      });

      return notificacoesCalculadas;
    } catch (fallbackError) {
      console.warn('Fallback de notificações falhou', fallbackError);
      return [];
    }
  }, []);

  const carregarNotificacoes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
  const response = await apiService.getNotificacoesVencimento(FILTRO_PADRAO);
      const notificacoesNormalizadas = normalizarNotificacoes(response);

      if (notificacoesNormalizadas.length > 0) {
        notificacoesNormalizadas.sort((a, b) => {
          const prioridade = { vencida: 3, critica: 2, vencendo: 1 } as const;
          return prioridade[b.tipo] - prioridade[a.tipo];
        });

        setNotificacoes(notificacoesNormalizadas);
        return;
      }

      const fallback = await gerarFallbackNotificacoes();
      setNotificacoes(fallback);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      const mensagem = error instanceof Error ? error.message : 'Erro ao carregar notificações';
      setError(mensagem);
      setNotificacoes([]);
    } finally {
      setLoading(false);
    }
  }, [normalizarNotificacoes, gerarFallbackNotificacoes]);

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [carregarNotificacoes]);

  const marcarComoLida = useCallback(async (notificacaoId: number) => {
    setNotificacoes(prev =>
      prev.map(n =>
        n.id === notificacaoId ? { ...n, lida: true } : n
      )
    );

    try {
      await apiService.marcarNotificacaoVencimentoComoLida(notificacaoId);
    } catch (err) {
      console.warn('Não foi possível marcar notificação como lida', err);
    }
  }, []);

  const marcarTodasComoLidas = useCallback(async () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    try {
      await apiService.marcarTodasNotificacoesVencimentoComoLidas();
    } catch (err) {
      console.warn('Não foi possível marcar todas notificações como lidas', err);
    }
  }, []);

  const handleNotificacaoClick = (notificacao: NotificacaoVencimento) => {
    marcarComoLida(notificacao.id);
    if (onNotificacaoClick) {
      onNotificacaoClick(notificacao.ordem_servico);
    }
    setIsOpen(false);
  };

  const getNotificacaoIcon = (tipo: NotificacaoVencimento['tipo']) => {
    switch (tipo) {
      case 'vencida':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'critica':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'vencendo':
        return <Bell className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getNotificacaoClasses = (tipo: NotificacaoVencimento['tipo'], lida: boolean) => {
    const baseClasses = "p-3 border-l-4 cursor-pointer transition-colors";
    const opacityClass = lida ? "opacity-60" : "";
    
    switch (tipo) {
      case 'vencida':
        return `${baseClasses} ${opacityClass} border-red-500 bg-red-50 hover:bg-red-100`;
      case 'critica':
        return `${baseClasses} ${opacityClass} border-orange-500 bg-orange-50 hover:bg-orange-100`;
      case 'vencendo':
        return `${baseClasses} ${opacityClass} border-yellow-500 bg-yellow-50 hover:bg-yellow-100`;
    }
  };

  const getTextoNotificacao = (notificacao: NotificacaoVencimento) => {
    const { tipo, dias_restantes, ordem_servico, mensagem } = notificacao;
    
    switch (tipo) {
      case 'vencida':
        return {
          titulo: 'Ordem de Serviço Vencida',
          descricao: mensagem ?? `${ordem_servico.protocolo} venceu há ${Math.abs(dias_restantes)} dia(s)`
        };
      case 'critica':
        return {
          titulo: 'Vencimento Crítico',
          descricao: mensagem ?? `${ordem_servico.protocolo} vence em ${dias_restantes} dia(s)`
        };
      case 'vencendo':
        return {
          titulo: 'Vencimento Próximo',
          descricao: mensagem ?? `${ordem_servico.protocolo} vence em ${dias_restantes} dia(s)`
        };
    }
  };

  const notificacaoesNaoLidas = notificacoes.filter(n => !n.lida);

  return (
    <div className="relative">
      {/* Botão de Notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notificações de Vencimento"
      >
        <Bell className="w-5 h-5" />
        {notificacaoesNaoLidas.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notificacaoesNaoLidas.length > 9 ? '9+' : notificacaoesNaoLidas.length}
          </span>
        )}
      </button>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notificações de Vencimento
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Fechar notificações"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Carregando...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                {error}
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nenhuma notificação de vencimento
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {notificacoes.map((notificacao) => {
                  const texto = getTextoNotificacao(notificacao);
                  return (
                    <div
                      key={`${notificacao.id}-${notificacao.tipo}`}
                      className={getNotificacaoClasses(notificacao.tipo, notificacao.lida)}
                      onClick={() => handleNotificacaoClick(notificacao)}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificacaoIcon(notificacao.tipo)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {texto.titulo}
                          </p>
                          <p className="text-sm text-gray-600">
                            {texto.descricao}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Cliente: {notificacao.ordem_servico.cliente?.nome}
                          </p>
                        </div>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notificacoes.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={carregarNotificacoes}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={loading}
              >
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button
                onClick={marcarTodasComoLidas}
                className="ml-4 text-sm text-gray-600 hover:text-gray-800"
                disabled={loading || notificacaoesNaoLidas.length === 0}
              >
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};