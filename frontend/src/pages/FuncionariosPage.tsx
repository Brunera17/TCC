import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  Edit2,
  Shield,
  Briefcase,
  AlertTriangle,
  Building,
  User,
  Mail,
  Lock,
  AtSign,
  Key,
  Hash,
  UserCheck
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
  ModalPadrao,
  type Column
} from '../components/ui';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { format } from 'date-fns';


interface Cargo {
  id: number;
  nome: string;
  departamento_id: number;
}

interface Departamento {
  id: number;
  nome: string;
  empresa_id: number;
}

interface Funcionario {
  id: number;
  nome: string;
  email: string;
  username: string;
  cpf?: string;
  eh_gerente: boolean;
  cargo_id?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  cargo?: {
    id: number;
    nome: string;
    departamento_id: number;
    departamento?: {
        id: number;
        nome: string;
    }
  };
}

interface FuncionarioPayload {
  nome: string;
  username: string;
  email: string;
  cpf: string | null;
  eh_gerente: boolean;
  cargo_id: number;
  senha?: string;
  ativo?: boolean;
}

interface FuncionarioFormData {
  nome: string;
  username: string;
  email: string;
  cpf: string;
  senha: string;
  confirmarSenha: string;
  eh_gerente: boolean;
  cargo_id: string;
}

