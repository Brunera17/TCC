import { useState, useEffect, useMemo } from 'react';
import {
    Edit, Tag, List, DollarSign, Settings, CheckCircle,
    MessageSquare, Clock, X, Search, Filter, Calendar,
    User, ArrowRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { apiService } from '../lib/api';

interface HistoricoLogsProps {
    propostaId: number;
    isOpen: boolean;
    onClose: () => void;
}

interface Log {
    id: number;
    proposta_id: number;
    funcionario_id: number;
    acao: string;
    detalhes: string;
    detalhes_formatados?: any;
    created_at: string;
    funcionario?: {
        id: number;
        nome: string;
        email: string;
    };
}

export const HistoricoLogs: React.FC<HistoricoLogsProps> = ({
    propostaId,
    isOpen,
    onClose
}) => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (isOpen && propostaId) {
            carregarLogs();
        }
    }, [isOpen, propostaId]);

    const carregarLogs = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await apiService.getLogsPropostas(propostaId);
            setLogs(response.logs || []);
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            setError('Erro ao carregar histórico de alterações');
        } finally {
            setLoading(false);
        }
    };

    const getIconeAcao = (acao: string) => {
        const icones = {
            'PROPOSTA_EDITADA': <Edit className="w-4 h-4 text-custom-blue" />,
            'STATUS_ALTERADO': <Tag className="w-4 h-4 text-purple-600" />,
            'SERVICOS_ALTERADOS': <List className="w-4 h-4 text-green-600" />,
            'DESCONTO_ALTERADO': <DollarSign className="w-4 h-4 text-orange-600" />,
            'CONFIGURACOES_ALTERADAS': <Settings className="w-4 h-4 text-indigo-600" />,
            'PROPOSTA_FINALIZADA': <CheckCircle className="w-4 h-4 text-emerald-600" />,
            'OBSERVACOES_ALTERADAS': <MessageSquare className="w-4 h-4 text-gray-600" />
        };
        return icones[acao as keyof typeof icones] || <Clock className="w-4 h-4 text-gray-500" />;
    };

    const formatarDetalhes = (log: Log) => {
        if (typeof log.detalhes_formatados === 'object') {
            return (
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
                    {JSON.stringify(log.detalhes_formatados, null, 2)}
                </pre>
            );
        }
        return <p className="text-sm text-gray-600 mt-1">{log.detalhes_formatados || log.detalhes}</p>;
    };

    const formatarAcao = (acao: string) => {
        return acao.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    // Funções de filtro e formatação
    const getAcaoInfo = (acao: string) => {
        const acoes = {
            'PROPOSTA_EDITADA': {
                label: 'Proposta Editada',
                color: 'blue',
                bgColor: 'bg-custom-blue-light',
                borderColor: 'border-custom-blue',
                dotColor: 'bg-custom-blue',
                iconBgColor: 'bg-custom-blue-light'
            },
            'STATUS_ALTERADO': {
                label: 'Status Alterado',
                color: 'purple',
                bgColor: 'bg-purple-50',
                borderColor: 'border-purple-200',
                dotColor: 'bg-purple-500',
                iconBgColor: 'bg-purple-100'
            },
            'SERVICOS_ALTERADOS': {
                label: 'Serviços Alterados',
                color: 'green',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                dotColor: 'bg-green-500',
                iconBgColor: 'bg-green-100'
            },
            'DESCONTO_ALTERADO': {
                label: 'Desconto Alterado',
                color: 'orange',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-200',
                dotColor: 'bg-orange-500',
                iconBgColor: 'bg-orange-100'
            },
            'CONFIGURACOES_ALTERADAS': {
                label: 'Configurações Alteradas',
                color: 'indigo',
                bgColor: 'bg-indigo-50',
                borderColor: 'border-indigo-200',
                dotColor: 'bg-indigo-500',
                iconBgColor: 'bg-indigo-100'
            },
            'PROPOSTA_FINALIZADA': {
                label: 'Proposta Finalizada',
                color: 'emerald',
                bgColor: 'bg-emerald-50',
                borderColor: 'border-emerald-200',
                dotColor: 'bg-emerald-500',
                iconBgColor: 'bg-emerald-100'
            },
            'OBSERVACOES_ALTERADAS': {
                label: 'Observações Alteradas',
                color: 'gray',
                bgColor: 'bg-gray-50',
                borderColor: 'border-gray-200',
                dotColor: 'bg-gray-500',
                iconBgColor: 'bg-gray-100'
            }
        };
        return acoes[acao as keyof typeof acoes] || {
            label: 'Outra Ação',
            color: 'gray',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            dotColor: 'bg-gray-500',
            iconBgColor: 'bg-gray-100'
        };
    };

    const formatarDataRelativa = (data: string) => {
        const agora = new Date();
        const dataLog = new Date(data);
        const diffMs = agora.getTime() - dataLog.getTime();
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMin < 1) return 'Agora mesmo';
        if (diffMin < 60) return `${diffMin} min atrás`;
        if (diffHrs < 24) return `${diffHrs}h atrás`;
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `${diffDays} dias atrás`;

        return dataLog.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatarDataCompleta = (data: string) => {
        return new Date(data).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Filtros e busca
    const filteredLogs = useMemo(() => {
        let filtered = logs;

        // Filtro por tipo de ação
        if (selectedFilter !== 'all') {
            filtered = filtered.filter(log => log.acao === selectedFilter);
        }

        // Busca por texto
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(log =>
                log.detalhes.toLowerCase().includes(term) ||
                log.funcionario?.nome.toLowerCase().includes(term) ||
                getAcaoInfo(log.acao).label.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [logs, selectedFilter, searchTerm]);

    // Contadores para filtros
    const actionCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        logs.forEach(log => {
            counts[log.acao] = (counts[log.acao] || 0) + 1;
        });
        return counts;
    }, [logs]);

    const availableFilters = useMemo(() => {
        const filters = Object.keys(actionCounts);
        return filters.map(acao => ({
            value: acao,
            label: getAcaoInfo(acao).label,
            count: actionCounts[acao]
        }));
    }, [actionCounts]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Histórico de Alterações</h3>
                                <p className="text-gray-300 text-sm">Proposta #{propostaId}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Barra de Busca */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar no histórico..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                        />
                    </div>
                </div>

                {/* Filtros */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Filter className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Filtros:</span>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <span>Filtros</span>
                            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedFilter('all')}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${selectedFilter === 'all'
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                Todas ({logs.length})
                            </button>
                            {availableFilters.map(filter => (
                                <button
                                    key={filter.value}
                                    onClick={() => setSelectedFilter(filter.value)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${selectedFilter === filter.value
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {filter.label} ({filter.count})
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Carregando histórico...</p>
                            <p className="text-gray-500 text-sm mt-1">Buscando todas as alterações da proposta</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
                                <p className="text-red-700 mb-4">{error}</p>
                                <button
                                    onClick={carregarLogs}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                {searchTerm || selectedFilter !== 'all' ? 'Nenhum resultado encontrado' : 'Nenhuma alteração registrada'}
                            </h3>
                            <p className="text-gray-500">
                                {searchTerm || selectedFilter !== 'all'
                                    ? 'Tente ajustar os filtros ou termos de busca'
                                    : 'As alterações aparecerão aqui quando forem feitas'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline */}
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                            <div className="space-y-6">
                                {filteredLogs.map((log, index) => {
                                    const acaoInfo = getAcaoInfo(log.acao);
                                    return (
                                        <div key={log.id} className="relative">
                                            {/* Timeline dot */}
                                            <div className={`absolute left-5 top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm ${acaoInfo.dotColor}`}></div>

                                            {/* Card */}
                                            <div className={`ml-12 ${acaoInfo.bgColor} ${acaoInfo.borderColor} border rounded-xl p-4 hover:shadow-md transition-all duration-200`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-8 h-8 ${acaoInfo.iconBgColor} rounded-lg flex items-center justify-center`}>
                                                            {getIconeAcao(log.acao)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">
                                                                {acaoInfo.label}
                                                            </h4>
                                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                                <User className="w-4 h-4" />
                                                                <span>{log.funcionario?.nome || 'Usuário desconhecido'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-gray-500 font-medium">
                                                            {formatarDataRelativa(log.created_at)}
                                                        </div>
                                                        <div className="text-xs text-gray-400" title={formatarDataCompleta(log.created_at)}>
                                                            {formatarDataCompleta(log.created_at)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Detalhes */}
                                                <div className="bg-white rounded-lg p-3 border border-gray-100">
                                                    {typeof log.detalhes_formatados === 'object' ? (
                                                        <div className="space-y-2">
                                                            {Object.entries(log.detalhes_formatados).map(([key, value]) => (
                                                                <div key={key} className="flex items-start space-x-2">
                                                                    <ArrowRight className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                                                                    <div className="flex-1">
                                                                        <span className="text-xs font-medium text-gray-600 capitalize">
                                                                            {key.replace(/_/g, ' ')}:
                                                                        </span>
                                                                        <span className="text-xs text-gray-800 ml-1">
                                                                            {String(value)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-700">
                                                            {log.detalhes_formatados || log.detalhes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {filteredLogs.length} de {logs.length} registro{logs.length !== 1 ? 's' : ''}
                                {searchTerm || selectedFilter !== 'all' ? ' filtrado' : ''}
                            </span>
                        </div>
                        {logs.length > 0 && (
                            <div className="flex items-center space-x-1">
                                <span>•</span>
                                <span>Última alteração: {formatarDataRelativa(logs[0].created_at)}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedFilter('all');
                                setShowFilters(false);
                            }}
                            className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Limpar Filtros
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
