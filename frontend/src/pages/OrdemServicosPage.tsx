import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  Edit2,
  Clock,
  Building,
  User,
  History,
  Package,
  List,
  Calendar,
  FileText,
  Handshake
} from 'lucide-react';
import { format } from 'date-fns';

import { apiService, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  PageLayout,
  PageHeader,
  SearchBar,
  IconButton,
  DataTable,
  ConfirmDialog,
  StatusBadge,
  StateHandler,
  Pagination,
  ModalPadrao, // <-- O componente correto está importado aqui
  type Column
} from '../components/ui';
import { NotificacoesVencimento } from '../components/common/NotificacoesVencimento';
import { HistoricoAlteracoes } from '../components/common/HistoricoAlteracoes';
import { formatarMoeda } from '../utils/formatters';

import { ModalCadastroOrdemServico } from '../components/modals/ModalCadastroOrdemServico';
import { ModalEdicaoOrdemServico } from '../components/modals/ModalEdicaoOrdemServico';

import type {
  Cliente,
  Departamento,
  Servico,
  OrdemServico 
} from '../types';

// --- Interfaces Baseadas no Backend Model ---

type OrdemServicoStatus = 'aberta' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';

const STATUS_OPTIONS: { value: OrdemServicoStatus; label: string }[] = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

type OrdensServicoResponse = {
  data: OrdemServico[];
  total: number;
  per_page: number;
};

type PaginatedResponse<T> = {
  data: T[];
};

const isPaginatedOrdensResponse = (response: unknown): response is OrdensServicoResponse => {
  if (!response || typeof response !== 'object') {
    return false;
  }
  const candidate = response as Partial<OrdensServicoResponse>;
  return Array.isArray(candidate.data) && typeof candidate.total === 'number' && typeof candidate.per_page === 'number';
};

const isOrdemServicoArray = (value: unknown): value is OrdemServico[] => {
  return Array.isArray(value) && value.every((item) => item && typeof item === 'object' && 'id' in item);
};

const extractData = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) {
    return response as T[];
  }
  if (response && typeof response === 'object') {
    const candidate = response as PaginatedResponse<T>;
    if (Array.isArray(candidate.data)) {
      return candidate.data;
    }
  }
  return [];
};

// --- Componente Principal ---