export const FuncionariosPage: React.FC = () => {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const empresaUsuarioId = useMemo(() => user?.empresa_id ?? user?.empresa?.id ?? null, [user]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);

  const [funcionarioParaVisualizar, setFuncionarioParaVisualizar] = useState<Funcionario | null>(null);
  const [funcionarioParaEditar, setFuncionarioParaEditar] = useState<Funcionario | null>(null);
  const [funcionarioParaDeletar, setFuncionarioParaDeletar] = useState<Funcionario | null>(null);

  const [formData, setFormData] = useState<FuncionarioFormData>({
    nome: '',
    username: '',
    email: '',
    cpf: '',
    senha: '',
    confirmarSenha: '',
    eh_gerente: false,
    cargo_id: '',
  });

  const isAdmin = Boolean(user?.gerente);
  const [verificandoPermissao, setVerificandoPermissao] = useState(true);

  useEffect(() => {
    setVerificandoPermissao(false);
  }, [user]);

  const cargoMap = useMemo(() => {
    const map = new Map<number, Cargo>();
    cargos.forEach(c => map.set(c.id, c));
    return map;
  }, [cargos]);

  const departamentoMap = useMemo(() => {
    const map = new Map<number, string>();
    departamentos.forEach(d => map.set(d.id, d.nome));
    return map;
  }, [departamentos]);

  const fetchDepartamentos = useCallback(async () => {
    if (!isAdmin) return;
    if (!empresaUsuarioId) {
      setDepartamentos([]);
      setError('Seu usuário não está vinculado a uma empresa. Entre em contato com o administrador.');
      return;
    }

    try {
      const response = await apiService.getDepartamentos({ per_page: 1000, ativo: true, empresa_id: empresaUsuarioId });
      if (response && response.data) setDepartamentos(response.data);
      else if (Array.isArray(response)) setDepartamentos(response);
    } catch (err) {
      console.error('Erro ao buscar departamentos:', err);
      if (err instanceof ApiError && err.status === 403) {
        setError('Seu usuário não está vinculado a uma empresa. Entre em contato com o administrador.');
        setDepartamentos([]);
        return;
      }
      setError('Falha ao carregar lista de departamentos.');
    }
  }, [isAdmin, empresaUsuarioId]);
  
  const fetchCargos = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await apiService.getCargos({ per_page: 1000, ativo: true });
      if (response && response.data) setCargos(response.data);
      else if (Array.isArray(response)) setCargos(response);
    } catch (err) {
      console.error("Erro ao buscar cargos:", err);
      setError("Falha ao carregar lista de cargos.");
    }
  }, [isAdmin]);

  const fetchFuncionarios = useCallback(async (page = currentPage, search = searchTerm) => {
    if (!isAdmin) {
      setLoading(false); setFuncionarios([]);
      return;
    }
    setLoading(true); setError('');
    try {
      const response = await apiService.getFuncionarios({
        page,
        per_page: itemsPerPage,
        search: search || undefined,
      });
      
      if (response && response.data && typeof response.total === 'number' && typeof response.per_page === 'number') {
        setFuncionarios(response.data);
        setTotalPages(Math.ceil(response.total / response.per_page) || 1);
      } else if (Array.isArray(response)) {
        setFuncionarios(response);
        setTotalPages(1);
      } else {
        throw new Error("Formato de resposta inesperado da API");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof ApiError ? `Erro ${err.status}: ${JSON.stringify(err.details)}` : (err instanceof Error ? err.message : 'Erro desconhecido');
      setError(errorMsg);
      setFuncionarios([]); setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage, searchTerm]);

  useEffect(() => {
    if(isAdmin) {
        fetchFuncionarios(currentPage, searchTerm);
        fetchCargos();
        fetchDepartamentos();
    }
  }, [fetchFuncionarios, fetchCargos, fetchDepartamentos, currentPage, searchTerm, isAdmin]);

  const handleSearch = (term: string) => { setSearchTerm(term); setCurrentPage(1); };
  const handlePageChange = (newPage: number) => { setCurrentPage(newPage); };

  const handleInputChange = (field: keyof FuncionarioFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if(error) setError('');
  };

  const resetForm = () => {
    setFormData({
        nome: '', username: '', email: '', cpf: '',
        senha: '', confirmarSenha: '',
        eh_gerente: false, cargo_id: ''
    });
    setError('');
  };

  const openModalCadastro = () => { resetForm(); setIsModalCadastroOpen(true); };
  const handleVisualizar = (func: Funcionario) => { setFuncionarioParaVisualizar(func); };
  const handleExcluirClick = (func: Funcionario) => { setFuncionarioParaDeletar(func); setModalExclusaoOpen(true); };
  
  const abrirModalEdicao = (func: Funcionario) => {
    setFuncionarioParaEditar(func);
    setFormData({
      nome: func.nome,
      username: func.username,
      email: func.email,
      cpf: func.cpf || '',
      senha: '', // Senha não é preenchida na edição
      confirmarSenha: '',
      eh_gerente: func.eh_gerente,
      cargo_id: func.cargo_id?.toString() || ''
    });
    setError('');
    setIsModalEdicaoOpen(true);
  };
  
  const handleCadastroClose = () => { setIsModalCadastroOpen(false); resetForm(); };
  const handleEdicaoClose = () => { setIsModalEdicaoOpen(false); setFuncionarioParaEditar(null); resetForm(); };

  const handleSalvar = async () => {
    if (!formData.nome.trim() || !formData.username.trim() || !formData.email.trim() || !formData.cargo_id || !formData.senha) {
      setError('Nome, Username, Email, Cargo e Senha são obrigatórios.');
      return;
    }
    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (formData.cpf && !/^\d{11}$/.test(formData.cpf.replace(/\D/g, ''))) {
        setError('CPF deve conter 11 dígitos numéricos (se preenchido).');
        return;
    }

    setLoading(true); setError('');
    try {
  const dadosParaApi: FuncionarioPayload & { senha: string; ativo: boolean } = {
        nome: formData.nome,
        username: formData.username,
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, '') || null,
        senha: formData.senha,
        eh_gerente: formData.eh_gerente,
        cargo_id: parseInt(formData.cargo_id),
        ativo: true
      };
      await apiService.createFuncionario(dadosParaApi);
      handleCadastroClose();
      fetchFuncionarios(1); // Volta para a pág 1
    } catch (err: unknown) {
      console.error('Erro ao criar funcionário:', err);
      if (err instanceof ApiError && err.details) { setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details)); }
      else if (err instanceof Error) { setError(err.message); }
      else { setError('Erro desconhecido ao criar funcionário.'); }
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = async () => {
    if (!funcionarioParaEditar || !formData.nome.trim() || !formData.username.trim() || !formData.email.trim() || !formData.cargo_id) {
      setError('Nome, Username, Email e Cargo são obrigatórios.');
      return;
    }
    if (formData.senha && formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    if (formData.cpf && !/^\d{11}$/.test(formData.cpf.replace(/\D/g, ''))) {
        setError('CPF deve conter 11 dígitos numéricos (se preenchido).');
        return;
    }
    
    setLoading(true); setError('');
    try {
  const dadosParaApi: FuncionarioPayload = {
        nome: formData.nome,
        username: formData.username,
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, '') || null,
        eh_gerente: formData.eh_gerente,
        cargo_id: parseInt(formData.cargo_id)
      };
      
      // Só envia a senha se o usuário digitou uma nova
      if (formData.senha) {
          dadosParaApi.senha = formData.senha;
      }
      
      await apiService.updateFuncionario(funcionarioParaEditar.id, dadosParaApi);
      handleEdicaoClose();
      fetchFuncionarios(); // Recarrega a página atual
    } catch (err: unknown) {
      console.error('Erro ao editar funcionário:', err);
      if (err instanceof ApiError && err.details) { setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details)); }
      else if (err instanceof Error) { setError(err.message); }
      else { setError('Erro desconhecido ao editar funcionário.'); }
    } finally {
      setLoading(false);
    }
  };

  const confirmarDeletar = async () => {
    if (!funcionarioParaDeletar) return;
    setLoading(true);
    try {
      await apiService.deleteFuncionario(funcionarioParaDeletar.id);
      setModalExclusaoOpen(false);
      setFuncionarioParaDeletar(null);
      fetchFuncionarios(1);
    } catch (err: unknown) {
      const errorMessage = err instanceof ApiError
        ? `Erro ${err.status}: ${JSON.stringify(err.details)}`
        : err instanceof Error
          ? err.message
          : 'Erro ao excluir';
      setError(errorMessage);
      setModalExclusaoOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // --- Colunas da Tabela ---
  const columns: Column<Funcionario>[] = [
    {
      key: 'nome',
      label: 'Funcionário',
      render: (_, func) => (
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${func.eh_gerente ? 'bg-purple-100' : 'bg-blue-50'}`}>
             <User className={`w-4 h-4 ${func.eh_gerente ? 'text-purple-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{func.nome}</div>
            <div className="text-sm text-gray-500">{func.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'cargo',
      label: 'Cargo / Depto.',
      render: (_, func) => {
          const cargo = func.cargo || cargoMap.get(func.cargo_id || 0);
          const deptoId = cargo?.departamento_id;
          const deptoNome = (deptoId ? departamentoMap.get(deptoId) : null) || func.cargo?.departamento?.nome;

          return (
             <div>
                <div className="text-sm text-gray-900">{cargo?.nome || <span className="italic text-gray-400">Sem Cargo</span>}</div>
                <div className="text-xs text-gray-500">{deptoNome || <span className="italic text-gray-400">Sem Depto.</span>}</div>
             </div>
          )
      }
    },
    {
      key: 'eh_gerente',
      label: 'Nível',
      render: (eh_gerente) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          eh_gerente ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {eh_gerente ? <Shield className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
          {eh_gerente ? 'Gerente' : 'Funcionário'}
        </span>
      )
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
        <PageHeader title="Funcionários" subtitle="Gerenciar equipe e colaboradores" />
         <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>
      </PageLayout>
    );
  }

  if (!isAdmin) {
    return (
      <PageLayout>
        <PageHeader title="Funcionários" />
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm border border-red-200 p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para gerenciar funcionários.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader title="Funcionários" subtitle="Gerenciar equipe e colaboradores">
        <IconButton icon={Plus} onClick={openModalCadastro} label="Novo Funcionário" />
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Buscar por nome, email ou username..." />
      </div>
      
      {error && !isModalCadastroOpen && !isModalEdicaoOpen && (
         <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4" role="alert">
           {error}
         </div>
      )}

      <StateHandler
        loading={loading}
        error={undefined}
        isEmpty={funcionarios.length === 0 && !loading}
        emptyState={
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              {searchTerm ? `Nenhum funcionário encontrado para "${searchTerm}"` : "Nenhum funcionário cadastrado."}
            </p>
            {!searchTerm && (
               <button onClick={openModalCadastro} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
                 + Cadastrar Novo Funcionário
               </button>
             )}
          </div>
        }
      >
        <DataTable
          data={funcionarios}
          columns={columns}
          actions={(func) => (
            <div className="flex items-center justify-end space-x-1">
              <IconButton icon={Eye} size="sm" variant="outline" onClick={() => handleVisualizar(func)} title="Visualizar"/>
              <IconButton icon={Edit2} size="sm" variant="outline" onClick={() => abrirModalEdicao(func)} title="Editar"/>
              <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => handleExcluirClick(func)} title="Excluir"/>
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
        title="Cadastrar Novo Funcionário"
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="func-nome-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 mr-2 text-gray-400" /> Nome Completo *</label>
              <input id="func-nome-cad" type="text" value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.nome.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder="Ex: João da Silva" disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-username-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><AtSign className="w-4 h-4 mr-2 text-gray-400" /> Username *</label>
              <input id="func-username-cad" type="text" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.username.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder="Ex: joao.silva" disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-email-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 mr-2 text-gray-400" /> Email *</label>
              <input id="func-email-cad" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.email.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder="Ex: joao@empresa.com" disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-cpf-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Hash className="w-4 h-4 mr-2 text-gray-400" /> CPF (Opcional)</label>
              <input id="func-cpf-cad" type="text" value={formData.cpf} onChange={(e) => handleInputChange('cpf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="000.000.000-00" disabled={loading} maxLength={14}
              />
            </div>
             <div>
              <label htmlFor="func-senha-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Key className="w-4 h-4 mr-2 text-gray-400" /> Senha *</label>
              <input id="func-senha-cad" type="password" value={formData.senha} onChange={(e) => handleInputChange('senha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.senha ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder="Mínimo 6 caracteres" disabled={loading}
              />
            </div>
             <div>
              <label htmlFor="func-confirma-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Lock className="w-4 h-4 mr-2 text-gray-400" /> Confirmar Senha *</label>
              <input id="func-confirma-cad" type="password" value={formData.confirmarSenha} onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && formData.senha !== formData.confirmarSenha ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder="Repita a senha" disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-cargo-cad" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Briefcase className="w-4 h-4 mr-2 text-gray-400" /> Cargo *</label>
              <select id="func-cargo-cad" value={formData.cargo_id} onChange={(e) => handleInputChange('cargo_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm bg-white ${error && !formData.cargo_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading || cargos.length === 0}
              >
                <option value="">{cargos.length === 0 ? 'Carregando...' : 'Selecione um cargo'}</option>
                {cargos.map(cargo => (<option key={cargo.id} value={cargo.id}>{cargo.nome}</option>))}
              </select>
            </div>
            <div className="flex items-center pt-7">
               <input type="checkbox" id="func-gerente-cad" checked={formData.eh_gerente}
                 onChange={(e) => handleInputChange('eh_gerente', e.target.checked)}
                 className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                 disabled={loading}
               />
               <label htmlFor="func-gerente-cad" className="ml-2 text-sm text-gray-700 flex items-center cursor-pointer">
                 <Shield className="w-4 h-4 mr-1.5 text-purple-500" /> É Gerente (Permissão de Admin)
               </label>
            </div>
          </div>
        </form>
      </ModalPadrao>

      {/* Modal de Edição */}
      <ModalPadrao
        isOpen={isModalEdicaoOpen}
        onClose={handleEdicaoClose}
        title={`Editar Funcionário: ${funcionarioParaEditar?.nome || ''}`}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="func-nome-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 mr-2 text-gray-400" /> Nome Completo *</label>
              <input id="func-nome-edit" type="text" value={formData.nome} onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.nome.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-username-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><AtSign className="w-4 h-4 mr-2 text-gray-400" /> Username *</label>
              <input id="func-username-edit" type="text" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.username.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-email-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 mr-2 text-gray-400" /> Email *</label>
              <input id="func-email-edit" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && !formData.email.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="func-cpf-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Hash className="w-4 h-4 mr-2 text-gray-400" /> CPF (Opcional)</label>
              <input id="func-cpf-edit" type="text" value={formData.cpf} onChange={(e) => handleInputChange('cpf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="000.000.000-00" disabled={loading} maxLength={14}
              />
            </div>
             <div>
              <label htmlFor="func-senha-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Key className="w-4 h-4 mr-2 text-gray-400" /> Nova Senha (Opcional)</label>
              <input id="func-senha-edit" type="password" value={formData.senha} onChange={(e) => handleInputChange('senha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm border-gray-300 focus:ring-blue-500`}
                placeholder="Deixe em branco para não alterar" disabled={loading}
              />
            </div>
             <div>
              <label htmlFor="func-confirma-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Lock className="w-4 h-4 mr-2 text-gray-400" /> Confirmar Nova Senha</label>
              <input id="func-confirma-edit" type="password" value={formData.confirmarSenha} onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${error && formData.senha !== formData.confirmarSenha ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                placeholder="Repita a nova senha" disabled={loading || !formData.senha} // Desabilitado se não tiver nova senha
              />
            </div>
            <div>
              <label htmlFor="func-cargo-edit" className="flex items-center text-sm font-medium text-gray-700 mb-1"><Briefcase className="w-4 h-4 mr-2 text-gray-400" /> Cargo *</label>
              <select id="func-cargo-edit" value={formData.cargo_id} onChange={(e) => handleInputChange('cargo_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-sm bg-white ${error && !formData.cargo_id ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                disabled={loading || cargos.length === 0}
              >
                <option value="">{cargos.length === 0 ? 'Carregando...' : 'Selecione um cargo'}</option>
                {cargos.map(cargo => (<option key={cargo.id} value={cargo.id}>{cargo.nome}</option>))}
              </select>
            </div>
            <div className="flex items-center pt-7">
               <input type="checkbox" id="func-gerente-edit" checked={formData.eh_gerente}
                 onChange={(e) => handleInputChange('eh_gerente', e.target.checked)}
                 className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                 disabled={loading}
               />
               <label htmlFor="func-gerente-edit" className="ml-2 text-sm text-gray-700 flex items-center cursor-pointer">
                 <Shield className="w-4 h-4 mr-1.5 text-purple-500" /> É Gerente (Permissão de Admin)
               </label>
            </div>
          </div>
        </form>
      </ModalPadrao>

      {/* Modal de Visualização (Design Aprimorado) */}
      <ModalPadrao
        isOpen={!!funcionarioParaVisualizar}
        onClose={() => setFuncionarioParaVisualizar(null)}
        title="Detalhes do Funcionário"
        confirmLabel="Fechar"
        onConfirm={() => setFuncionarioParaVisualizar(null)}
        size="lg"
      >
        {funcionarioParaVisualizar && (
           <div className="space-y-6">
             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center mb-3">
                 <User className="w-5 h-5 text-blue-600 mr-2" />
                 <h3 className="text-lg font-semibold text-gray-800">Informações Pessoais</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo</label>
                   <p className="text-gray-900 font-semibold">{funcionarioParaVisualizar.nome}</p>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
                   <p className="text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded w-fit">@{funcionarioParaVisualizar.username}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Mail className="w-3 h-3 mr-1" /> Email</label>
                   <p className="text-gray-900">{funcionarioParaVisualizar.email}</p>
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Hash className="w-3 h-3 mr-1" /> CPF</label>
                   <p className="text-gray-900">{funcionarioParaVisualizar.cpf || <span className="italic text-gray-400">Não informado</span>}</p>
                 </div>
               </div>
             </div>

             <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center mb-3">
                 <Briefcase className="w-5 h-5 text-purple-600 mr-2" />
                 <h3 className="text-lg font-semibold text-gray-800">Informações Profissionais</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Nível de Acesso</label>
                   <span
                     className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                       funcionarioParaVisualizar.eh_gerente
                         ? 'bg-purple-100 text-purple-800 border-purple-200'
                         : 'bg-gray-100 text-gray-800 border-gray-200'
                     }`}
                   >
                     {funcionarioParaVisualizar.eh_gerente ? (
                       <>
                         <Shield className="w-3 h-3 mr-1" /> Gerente
                       </>
                     ) : (
                       <>
                         <UserCheck className="w-3 h-3 mr-1" /> Funcionário
                       </>
                     )}
                   </span>
                 </div>
                  <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Status da Conta</label>
                   <StatusBadge status={funcionarioParaVisualizar.ativo ? 'ativo' : 'inativo'} />
                 </div>
                 <div>
                   <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Briefcase className="w-3 h-3 mr-1" /> Cargo</label>
                   <p className="text-gray-900">{cargoMap.get(funcionarioParaVisualizar.cargo_id || 0)?.nome || <span className="italic text-gray-400">Não definido</span>}</p>
                 </div>
                 <div>
                    <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Building className="w-3 h-3 mr-1" /> Departamento</label>
                    <p className="text-gray-900">
                        {departamentoMap.get(cargoMap.get(funcionarioParaVisualizar.cargo_id || 0)?.departamento_id || 0) || <span className="italic text-gray-400">Não definido</span>}
                    </p>
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Membro Desde</label>
                   <p className="text-gray-900">{funcionarioParaVisualizar.created_at ? format(new Date(funcionarioParaVisualizar.created_at), 'dd/MM/yyyy') : '-'}</p>
                 </div>
               </div>
             </div>
           </div>
        )}
      </ModalPadrao>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        open={modalExclusaoOpen}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja desativar o funcionário "${funcionarioParaDeletar?.nome}"? Esta ação marcará o usuário como inativo.`}
        onConfirm={confirmarDeletar}
  onCancel={() => setModalExclusaoOpen(false)}
        confirmLabel="Sim, Desativar"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </PageLayout>
  );
};

