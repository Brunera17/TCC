import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, UserCheck, Eye, Edit2, Shield } from 'lucide-react';
import { apiService } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/modals/Modal';
import { useAuth } from '../context/AuthContext';
import { 
  pageStyles, 
  tableStyles, 
  buttonStyles, 
  formStyles 
} from '../styles';

interface Cargo {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  nivel?: string;
  empresa_id: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  empresa?: {
    nome: string;
    cnpj: string;
  };
}

interface CargosPageProps {
  openModalOnLoad?: boolean;
}

export const CargosPage: React.FC<CargosPageProps> = ({ openModalOnLoad = false }) => {
  const { user } = useAuth();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Estados para os modais
  const [cargoParaVisualizar, setCargoParaVisualizar] = useState<Cargo | null>(null);
  const [cargoParaEditar, setCargoParaEditar] = useState<Cargo | null>(null);
  const [cargoParaDeletar, setCargoParaDeletar] = useState<Cargo | null>(null);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    nivel: ''
  });

  // Verificar se o usuário é admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificandoPermissao, setVerificandoPermissao] = useState(true);

  // Verificar permissão de admin
  useEffect(() => {
    const isAdminUser = Boolean(user?.gerente);
    setIsAdmin(isAdminUser);
    setVerificandoPermissao(false);
    
    if (isAdminUser) {
      fetchCargos();
    }
  }, [user]);

  const fetchCargos = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await apiService.getCargos({
        page,
        per_page: 10,
        search: search || undefined
      });
      setCargos(response.data || []);
      setTotalPages(Math.ceil(response.total / (response.per_page || 10)));
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCargos(1, searchTerm);
  };

  const handlePageChange = (page: number) => {
    fetchCargos(page, searchTerm);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) {
      setError('Nome do cargo é obrigatório');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.createCargo(formData);
      setCargos(prev => [response, ...prev]);
      setIsModalOpen(false);
      setFormData({ nome: '', descricao: '', nivel: '' });
      setError('');
    } catch (err: any) {
      console.error('Erro ao criar cargo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = async () => {
    if (!cargoParaEditar || !formData.nome.trim()) {
      setError('Nome do cargo é obrigatório');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.updateCargo(cargoParaEditar.id, formData);
      setCargos(prev => prev.map(c => c.id === cargoParaEditar.id ? response : c));
      setIsModalEdicaoOpen(false);
      setCargoParaEditar(null);
      setFormData({ nome: '', descricao: '', nivel: '' });
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmarDeletar = async () => {
    if (!cargoParaDeletar) return;

    try {
      await apiService.deleteCargo(cargoParaDeletar.id);
      setCargos(cargos.filter(c => c.id !== cargoParaDeletar.id));
      setCargoParaDeletar(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const abrirModalEdicao = (cargo: Cargo) => {
    setCargoParaEditar(cargo);
    setFormData({
      nome: cargo.nome,
      descricao: cargo.descricao || '',
      nivel: cargo.nivel || ''
    });
    setIsModalEdicaoOpen(true);
  };

  // Se não for admin, mostrar mensagem de acesso negado
  if (verificandoPermissao) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Cargos</h1>
          <p className="text-sm text-gray-500">Gerencie os cargos do sistema</p>
        </div>
        
        <div className={pageStyles.messages.error}>
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-red-400 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Acesso Negado</h3>
              <p className="text-red-700 mt-1">
                Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar cargos.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageStyles.layout.container}>
      {/* Page Title */}
      <div className={pageStyles.header.wrapper}>
        <h1 className={pageStyles.header.title}>Cargos</h1>
        <p className={pageStyles.header.subtitle}>Gerencie os cargos da sua empresa</p>
      </div>

      {/* Search and Actions */}
      <div className={pageStyles.actionBar.wrapper}>
        <form onSubmit={handleSearch} className={pageStyles.actionBar.searchForm}>
          <div className={pageStyles.actionBar.searchContainer}>
            <Search className={pageStyles.actionBar.searchIcon} />
            <input
              type="text"
              placeholder="Buscar cargos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={pageStyles.actionBar.searchInput}
            />
          </div>
        </form>

        <button
          onClick={() => setIsModalOpen(true)}
          className={pageStyles.actionBar.primaryButton}
        >
          <Plus className={pageStyles.actionBar.primaryButtonIcon} />
          Novo Cargo
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={pageStyles.messages.error}>
          <p className={pageStyles.messages.errorText}>{error}</p>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : (
        <div className={tableStyles.container.wrapper}>
          <div className={tableStyles.container.scrollWrapper}>
            <table className={tableStyles.table.base}>
              <thead className={tableStyles.header.wrapper}>
                <tr>
                  <th className={tableStyles.header.cell}>
                    Cargo
                  </th>
                  <th className={tableStyles.header.cell}>
                    Código
                  </th>
                  <th className={tableStyles.header.cell}>
                    Nível
                  </th>
                  <th className={tableStyles.header.cell}>
                    Status
                  </th>
                  <th className={tableStyles.header.cellRight}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className={tableStyles.body.wrapper}>
                {cargos.map((cargo) => (
                  <tr key={cargo.id} className={tableStyles.body.row}>
                    <td className={tableStyles.cell.base}>
                      <div className="flex items-center">
                        <UserCheck className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className={tableStyles.cell.textBold}>
                            {cargo.nome}
                          </div>
                          {cargo.descricao && (
                            <div className={tableStyles.cell.textSecondary}>
                              {cargo.descricao}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={tableStyles.cell.base}>
                      {cargo.codigo}
                    </td>
                    <td className={tableStyles.cell.base}>
                      {cargo.nivel || '-'}
                    </td>
                    <td className={tableStyles.cell.base}>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        cargo.ativo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cargo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className={tableStyles.cell.actions}>
                      <div className={tableStyles.actions.wrapper}>
                        <button
                          onClick={() => setCargoParaVisualizar(cargo)}
                          className={tableStyles.actions.button}
                          title="Visualizar"
                        >
                          <Eye className={tableStyles.actions.icon} />
                        </button>
                        <button
                          onClick={() => abrirModalEdicao(cargo)}
                          className={tableStyles.actions.button}
                          title="Editar"
                        >
                          <Edit2 className={tableStyles.actions.icon} />
                        </button>
                        <button
                          onClick={() => setCargoParaDeletar(cargo)}
                          className={tableStyles.actions.button}
                          title="Excluir"
                        >
                          <Trash2 className={tableStyles.actions.icon} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={tableStyles.pagination.wrapper}>
              <div className={tableStyles.pagination.nav.mobile.wrapper}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={tableStyles.pagination.nav.mobile.button}
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={tableStyles.pagination.nav.mobile.button}
                >
                  Próxima
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className={tableStyles.pagination.info}>
                    Página <span className={tableStyles.pagination.infoHighlight}>{currentPage}</span> de{' '}
                    <span className={tableStyles.pagination.infoHighlight}>{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className={tableStyles.pagination.nav.wrapper}>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={tableStyles.pagination.nav.mobile.button}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={tableStyles.pagination.nav.mobile.button}
                    >
                      Próxima
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {/* Modal de Cadastro */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({ nome: '', descricao: '', nivel: '' });
          setError('');
        }}
        title="Cadastrar Novo Cargo"
      >
        <div className="space-y-6">
          <div>
            <label className={formStyles.label.base}>
              Nome do Cargo *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={formStyles.input.base}
              placeholder="Ex: Administrador"
            />
            <p className="text-xs text-gray-500 mt-1">
              O código será gerado automaticamente com as 3 primeiras letras + 3 números
            </p>
          </div>

          <div>
            <label className={formStyles.label.base}>
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className={formStyles.textarea.base}
              rows={3}
              placeholder="Descreva as responsabilidades do cargo"
            />
          </div>

          <div>
            <label className={formStyles.label.base}>
              Nível
            </label>
            <select 
              value={formData.nivel}
              onChange={(e) => handleInputChange('nivel', e.target.value)}
              className={formStyles.select.base}
            >
              <option value="">Selecione um nível</option>
              <option value="Júnior">Júnior</option>
              <option value="Pleno">Pleno</option>
              <option value="Sênior">Sênior</option>
              <option value="Especialista">Especialista</option>
              <option value="Gerente">Gerente</option>
              <option value="Diretor">Diretor</option>
            </select>
          </div>
        </div>

        <div className={formStyles.actions.wrapper}>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setFormData({ nome: '', descricao: '', nivel: '' });
              setError('');
            }}
            className={`${buttonStyles.base} ${buttonStyles.variants.secondary} ${buttonStyles.sizes.md}`}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSalvar}
            disabled={loading}
            className={`${buttonStyles.base} ${buttonStyles.variants.primary} ${buttonStyles.sizes.md}`}
          >
            {loading ? 'Salvando...' : 'Cadastrar'}
          </button>
        </div>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        isOpen={isModalEdicaoOpen}
        onClose={() => {
          setIsModalEdicaoOpen(false);
          setCargoParaEditar(null);
          setFormData({ nome: '', descricao: '', nivel: '' });
          setError('');
        }}
        title="Editar Cargo"
      >
        <div className="space-y-6">
          <div>
            <label className={formStyles.label.base}>
              Nome do Cargo *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={formStyles.input.base}
              placeholder="Ex: Administrador"
            />
          </div>

          <div>
            <label className={formStyles.label.base}>
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              className={formStyles.textarea.base}
              rows={3}
              placeholder="Descreva as responsabilidades do cargo"
            />
          </div>

          <div>
            <label className={formStyles.label.base}>
              Nível
            </label>
            <select 
              value={formData.nivel}
              onChange={(e) => handleInputChange('nivel', e.target.value)}
              className={formStyles.select.base}
            >
              <option value="">Selecione um nível</option>
              <option value="Júnior">Júnior</option>
              <option value="Pleno">Pleno</option>
              <option value="Sênior">Sênior</option>
              <option value="Especialista">Especialista</option>
              <option value="Gerente">Gerente</option>
              <option value="Diretor">Diretor</option>
            </select>
          </div>
        </div>

        <div className={formStyles.actions.wrapper}>
          <button
            onClick={() => {
              setIsModalEdicaoOpen(false);
              setCargoParaEditar(null);
              setFormData({ nome: '', descricao: '', nivel: '' });
              setError('');
            }}
            className={`${buttonStyles.base} ${buttonStyles.variants.secondary} ${buttonStyles.sizes.md}`}
          >
            Cancelar
          </button>
          <button 
            onClick={handleEditar}
            disabled={loading}
            className={`${buttonStyles.base} ${buttonStyles.variants.primary} ${buttonStyles.sizes.md}`}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      {/* Modal de Visualização */}
      {cargoParaVisualizar && (
        <Modal
          isOpen={!!cargoParaVisualizar}
          onClose={() => setCargoParaVisualizar(null)}
          title="Detalhes do Cargo"
        >
          <div className="space-y-4">
            <div>
              <label className={formStyles.label.base}>Nome</label>
              <p className="mt-1 text-sm text-gray-900">{cargoParaVisualizar.nome}</p>
            </div>
            <div>
              <label className={formStyles.label.base}>Código</label>
              <p className="mt-1 text-sm text-gray-900">{cargoParaVisualizar.codigo}</p>
            </div>
            {cargoParaVisualizar.descricao && (
              <div>
                <label className={formStyles.label.base}>Descrição</label>
                <p className="mt-1 text-sm text-gray-900">{cargoParaVisualizar.descricao}</p>
              </div>
            )}
            {cargoParaVisualizar.nivel && (
              <div>
                <label className={formStyles.label.base}>Nível</label>
                <p className="mt-1 text-sm text-gray-900">{cargoParaVisualizar.nivel}</p>
              </div>
            )}
            <div>
              <label className={formStyles.label.base}>Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                cargoParaVisualizar.ativo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {cargoParaVisualizar.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setCargoParaVisualizar(null)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {cargoParaDeletar && (
        <Modal
          isOpen={!!cargoParaDeletar}
          onClose={() => setCargoParaDeletar(null)}
          title="Confirmar Exclusão"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Tem certeza que deseja excluir o cargo <strong>{cargoParaDeletar.nome}</strong>?
            </p>
            <p className="text-sm text-gray-500">
              Esta ação não pode ser desfeita.
            </p>
          </div>

          <div className={formStyles.actions.wrapper}>
            <button
              onClick={() => setCargoParaDeletar(null)}
              className={`${buttonStyles.base} ${buttonStyles.variants.secondary} ${buttonStyles.sizes.md}`}
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDeletar}
              className={`${buttonStyles.base} ${buttonStyles.variants.danger} ${buttonStyles.sizes.md}`}
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
