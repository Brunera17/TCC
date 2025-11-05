import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Eye, Edit2, BadgePercent, Hash, Calendar, User as IconUser, Building, Info, AlignLeft } from 'lucide-react';
import { apiService, ApiError } from '../lib/api';
// Importar componentes UI padronizados
import {
  PageLayout,
  PageHeader,
  SearchBar,
  IconButton,
  DataTable,
  ConfirmDialog,
  StatusBadge, // Usar StatusBadge da UI
  StateHandler,
  Pagination, // Importar Pagination
  ModalPadrao, // Import ModalPadrao
  type Column // Importar type Column
} from '../components/ui';
// Importar modais específicos
// import { ModalVisualizacao } from '../components/modals/ModalVisualizacao'; // REMOVED - Using ModalPadrao directly
import { ModalCadastroRegimeTributario } from '../components/modals/ModalCadastroRegimeTributario';

// Interface local
interface RegimeTributarioPage {
  id: number;
  nome: string;
  codigo: string;
  descricao?: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

// REMOVED Helper components InfoCard and InfoField as they are not needed for the new structure

export const RegimesTributariosPage: React.FC = () => {
  const [regimes, setRegimes] = useState<RegimeTributarioPage[]>([]);
  const [loading, setLoading] = useState(true); // Iniciar como true
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0); // Para info de paginação
  const itemsPerPage = 10; // Definir itens por página