export const OrdemServicosPage: React.FC = () => {
  const { user } = useAuth();
  const { showWarning, showError, showSuccess } = useToast();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [todosServicos, setTodosServicos] = useState<Servico[]>([]); 

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<OrdemServicoStatus | ''>('');
  const itemsPerPage = 10;

  // Estados de modal
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalVisualizacaoOpen, setIsModalVisualizacaoOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false);

  // Estados de item selecionado
  const [ordemParaVisualizar, setOrdemParaVisualizar] = useState<OrdemServico | null>(null);
  const [ordemParaEditar, setOrdemParaEditar] = useState<OrdemServico | null>(null);
  const [ordemParaDeletar, setOrdemParaDeletar] = useState<OrdemServico | null>(null);
  const [ordemParaHistorico, setOrdemParaHistorico] = useState<OrdemServico | null>(null);

  // Permissão
  const isAdmin = Boolean(user?.gerente);

  // --- Mapas de Consulta ---
  const clienteMap = useMemo(() => {
    const map = new Map<number, string>();
    clientes.forEach(c => map.set(c.id, c.nome));
    return map;
  }, [clientes]);

  const departamentoMap = useMemo(() => {
    const map = new Map<number, string>();
    departamentos.forEach(d => map.set(d.id, d.nome));
    return map;
  }, [departamentos]);

  // --- Funções de Busca de Dados ---
  const fetchOrdens = useCallback(async (page = currentPage, search = searchTerm, status = filtroStatus) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        per_page: itemsPerPage,
        search: search || undefined,
        status: status || undefined,
      };

      const response = await apiService.getOrdensServico(params);

      if (isPaginatedOrdensResponse(response)) {
        setOrdens(response.data);
        setTotalPages(Math.ceil(response.total / response.per_page) || 1);
      } else if (isOrdemServicoArray(response)) {
        setOrdens(response);
        setTotalPages(1);
      } else {
        throw new Error("Formato de resposta inesperado da API");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
      setError(errorMsg);
      setOrdens([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filtroStatus, itemsPerPage]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [clientesRes, deptosRes, servicosRes] = await Promise.all([
        apiService.getClientes({ per_page: 1000, ativo: true }),
        apiService.getDepartamentos({ per_page: 1000, ativo: true }),
        apiService.getServicos({ per_page: 1000, ativo: true }) 
      ]);
      
      setClientes(extractData<Cliente>(clientesRes));
      setDepartamentos(extractData<Departamento>(deptosRes));

      const servicosData = extractData<Servico>(servicosRes);
      const servicosFormatados = servicosData.map((servico) => ({
        ...servico,
        valor_base: servico.valor_unitario ?? servico.valor_base ?? servico.preco_base ?? 0
      }));
      setTodosServicos(servicosFormatados);

    } catch (err) {
      console.error("Erro ao carregar dependências:", err);
      setError("Falha ao carregar clientes, departamentos ou serviços.");
    }
  }, []);

  useEffect(() => {
    fetchOrdens(currentPage, searchTerm, filtroStatus);
  }, [fetchOrdens, currentPage, searchTerm, filtroStatus]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  // --- Funções Auxiliares ---
  const formatarData = (dataStr: string) => {
    try {
      // Adiciona 'T00:00:00' se a data for apenas YYYY-MM-DD para evitar problemas de fuso
      const dateObj = new Date(dataStr.includes('T') ? dataStr : `${dataStr}T00:00:00`);
      return format(dateObj, 'dd/MM/yyyy');
    } catch {
      return 'Data inválida';
    }
  };

  const getBadgeStatus = (status: OrdemServicoStatus) => {
    return <StatusBadge status={status} />;
  };

  // --- Colunas da Tabela ---
  const columns: Column<OrdemServico>[] = [
    {
      key: 'protocolo',
      label: 'Protocolo',
      render: (_, os) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
            <Handshake className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{os.protocolo}</div>
            <div className="text-sm text-gray-500">ID: {os.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (_, os) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {os.cliente?.nome || clienteMap.get(os.cliente_id) || 'Cliente não encontrado'}
          </div>
          <div className="text-sm text-gray-500">
            {os.cliente?.email || 'Email não disponível'}
          </div>
        </div>
      ),
    },
    {
      key: 'departamento',
      label: 'Departamento',
      render: (_, os) => (
        <span className="text-sm text-gray-700">
          {os.departamento?.nome || departamentoMap.get(os.departamento_id || 0) || 'N/A'}
        </span>
      ),
    },
    {
      key: 'vencimento',
      label: 'Vencimento',
      render: (_, os) => (
        <span className="text-sm text-gray-700">{formatarData(os.vencimento)}</span>
      ),
    },
    {
      key: 'valor_total_os',
      label: 'Valor Total',
      render: (_, os) => (
        <span className="text-sm font-medium text-green-700">
          {formatarMoeda(os.valor_total_os)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, os) => getBadgeStatus(os.status),
    },
  ];

  // --- Handlers de Ação ---
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };
  const handleFiltroStatus = (status: string) => {
    setFiltroStatus(status as OrdemServicoStatus | '');
    setCurrentPage(1);
  };

  // Handlers de Modais
  const openModalCadastro = () => {
    setIsModalCadastroOpen(true);
  };
  
  const handleVisualizar = (os: OrdemServico) => {
    setOrdemParaVisualizar(os);
    setIsModalVisualizacaoOpen(true);
  };

  const handleEditar = (os: OrdemServico) => {
    setOrdemParaEditar(os);
    setIsModalEdicaoOpen(true);
  };

  const handleHistorico = (os: OrdemServico) => {
    setOrdemParaHistorico(os);
    setModalHistoricoOpen(true);
  };

  const handleExcluirClick = (os: OrdemServico) => {
    setOrdemParaDeletar(os);
    setModalExclusaoOpen(true);
  };

  const downloadOrdemServico = useCallback(async (ordemId: number) => {
    try {
      const params = new URLSearchParams({ download: 'true', orientacao: 'paisagem' });
      const url = apiService.normalizeUrl(`ordens-servico/${ordemId}/pdf?${params.toString()}`);
      const headers = new Headers();
      const token = apiService.getValidToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        let detalhes = `Falha ao gerar PDF (HTTP ${response.status})`;
        try {
          const data = await response.json();
          if (typeof data?.error === 'string') {
            detalhes = data.error;
          }
        } catch {
          // Ignora corpo inválido
        }
        showError('Erro ao gerar PDF', detalhes);
        return;
      }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `ordem-servico-${ordemId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.open(downloadUrl, '_blank', 'noopener');

  setTimeout(() => URL.revokeObjectURL(downloadUrl), 3000);
      showSuccess('Download iniciado', 'O PDF da ordem de serviço está sendo baixado.');
    } catch (err) {
      console.warn('Download de OS indisponível', err);
      showError('Erro ao gerar PDF', 'Não foi possível gerar o documento. Tente novamente mais tarde.');
    }
  }, [showError, showSuccess]);

  // Handlers de CRUD
  const confirmarDeletar = async () => {
    if (!ordemParaDeletar) return;
    if (ordemParaDeletar.status === 'concluida') {
      showWarning('Ação não permitida', 'Não é permitido excluir ordens de serviço concluídas.');
      setModalExclusaoOpen(false);
      return;
    }
    setLoading(true);
    try {
      await apiService.deleteOrdemServico(ordemParaDeletar.id);
      setModalExclusaoOpen(false);
      setOrdemParaDeletar(null);
      fetchOrdens(1); 
    } catch (err: unknown) {
      const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
      setError(errorMsg); 
      setModalExclusaoOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderização ---
  return (
    <PageLayout>
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Gerencie e acompanhe o progresso das ordens de serviço"
      >
        <div className="flex items-center space-x-2">
          <NotificacoesVencimento onNotificacaoClick={handleVisualizar} />
          {isAdmin && (
            <IconButton icon={Plus} onClick={openModalCadastro} label="Nova OS" />
          )}
        </div>
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Buscar por protocolo, cliente ou departamento..."
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => handleFiltroStatus(e.target.value)}
            className="w-full md:w-56 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            aria-label="Filtrar por status"
          >
            <option value="">Todos os Status</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <StateHandler
        loading={loading}
        error={error}
        onErrorDismiss={() => setError('')}
        isEmpty={ordens.length === 0 && !loading}
        emptyState={
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {searchTerm || filtroStatus ? `Nenhuma OS encontrada para os filtros aplicados` : "Nenhuma Ordem de Serviço cadastrada."}
            </p>
            {!searchTerm && !filtroStatus && (
               <button onClick={openModalCadastro} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
                 + Cadastrar Nova OS
               </button>
             )}
          </div>
        }
      >
        <DataTable
          data={ordens}
          columns={columns}
          actions={(os) => (
            <div className="flex items-center justify-end space-x-1">
              <IconButton icon={Eye} size="sm" variant="outline" onClick={() => handleVisualizar(os)} title="Visualizar"/>
              <IconButton icon={Edit2} size="sm" variant="outline" onClick={() => handleEditar(os)} title="Editar"/>
              <IconButton icon={History} size="sm" variant="outline" onClick={() => handleHistorico(os)} title="Histórico"/>
              <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => handleExcluirClick(os)} title="Excluir"/>
            </div>
          )}
        />
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 rounded-b-lg">
             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </StateHandler>

      {/* --- Modais --- */}

      <ModalCadastroOrdemServico
        isOpen={isModalCadastroOpen}
        onClose={() => setIsModalCadastroOpen(false)}
        onCreated={() => {
          setIsModalCadastroOpen(false);
          fetchOrdens(1); 
        }}
        clientes={clientes}
        departamentos={departamentos}
        servicos={todosServicos} 
        usuarioId={user?.id || 0} 
      />

      {/* --- CORREÇÃO AQUI --- */}
      {/* Trocado <ModalVisualizacao> por <ModalPadrao> */}
      <ModalPadrao
        isOpen={isModalVisualizacaoOpen}
        onClose={() => setIsModalVisualizacaoOpen(false)}
        title="Detalhes da Ordem de Serviço"
        confirmLabel="Download"
        onConfirm={() => {
          if (ordemParaVisualizar) {
            void downloadOrdemServico(ordemParaVisualizar.id);
          }
        }}
        size="lg"
      >
        {ordemParaVisualizar && (
           <div className="space-y-6">
             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center">
                   <FileText className="w-5 h-5 text-blue-600 mr-2" />
                   <h3 className="text-lg font-semibold text-gray-800">Protocolo: {ordemParaVisualizar.protocolo}</h3>
                 </div>
                 {getBadgeStatus(ordemParaVisualizar.status)}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><User className="w-3 h-3 mr-1" /> Cliente</label>
                   <p className="text-gray-900 font-semibold">{ordemParaVisualizar.cliente?.nome || clienteMap.get(ordemParaVisualizar.cliente_id) || 'N/A'}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Building className="w-3 h-3 mr-1" /> Departamento</label>
                   <p className="text-gray-900">{ordemParaVisualizar.departamento?.nome || departamentoMap.get(ordemParaVisualizar.departamento_id || 0) || 'N/A'}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Calendar className="w-3 h-3 mr-1" /> Abertura</label>
                   <p className="text-gray-900">{formatarData(ordemParaVisualizar.data_abertura)}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Clock className="w-3 h-3 mr-1" /> Vencimento</label>
                   <p className="text-gray-900 font-medium">{formatarData(ordemParaVisualizar.vencimento)}</p>
                 </div>
               </div>
             </div>

             {ordemParaVisualizar.observacao && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ordemParaVisualizar.observacao}</p>
                </div>
             )}

             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center">
                     <List className="w-5 h-5 text-green-600 mr-2" />
                     <h3 className="text-lg font-semibold text-gray-800">Itens da OS</h3>
                   </div>
                   <div className="text-right">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Valor Total</label>
                      <p className="text-xl font-bold text-green-700">{formatarMoeda(ordemParaVisualizar.valor_total_os)}</p>
                   </div>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ordemParaVisualizar.itens.length > 0 ? (
                    ordemParaVisualizar.itens.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-white border rounded-md">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.servico?.nome || `Serviço ID: ${item.servico_id}`}</p>
                          <p className="text-xs text-gray-600">
                            {item.quantidade}x {formatarMoeda(item.valor_unitario)}
                            {item.desconto > 0 && <span className="text-red-600 ml-1">(-{item.desconto}%)</span>}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{formatarMoeda(item.valor_total)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic text-center">Nenhum item adicionado a esta OS.</p>
                  )}
                </div>
             </div>
           </div>
        )}
      </ModalPadrao>
      {/* --- FIM DA CORREÇÃO --- */}

      <ModalEdicaoOrdemServico
        isOpen={isModalEdicaoOpen}
        onClose={() => {
          setIsModalEdicaoOpen(false);
          setOrdemParaEditar(null);
          setError(''); 
        }}
        onSaved={() => {
          setIsModalEdicaoOpen(false);
          setOrdemParaEditar(null);
          fetchOrdens(currentPage); 
        }}
        ordemParaEditar={ordemParaEditar}
        clientes={clientes}
        departamentos={departamentos}
        servicos={todosServicos}
      />

      <ConfirmDialog
        open={modalExclusaoOpen}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a Ordem de Serviço "${ordemParaDeletar?.protocolo}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmarDeletar}
        onCancel={() => setModalExclusaoOpen(false)}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />

      {ordemParaHistorico && (
        <HistoricoAlteracoes
          isOpen={modalHistoricoOpen}
          onClose={() => setModalHistoricoOpen(false)}
          ordemServico={ordemParaHistorico}
        />
      )}
    </PageLayout>
  );
};

export default OrdemServicosPage;