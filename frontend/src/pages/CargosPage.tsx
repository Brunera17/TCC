import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  Edit2,
  Briefcase,
  FileText,
  TrendingUp,
  AlertTriangle,
  Building,
  Calendar
} from 'lucide-react';
import { apiService, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
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
  ModalPadrao, // Usar ModalPadrao
  type Column
} from '../components/ui';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ModalCadastroDepartamento } from '../components/modals/ModalCadastroDepartamento';
import { format } from 'date-fns'; // Para o modal de visualização
import type { Cargo as CargoBase, Departamento } from '../types';

// --- Interfaces ---

type Cargo = CargoBase & { tipo?: string };

// Interface para o formulário (sem código)
interface CargoFormData {
  nome: string;
  descricao: string;
  tipo: string;
  departamento_id: string; // Usar string para o select
}

// Opções de Nível/Tipo (se 'tipo' for um dropdown)
// Se 'tipo' for texto livre, remova esta constante e mude o <select> para <input>
const tiposCargo = [
  "Operacional",
  "Técnico",
  "Estratégico",
  "Gestão",
  "N/A"
];

export const CargosPage: React.FC = () => {
  const { user } = useAuth();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]); // Estado para departamentos
  const empresaUsuarioId = useMemo(() => user?.empresa_id ?? user?.empresa?.id ?? null, [user]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Estados dos modais
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);

  // Dados para os modais
  const [cargoParaVisualizar, setCargoParaVisualizar] = useState<Cargo | null>(null);
  const [cargoParaEditar, setCargoParaEditar] = useState<Cargo | null>(null);
  const [cargoParaDeletar, setCargoParaDeletar] = useState<Cargo | null>(null);
  const [isModalDepartamentoOpen, setIsModalDepartamentoOpen] = useState(false);

  // Estado do formulário (atualizado)
  const [formData, setFormData] = useState<CargoFormData>({
    nome: '',
    descricao: '',
    tipo: '',
    departamento_id: '',
  });

  // Permissão de admin
  const isAdmin = Boolean(user?.gerente);
  const [verificandoPermissao, setVerificandoPermissao] = useState(true);

  useEffect(() => {
    setVerificandoPermissao(false);
  }, [user]);

  // --- Funções ---

  // Mapa de Departamentos para exibição na tabela
  const departamentoMap = useMemo(() => {
    const map = new Map<number, string>();
    departamentos.forEach(d => map.set(d.id, d.nome));
    return map;
  }, [departamentos]);

  // Busca Departamentos (necessário para o <select> do formulário)
  const fetchDepartamentos = useCallback(async () => {
    if (!isAdmin) return;
    if (!empresaUsuarioId) {
      setDepartamentos([]);
      setError('Seu usuário não está vinculado a uma empresa. Entre em contato com o administrador.');
      return;
    }

    try {
      const response = await apiService.getDepartamentos({ per_page: 1000, ativo: true, empresa_id: empresaUsuarioId });
      if (response && response.data) {
        setDepartamentos(response.data);
      } else if (Array.isArray(response)) {
        setDepartamentos(response);
      }
    } catch (err) {
      console.error('Erro ao buscar departamentos:', err);
      if (err instanceof ApiError && err.status === 403) {
        setError('Seu usuário não está vinculado a uma empresa. Entre em contato com o administrador.');
        setDepartamentos([]);
        return;
      }
      setError('Falha ao carregar lista de departamentos. O cadastro pode não funcionar.');
    }
  }, [isAdmin, empresaUsuarioId]);

  const fetchCargos = useCallback(async (page = currentPage, search = searchTerm) => {
    if (!isAdmin) {
      setLoading(false);
      setCargos([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await apiService.getCargos({
        page,
        per_page: itemsPerPage,
        search: search || undefined
      });
      
      if (response && response.data && typeof response.total === 'number' && typeof response.per_page === 'number') {
        setCargos(response.data);
        setTotalPages(Math.ceil(response.total / response.per_page) || 1);
      } else if (Array.isArray(response)) {
        setCargos(response);
        setTotalPages(1);
      } else {
         throw new Error("Formato de resposta inesperado da API");
      }
    } catch (err: unknown) {
      console.error('Erro ao buscar cargos:', err);
      const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
      setError(errorMsg);
      setCargos([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage, searchTerm]);

  // Busca inicial (Cargos e Departamentos)
  useEffect(() => {
    if(isAdmin) {
        fetchCargos(currentPage, searchTerm);
        fetchDepartamentos();
    }
  }, [fetchCargos, fetchDepartamentos, currentPage, searchTerm, isAdmin]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleInputChange = (field: keyof CargoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if(error) setError('');
  };

  const resetForm = () => {
    setFormData({ nome: '', descricao: '', tipo: '', departamento_id: '' });
    setError('');
  };

  // Handlers de Modal
  const openModalCadastro = () => { resetForm(); setIsModalCadastroOpen(true); };
  const handleVisualizar = (cargo: Cargo) => { setCargoParaVisualizar(cargo); };
  const handleExcluirClick = (cargo: Cargo) => { setCargoParaDeletar(cargo); setModalExclusaoOpen(true); };
  
  const abrirModalEdicao = (cargo: Cargo) => {
    setCargoParaEditar(cargo);
    setFormData({
      nome: cargo.nome,
      descricao: cargo.descricao || '',
      tipo: cargo.tipo || '',
      departamento_id: cargo.departamento_id?.toString() || ''
    });
    setError('');
    setIsModalEdicaoOpen(true);
  };
  
  const handleCadastroClose = () => { setIsModalCadastroOpen(false); resetForm(); };
  const handleEdicaoClose = () => { setIsModalEdicaoOpen(false); setCargoParaEditar(null); resetForm(); };

  const handleDepartamentoCadastrado = (novoDepartamento: Departamento) => {
    if (!novoDepartamento || typeof novoDepartamento.id === 'undefined') {
      console.error('Departamento retornado sem ID válido:', novoDepartamento);
      setError('Departamento criado sem identificador válido. Atualize a página e tente novamente.');
      return;
    }
    setDepartamentos(prev => {
      const exists = prev.some(depto => depto.id === novoDepartamento.id);
      return exists
        ? prev.map(depto => (depto.id === novoDepartamento.id ? novoDepartamento : depto))
        : [...prev, novoDepartamento];
    });
    setFormData(prev => ({ ...prev, departamento_id: novoDepartamento.id.toString() }));
    setIsModalDepartamentoOpen(false);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim() || !formData.departamento_id) {
      setError('Nome e Departamento são obrigatórios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const dadosParaApi = {
         ...formData,
         departamento_id: parseInt(formData.departamento_id),
         ativo: true // Assumindo que sempre é criado como ativo
      };
      await apiService.createCargo(dadosParaApi);
      handleCadastroClose();
      fetchCargos(1); // Volta para a pág 1
    } catch (err: unknown) {
      console.error('Erro ao criar cargo:', err);
      if (err instanceof ApiError && err.details) { setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details)); }
      else if (err instanceof Error) { setError(err.message); }
      else { setError('Erro desconhecido ao criar cargo.'); }
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = async () => {
    if (!cargoParaEditar || !formData.nome.trim() || !formData.departamento_id) {
      setError('Nome e Departamento são obrigatórios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const dadosParaApi = {
        nome: formData.nome,
        descricao: formData.descricao,
        tipo: formData.tipo,
        departamento_id: parseInt(formData.departamento_id)
      };
      await apiService.updateCargo(cargoParaEditar.id, dadosParaApi);
      handleEdicaoClose();
      fetchCargos(); // Recarrega a página atual
    } catch (err: unknown) {
      console.error('Erro ao editar cargo:', err);
      if (err instanceof ApiError && err.details) { setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details)); }
      else if (err instanceof Error) { setError(err.message); }
      else { setError('Erro desconhecido ao editar cargo.'); }
    } finally {
      setLoading(false);
    }
  };

  const confirmarDeletar = async () => {
    if (!cargoParaDeletar) return;
    setLoading(true);
    try {
      await apiService.deleteCargo(cargoParaDeletar.id);
      setModalExclusaoOpen(false);
      setCargoParaDeletar(null);
      fetchCargos(1); // Volta para pág 1
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir';
      setError(message);
      setModalExclusaoOpen(false);
      setCargoParaDeletar(null);
    } finally {
      setLoading(false);
    }
  };

  // --- Colunas da Tabela ---
  const columns: Column<Cargo>[] = [
    {
      key: 'nome',
      label: 'Cargo',
      render: (_nome, cargo) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
            <Briefcase className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{cargo.nome}</div>
            <div className="text-sm text-gray-500">
              {cargo.departamento
                ? cargo.departamento.nome
                : cargo.departamento_id != null
                  ? departamentoMap.get(cargo.departamento_id) || 'Dept. não encontrado'
                  : 'Dept. não informado'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (tipo) => {
        const displayTipo = typeof tipo === 'string' || typeof tipo === 'number' ? tipo : '-';
        return <span className="text-sm text-gray-700">{displayTipo || '-'}</span>;
      }
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (ativo) => <StatusBadge status={ativo ? 'ativo' : 'inativo'} />
    }
  ];

  // --- Renderização ---

  if (verificandoPermissao) {
    return (
      <PageLayout>
        <PageHeader title="Cargos" subtitle="Gerencie os cargos da sua empresa" />
         <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <PageHeader title="Cargos" />
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm border border-red-200 p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para gerenciar cargos.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader title="Cargos" subtitle="Gerencie os cargos da sua empresa">
        <IconButton icon={Plus} onClick={openModalCadastro} label="Novo Cargo" />
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
  <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Buscar por nome..." />
      </div>
      
      {error && !isModalCadastroOpen && !isModalEdicaoOpen && (
         <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">
           {error}
         </div>
      )}

      <StateHandler
        loading={loading}
        error={undefined}
        isEmpty={cargos.length === 0 && !loading}
        emptyState={
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {searchTerm ? `Nenhum cargo encontrado para "${searchTerm}"` : "Nenhum cargo cadastrado."}
            </p>
            {!searchTerm && (
               <button onClick={openModalCadastro} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
                 + Cadastrar Novo Cargo
               </button>
             )}
          </div>
        }
      >
        <DataTable
          data={cargos}
          columns={columns}
          actions={(cargo) => (
            <div className="flex items-center justify-end space-x-1">
              <IconButton icon={Eye} size="sm" variant="outline" onClick={() => handleVisualizar(cargo)} title="Visualizar"/>
              <IconButton icon={Edit2} size="sm" variant="outline" onClick={() => abrirModalEdicao(cargo)} title="Editar"/>
              <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => handleExcluirClick(cargo)} title="Excluir"/>
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

      {/* Modal de Cadastro */}
      <ModalPadrao
        isOpen={isModalCadastroOpen}
        onClose={handleCadastroClose}
        title="Cadastrar Novo Cargo"
        confirmLabel={loading ? 'Salvando...' : 'Cadastrar'}
        onConfirm={handleSalvar}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSalvar(); }} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2" role="alert">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="cargo-nome-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-4 h-4 mr-2 text-gray-400" /> Nome do Cargo *
            </label>
            <input
              id="cargo-nome-cad" type="text" value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.nome.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
              placeholder="Ex: Analista Contábil" disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cargo-desc-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 mr-2 text-gray-400" /> Descrição (Opcional)
            </label>
            <textarea
              id="cargo-desc-cad" value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3} placeholder="Descreva as responsabilidades do cargo" disabled={loading}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cargo-tipo-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                 <TrendingUp className="w-4 h-4 mr-2 text-gray-400" /> Tipo (Opcional)
              </label>
              <select // Alterado para select para consistência, mas pode ser input
                id="cargo-tipo-cad" value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                disabled={loading}
              >
                <option value="">Selecione um tipo</option>
                {tiposCargo.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="cargo-depto-cad" className="flex items-center text-sm font-medium text-gray-700">
                  <Building className="w-4 h-4 mr-2 text-gray-400" /> Departamento *
                </label>
                <button
                  type="button"
                  onClick={() => setIsModalDepartamentoOpen(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Novo Departamento
                </button>
              </div>
              <select
                id="cargo-depto-cad" value={formData.departamento_id}
                onChange={(e) => handleInputChange('departamento_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm bg-white ${error && !formData.departamento_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading || departamentos.length === 0}
              >
                <option value="">{departamentos.length === 0 ? 'Carregando...' : 'Selecione um departamento'}</option>
                {departamentos.map(depto => (
                  <option key={depto.id} value={depto.id}>{depto.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </ModalPadrao>

      {/* Modal de Edição */}
      <ModalPadrao
        isOpen={isModalEdicaoOpen}
        onClose={handleEdicaoClose}
        title={`Editar Cargo: ${cargoParaEditar?.nome || ''}`}
        confirmLabel={loading ? 'Salvando...' : 'Salvar Alterações'}
        onConfirm={handleEditar}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleEditar(); }} className="space-y-6">
          {error && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2" role="alert">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
                <span>{error}</span>
             </div>
          )}
          
          <div>
            <label htmlFor="cargo-nome-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Briefcase className="w-4 h-4 mr-2 text-gray-400" /> Nome do Cargo *
            </label>
            <input
              id="cargo-nome-edit" type="text" value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.nome.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="cargo-desc-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-4 h-4 mr-2 text-gray-400" /> Descrição (Opcional)
            </label>
            <textarea
              id="cargo-desc-edit" value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3} disabled={loading}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label htmlFor="cargo-tipo-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                 <TrendingUp className="w-4 h-4 mr-2 text-gray-400" /> Tipo (Opcional)
              </label>
              <select
                id="cargo-tipo-edit" value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                disabled={loading}
              >
                <option value="">Selecione um tipo</option>
                {tiposCargo.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}
              </select>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="cargo-depto-edit" className="flex items-center text-sm font-medium text-gray-700">
                  <Building className="w-4 h-4 mr-2 text-gray-400" /> Departamento *
                </label>
                <button
                  type="button"
                  onClick={() => setIsModalDepartamentoOpen(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  + Novo Departamento
                </button>
              </div>
              <select
                id="cargo-depto-edit" value={formData.departamento_id}
                onChange={(e) => handleInputChange('departamento_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm bg-white ${error && !formData.departamento_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading || departamentos.length === 0}
              >
                <option value="">{departamentos.length === 0 ? 'Carregando...' : 'Selecione um departamento'}</option>
                {departamentos.map(depto => (
                  <option key={depto.id} value={depto.id}>{depto.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </ModalPadrao>

      {/* Modal de Visualização (Design Aprimorado) */}
      <ModalPadrao
        isOpen={!!cargoParaVisualizar}
        onClose={() => setCargoParaVisualizar(null)}
        title="Detalhes do Cargo"
        confirmLabel="Fechar"
        onConfirm={() => setCargoParaVisualizar(null)}
        size="lg"
      >
        {cargoParaVisualizar && (
           <div className="space-y-6">
             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center mb-3">
                 <Briefcase className="w-5 h-5 text-blue-600 mr-2" />
                 <h3 className="text-lg font-semibold text-gray-800">Identificação do Cargo</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                   <p className="text-gray-900 font-semibold">{cargoParaVisualizar.nome}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><TrendingUp className="w-3 h-3 mr-1" /> Tipo</label>
                   <p className="text-gray-900">{cargoParaVisualizar.tipo || <span className="italic text-gray-400">Não definido</span>}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Building className="w-3 h-3 mr-1" /> Departamento</label>
                    <p className="text-gray-900">
                      {cargoParaVisualizar.departamento?.nome
                        || (cargoParaVisualizar.departamento_id != null
                          ? (departamentoMap.get(cargoParaVisualizar.departamento_id)
                              || <span className="italic text-gray-400">ID: {cargoParaVisualizar.departamento_id}</span>)
                          : <span className="italic text-gray-400">Não informado</span>)}
                    </p>
                 </div>
               </div>
             </div>

             {cargoParaVisualizar.descricao && (
               <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                 <div className="flex items-center mb-3"><FileText className="w-5 h-5 text-gray-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Descrição</h3></div>
                 <p className="text-sm text-gray-700 whitespace-pre-wrap">{cargoParaVisualizar.descricao}</p>
               </div>
             )}
             
             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center mb-3"><Calendar className="w-5 h-5 text-purple-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Histórico</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                         <StatusBadge status={cargoParaVisualizar.ativo ? 'ativo' : 'inativo'} />
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Data de Criação</label>
                         <p className="text-gray-900">{cargoParaVisualizar.created_at ? format(new Date(cargoParaVisualizar.created_at), 'dd/MM/yyyy HH:mm') : '-'}</p>
                    </div>
                </div>
             </div>
           </div>
        )}
      </ModalPadrao>

      {/* Modal de Confirmação de Exclusão (Usando ConfirmDialog) */}
      <ConfirmDialog
        open={modalExclusaoOpen}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o cargo "${cargoParaDeletar?.nome}"? Esta ação marcará o cargo como inativo.`}
        onConfirm={confirmarDeletar}
        onCancel={() => {
          setModalExclusaoOpen(false);
          setCargoParaDeletar(null);
        }}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />

      <ModalCadastroDepartamento
        isOpen={isModalDepartamentoOpen}
        onClose={() => setIsModalDepartamentoOpen(false)}
        onDepartamentoCadastrado={handleDepartamentoCadastrado}
        empresa_id={empresaUsuarioId}
      />
    </PageLayout>
  );
};