  // Estados dos modais
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalVisualizacaoOpen, setIsModalVisualizacaoOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false); // Renomeado para consistência

  // Dados para os modais
  const [regimeParaVisualizar, setRegimeParaVisualizar] = useState<RegimeTributarioPage | null>(null);
  const [regimeParaEditar, setRegimeParaEditar] = useState<RegimeTributarioPage | null>(null);
  const [regimeParaDeletar, setRegimeParaDeletar] = useState<RegimeTributarioPage | null>(null);

  // --- Funções ---

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
        // Use format from date-fns if available, otherwise fallback
        // Assuming 'format' might not be imported globally
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Intl.DateTimeFormat('pt-BR', options).format(date);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '-';
    }
  };


  const fetchRegimes = useCallback(async (page = currentPage, search = searchTerm) => {
    setLoading(true);
    setError(''); // Limpa erro anterior
    console.log('🔍 Iniciando fetchRegimes:', { page, search });
    try {
      const response = await apiService.getRegimesTributarios({
        page,
        per_page: itemsPerPage,
        search: search || undefined, // Envia undefined se vazio
        ativo: true, // Ou ajuste conforme necessidade (ex: enviar 'all' para buscar todos)
      });
      console.log('🔍 Resposta API:', response);

      // Verifica se a resposta tem a estrutura esperada
      if (response && response.data && typeof response.total === 'number' && typeof response.per_page === 'number') {
          setRegimes(response.data);
          setTotalItems(response.total);
          setTotalPages(Math.ceil(response.total / response.per_page) || 1);
      } else if (Array.isArray(response)) {
        setRegimes(response);
        setTotalItems(response.length);
        setTotalPages(1);
        console.warn('API retornou array direto, paginação pode não funcionar corretamente.');
      } else {
        console.error('Formato de resposta inesperado da API para regimes:', response);
        throw new Error('Formato de resposta inesperado da API');
      }

    } catch (e: unknown) {
      console.error('🔍 Erro ao carregar regimes:', e);
      const errorMsg = e instanceof ApiError ? `Erro ${e.status}: ${JSON.stringify(e.details)}` : (e instanceof Error ? e.message : 'Erro desconhecido');
      setError(errorMsg);
      setRegimes([]); // Limpa dados em caso de erro
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  // Busca inicial e quando filtros mudam
  useEffect(() => {
    fetchRegimes(currentPage, searchTerm);
  }, [fetchRegimes, currentPage, searchTerm]); // Usar fetchRegimes aqui

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Volta para a primeira página ao buscar
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handlers para abrir modais
  const openModalCadastro = () => { setIsModalCadastroOpen(true); setError(''); };
  const handleEditar = (regime: RegimeTributarioPage) => { setRegimeParaEditar(regime); setIsModalEdicaoOpen(true); setError(''); };
  const handleVisualizar = (regime: RegimeTributarioPage) => { setRegimeParaVisualizar(regime); setIsModalVisualizacaoOpen(true); };
  const handleExcluirClick = (regime: RegimeTributarioPage) => { setRegimeParaDeletar(regime); setModalExclusaoOpen(true); };

  const handleFecharVisualizacao = () => {
    console.log('[Modal Visualização] onClose disparado');
    setIsModalVisualizacaoOpen(false);
    setRegimeParaVisualizar(null);
  };

  const handleConfirmarVisualizacao = () => {
    console.log('[Modal Visualização] onConfirm disparado');
    setIsModalVisualizacaoOpen(false);
    setRegimeParaVisualizar(null);
  };

  // Callbacks dos modais
  const handleRegimeCadastrado = () => { fetchRegimes(1, ''); setIsModalCadastroOpen(false); }; // Refresh first page
  const handleRegimeEditado = () => { fetchRegimes(currentPage, searchTerm); setIsModalEdicaoOpen(false); setRegimeParaEditar(null); }; // Refresh current page

  const confirmarDeletar = async () => {
    if (!regimeParaDeletar) return;
    setLoading(true); // Indicar loading durante a exclusão
    try {
      await apiService.deleteRegimeTributario(regimeParaDeletar.id);
      setModalExclusaoOpen(false);
      setRegimeParaDeletar(null);
      fetchRegimes(1, ''); // Volta para a primeira página após excluir
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : 'Erro ao excluir';
      setError(message);
      setModalExclusaoOpen(false); // Fecha o modal mesmo com erro
    } finally {
      setLoading(false);
    }
  };

  // Definição das Colunas para DataTable
  const columns: Column<RegimeTributarioPage>[] = [
    {
      key: 'nome',
      label: 'Regime',
      render: (_, item) => ( // Changed argument name to avoid confusion, using 'item' which is the second argument
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
            <BadgePercent className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{item.nome}</div>
            <div className="text-sm text-gray-500">ID: {item.id}</div>
          </div>
        </div>
      )
    },
    {
      key: 'codigo',
      label: 'Código',
      render: (_, item) => ( // Changed argument name
        <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {item.codigo}
        </span>
      )
    },
    {
      key: 'aplicavel_pf',
      label: 'Aplicabilidade',
      render: (_, item) => (
        <div className="flex flex-col space-y-1 items-start">
          {item.aplicavel_pf && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">PF</span>
          )}
          {item.aplicavel_pj && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">PJ</span>
          )}
        </div>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (_, item) => ( 
        <StatusBadge status={item.ativo ? 'ativo' : 'inativo'} />
      )
    }
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Regimes Tributários"
        subtitle="Gerencie os regimes tributários e suas configurações"
      >
        <IconButton
          icon={Plus}
          onClick={openModalCadastro}
          label="Novo Regime"
        />
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por nome ou código..."
        />
      </div>

      <StateHandler
        loading={loading}
        error={error}
        onErrorDismiss={() => setError('')}
        isEmpty={regimes.length === 0 && !loading} // Só mostra vazio se não estiver carregando
        emptyState={
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <BadgePercent className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {searchTerm ? `Nenhum regime encontrado para "${searchTerm}"` : "Nenhum regime tributário cadastrado."}
            </p>
            {!searchTerm && (
              <button onClick={openModalCadastro} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Cadastrar Novo Regime
              </button>
            )}
          </div>
        }
      >
        {/* DataTable */}
        <DataTable
          data={regimes}
          columns={columns}
          actions={(regime) => (
            <div className="flex items-center justify-end space-x-1">
              <IconButton
                icon={Eye}
                size="sm"
                variant="outline"
                onClick={() => handleVisualizar(regime)}
                title="Visualizar"
              />
              <IconButton
                icon={Edit2}
                size="sm"
                variant="outline"
                onClick={() => handleEditar(regime)}
                title="Editar"
              />
              <IconButton
                icon={Trash2}
                size="sm"
                variant="danger"
                onClick={() => handleExcluirClick(regime)}
                title="Excluir"
              />
            </div>
          )}
        />
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} resultados
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </StateHandler>

      {/* Modais */}
      <ModalCadastroRegimeTributario
        isOpen={isModalCadastroOpen}
        onClose={() => setIsModalCadastroOpen(false)}
        onRegimeCadastrado={handleRegimeCadastrado}
      />

      <ModalCadastroRegimeTributario
        isOpen={isModalEdicaoOpen}
        onClose={() => setIsModalEdicaoOpen(false)}
        onRegimeCadastrado={handleRegimeEditado} // Use callback correto
        regimeParaEditar={regimeParaEditar}
      />

       {/* Modal de Visualização Refatorado */}
        <ModalPadrao
            isOpen={isModalVisualizacaoOpen}
      onClose={handleFecharVisualizacao}
            title="Detalhes do Regime Tributário" // Standard title
            showFooter={true} // Show default footer with close button
            confirmLabel="Fechar" // Label for the confirm/close button
      onConfirm={handleConfirmarVisualizacao} // Action for the confirm/close button
            size="lg" // Adjust size as needed
            >
            {/* Content Area using structure similar to ServicosPage */}
            {regimeParaVisualizar && (
                <div className="space-y-6">
                    {/* Identificação Section */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center mb-3">
                            <Info className="w-5 h-5 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-800">Identificação</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Hash className="w-3 h-3 mr-1" /> Código</label>
                                <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded w-fit">{regimeParaVisualizar.codigo}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Regime</label>
                                <p className="text-gray-900 font-semibold">{regimeParaVisualizar.nome}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                <StatusBadge status={regimeParaVisualizar.ativo ? 'ativo' : 'inativo'} />
                            </div>
                        </div>
                    </div>

                    {/* Aplicabilidade Section */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center mb-3">
                            <Building className="w-5 h-5 text-emerald-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-800">Aplicabilidade</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><IconUser className="w-3 h-3 mr-1" /> Pessoa Física</label>
                                <p className={`text-gray-900 ${regimeParaVisualizar.aplicavel_pf ? 'font-medium text-green-700' : 'italic text-gray-500'}`}>{regimeParaVisualizar.aplicavel_pf ? 'Sim' : 'Não'}</p>
                            </div>
                            <div>
                                <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Building className="w-3 h-3 mr-1" /> Pessoa Jurídica</label>
                                <p className={`text-gray-900 ${regimeParaVisualizar.aplicavel_pj ? 'font-medium text-green-700' : 'italic text-gray-500'}`}>{regimeParaVisualizar.aplicavel_pj ? 'Sim' : 'Não'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Descrição Section */}
                    {regimeParaVisualizar.descricao && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center mb-3"><AlignLeft className="w-5 h-5 text-gray-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Descrição</h3></div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{regimeParaVisualizar.descricao}</p>
                        </div>
                    )}

                    {/* Datas Section */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center mb-3"><Calendar className="w-5 h-5 text-purple-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Datas</h3></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Data de Criação</label>
                                <p className="text-gray-900">{formatDate(regimeParaVisualizar.created_at)}</p>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Última Atualização</label>
                                <p className="text-gray-900">{formatDate(regimeParaVisualizar.updated_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ModalPadrao>
      {/* --- End Refactored Modal --- */}


      <ConfirmDialog
        open={modalExclusaoOpen}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o regime "${regimeParaDeletar?.nome}" (Código: ${regimeParaDeletar?.codigo})? Esta ação marcará o regime como inativo.`}
        onConfirm={confirmarDeletar}
        onCancel={() => setModalExclusaoOpen(false)}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger" // Usa a variante de perigo
      />
    </PageLayout>
  );
};

