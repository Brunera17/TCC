import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle } from 'lucide-react';
import { apiService } from '../../lib/api';

interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  proposta_id?: number;
  para_funcionario_id: number;
  de_funcionario_id?: number;
  lida: boolean;
  data_leitura?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const formatarDataRelativa = (dataString: string): string => {
  const agora = new Date();
  const data = new Date(dataString);
  const diffMinutos = Math.floor((agora.getTime() - data.getTime()) / (1000 * 60));

  if (diffMinutos < 1) return 'Agora';
  if (diffMinutos < 60) return `${diffMinutos}min atrás`;

  const diffHoras = Math.floor(diffMinutos / 60);
  if (diffHoras < 24) return `${diffHoras}h atrás`;

  const diffDias = Math.floor(diffHoras / 24);
  return `${diffDias}d atrás`;
};

interface NotificacoesDropdownProps {
  onNotificationCountChange?: (count: number) => void;
  onNavigateToProposta?: (propostaId: number) => void;
}

export const NotificacoesDropdown: React.FC<NotificacoesDropdownProps> = ({
  onNotificationCountChange,
  onNavigateToProposta
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  const buscarNotificacoes = async () => {
    setLoading(true);
    try {
      const response = await apiService.getNotificacoes();
      const notificacoesData = response.items || response;
      setNotificacoes(notificacoesData);

      // Atualizar contador no componente pai
      const naoLidas = notificacoesData.filter((n: Notificacao) => !n.lida);
      onNotificationCountChange?.(naoLidas.length);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      buscarNotificacoes();
    }
  }, [isOpen]);

  // Buscar notificações inicialmente
  useEffect(() => {
    buscarNotificacoes();
  }, []);

  const handleClickNotificacao = async (notificacao: Notificacao) => {
    try {
      // Marcar como lida
      await apiService.marcarNotificacaoComoLida(notificacao.id);

      // Navegar para edição da proposta
      if (notificacao.proposta_id && onNavigateToProposta) {
        onNavigateToProposta(notificacao.proposta_id);
      }

      setIsOpen(false);
      buscarNotificacoes(); // Atualizar lista
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
    }
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await apiService.marcarTodasNotificacoesComoLidas();
      buscarNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {notificacoesNaoLidas.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notificacoesNaoLidas.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 bottom-full mb-2 w-80 bg-white rounded-lg shadow-lg border z-50">
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900">Notificações</h3>
              {notificacoesNaoLidas.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {notificacoesNaoLidas.length} não lida{notificacoesNaoLidas.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-custom-blue mx-auto"></div>
                </div>
              ) : notificacoes.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma notificação
                </div>
              ) : (
                notificacoes.map((notificacao) => (
                  <div
                    key={notificacao.id}
                    onClick={() => handleClickNotificacao(notificacao)}
                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!notificacao.lida ? 'bg-custom-blue-light border-l-4 border-l-custom-blue' : ''
                      }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 p-1 rounded-full ${notificacao.tipo === 'APROVACAO_DESCONTO'
                        ? 'bg-yellow-100'
                        : 'bg-custom-blue-light'
                        }`}>
                        {notificacao.tipo === 'APROVACAO_DESCONTO' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <Info className="w-4 h-4 text-custom-blue" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notificacao.lida ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                          {notificacao.titulo}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {notificacao.mensagem}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatarDataRelativa(notificacao.created_at)}
                        </p>
                      </div>

                      {!notificacao.lida && (
                        <div className="w-2 h-2 bg-custom-blue rounded-full mt-2 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {notificacoes.length > 0 && (
              <div className="p-3 border-t">
                <button
                  onClick={handleMarcarTodasLidas}
                  className="w-full text-sm text-custom-blue hover:text-custom-blue-light transition-colors"
                >
                  Marcar todas como lidas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
