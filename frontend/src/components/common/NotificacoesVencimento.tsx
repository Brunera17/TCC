import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, X, Eye } from 'lucide-react';
import { apiService } from '../../lib/api';
import type { OrdemServico } from '../../types';

interface NotificacaoVencimento {
  id: number;
  ordem_servico: OrdemServico;
  tipo: 'vencendo' | 'vencida' | 'critica';
  dias_restantes: number;
  lida: boolean;
  created_at: string;
}

interface NotificacoesVencimentoProps {
  onNotificacaoClick?: (ordemServico: OrdemServico) => void;
}

export const NotificacoesVencimento: React.FC<NotificacoesVencimentoProps> = ({
  onNotificacaoClick
}) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoVencimento[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarNotificacoes();
    // Atualizar notificações a cada 5 minutos
    const interval = setInterval(carregarNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOrdensServico({ 
        per_page: 100,
        status: 'aberta,em_andamento' 
      });
      
      const hoje = new Date();
      const notificacoesGeradas: NotificacaoVencimento[] = [];

      // Verificar se response.data existe e é um array
      if (response?.data && Array.isArray(response.data)) {
        response.data.forEach((os) => {
          const vencimento = new Date(os.vencimento);
          const diffTime = vencimento.getTime() - hoje.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let tipo: 'vencendo' | 'vencida' | 'critica' = 'vencendo';
          
          if (diffDays < 0) {
            tipo = 'vencida';
          } else if (diffDays <= 2) {
            tipo = 'critica';
          } else if (diffDays <= 7) {
            tipo = 'vencendo';
          } else {
            return; // Não criar notificação se ainda há muito tempo
          }

          notificacoesGeradas.push({
            id: os.id,
            ordem_servico: os,
            tipo,
            dias_restantes: diffDays,
            lida: false,
            created_at: new Date().toISOString()
          });
        });
      }

      // Ordenar por criticidade
      notificacoesGeradas.sort((a, b) => {
        const prioridade = { vencida: 3, critica: 2, vencendo: 1 };
        return prioridade[b.tipo] - prioridade[a.tipo];
      });

      setNotificacoes(notificacoesGeradas);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (notificacaoId: number) => {
    setNotificacoes(prev => 
      prev.map(n => 
        n.id === notificacaoId ? { ...n, lida: true } : n
      )
    );
  };

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
    const { tipo, dias_restantes, ordem_servico } = notificacao;
    
    switch (tipo) {
      case 'vencida':
        return {
          titulo: 'Ordem de Serviço Vencida',
          descricao: `${ordem_servico.protocolo} venceu há ${Math.abs(dias_restantes)} dia(s)`
        };
      case 'critica':
        return {
          titulo: 'Vencimento Crítico',
          descricao: `${ordem_servico.protocolo} vence em ${dias_restantes} dia(s)`
        };
      case 'vencendo':
        return {
          titulo: 'Vencimento Próximo',
          descricao: `${ordem_servico.protocolo} vence em ${dias_restantes} dia(s)`
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};