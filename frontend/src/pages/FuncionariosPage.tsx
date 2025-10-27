import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Mail, User, Eye, Edit2, Shield, UserCheck } from 'lucide-react';
import { apiService } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  PageLayout, 
  PageHeader, 
  SearchBar, 
  IconButton, 
  DataTable, 
  ConfirmDialog, 
  StateHandler,
  ModalPadrao,
  type Column
} from '../components/ui';

interface Funcionario {
  id: number;
  nome: string;
  email: string;
  gerente: boolean;
  cargo_id: number;
  empresa_id: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  cargo?: {
    nome: string;
    codigo: string;
    nivel?: string;
  };
  empresa?: {
    nome: string;
    cnpj: string;
  };
}

export default function FuncionariosPage() {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para modais
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [isModalVisualizacaoOpen, setIsModalVisualizacaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);
  
  const [funcionarioParaVisualizar, setFuncionarioParaVisualizar] = useState<Funcionario | null>(null);
  const [funcionarioParaEditar, setFuncionarioParaEditar] = useState<Funcionario | null>(null);
  const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState<Funcionario | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo_id: '',
    empresa_id: '',
    gerente: false
  });

  const isAdmin = Boolean(user?.gerente);

  // =============================
  // 🔹 COLUNAS DA TABELA
  // =============================
  const columns: Column<Funcionario>[] = [
    {
      key: 'nome',
      label: 'Nome',
      render: (_, item) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{item.nome}</div>
            <div className="text-sm text-gray-500">{item.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'cargo',
      label: 'Cargo',
      render: (_, item) => (
        <span className="text-sm text-gray-900">
          {item.cargo?.nome || 'N/A'}
        </span>
      )
    },
    {
      key: 'gerente',
      label: 'Tipo',
      render: (_, item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.gerente 
            ? 'bg-purple-100 text-purple-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {item.gerente ? (
            <>
              <Shield className="w-3 h-3 mr-1" />
              Gerente
            </>
          ) : (
            <>
              <UserCheck className="w-3 h-3 mr-1" />
              Funcionário
            </>
          )}
        </span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (_, item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          item.ativo 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    }
  ];

  // =============================
  // 🔹 FUNÇÕES AUXILIARES
  // =============================
  const handleVisualizarClick = (funcionario: Funcionario) => {
    setFuncionarioParaVisualizar(funcionario);
    setIsModalVisualizacaoOpen(true);
  };

  const handleEditClick = (funcionario: Funcionario) => {
    setFuncionarioParaEditar(funcionario);
    setFormData({
      nome: funcionario.nome,
      email: funcionario.email,
      cargo_id: funcionario.cargo_id?.toString() || '',
      empresa_id: funcionario.empresa_id?.toString() || '',
      gerente: funcionario.gerente
    });
    setIsModalEdicaoOpen(true);
  };

  const handleExcluirClick = (funcionario: Funcionario) => {
    setFuncionarioParaExcluir(funcionario);
    setModalExclusaoOpen(true);
  };

  const handleExcluirConfirm = async () => {
    if (!funcionarioParaExcluir) return;

    try {
      await apiService.deleteFuncionario(funcionarioParaExcluir.id);
      setModalExclusaoOpen(false);
      fetchFuncionarios();
      setFuncionarioParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir funcionário:', err);
      setError('Erro ao excluir funcionário');
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      cargo_id: '',
      empresa_id: '',
      gerente: false
    });
  };

  // =============================
  // 🔹 BUSCAR FUNCIONÁRIOS
  // =============================
  const fetchFuncionarios = async () => {
    try {
      console.log('🔍 Iniciando busca de funcionários...');
      setLoading(true);
      setError(null);
      
      const response = await apiService.getFuncionarios({
        search: searchTerm,
        ativo: true
      });

      console.log('✅ Funcionários recebidos:', response);

      // Se a resposta tem estrutura paginada
      if (response.data) {
        setFuncionarios(response.data || []);
      } else {
        // Se é um array direto
        setFuncionarios(response || []);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar funcionários:', err);
      setError('Erro ao buscar funcionários');
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // 🔹 CADASTRO
  // =============================
  const handleCadastroSubmit = async () => {
    try {
      const dados = {
        nome: formData.nome,
        email: formData.email,
        cargo_id: parseInt(formData.cargo_id) || null,
        empresa_id: parseInt(formData.empresa_id) || null,
        gerente: formData.gerente,
        ativo: true
      };

      await apiService.createFuncionario(dados);
      setIsModalCadastroOpen(false);
      fetchFuncionarios();
      resetForm();
    } catch (err) {
      console.error('Erro ao cadastrar funcionário:', err);
      setError('Erro ao cadastrar funcionário');
    }
  };

  // =============================
  // 🔹 EDIÇÃO
  // =============================
  const handleEdicaoSubmit = async () => {
    if (!funcionarioParaEditar) return;

    try {
      const dados = {
        nome: formData.nome,
        email: formData.email,
        cargo_id: parseInt(formData.cargo_id) || null,
        empresa_id: parseInt(formData.empresa_id) || null,
        gerente: formData.gerente
      };

      await apiService.updateFuncionario(funcionarioParaEditar.id, dados);
      setIsModalEdicaoOpen(false);
      fetchFuncionarios();
      resetForm();
      setFuncionarioParaEditar(null);
    } catch (err) {
      console.error('Erro ao editar funcionário:', err);
      setError('Erro ao editar funcionário');
    }
  };

  // =============================
  // 🔹 CARREGAR DADOS
  // =============================
  useEffect(() => {
    const loadFuncionarios = async () => {
      try {
        console.log('🔍 Iniciando busca de funcionários...');
        setLoading(true);
        setError(null);
        
        const response = await apiService.getFuncionarios({
          search: searchTerm,
          ativo: true
        });

        console.log('✅ Funcionários recebidos:', response);

        // Se a resposta tem estrutura paginada
        if (response.data) {
          setFuncionarios(response.data || []);
        } else {
          // Se é um array direto
          setFuncionarios(response || []);
        }
      } catch (err) {
        console.error('❌ Erro ao buscar funcionários:', err);
        setError('Erro ao buscar funcionários');
      } finally {
        setLoading(false);
      }
    };

    loadFuncionarios();
  }, [searchTerm]);

  // =============================
  // 🔹 RENDERIZAÇÃO
  // =============================
  return (
    <PageLayout>
      <PageHeader
        title="Funcionários"
        subtitle="Gerenciar equipe e colaboradores da empresa"
      >
        {isAdmin && (
          <IconButton
            icon={Plus}
            onClick={() => setIsModalCadastroOpen(true)}
            label="Novo Funcionário"
          />
        )}
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <SearchBar
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Buscar funcionários..."
          />
        </div>

        <StateHandler
          loading={loading}
          error={error || undefined}
          isEmpty={funcionarios.length === 0}
        >
          <DataTable
            data={funcionarios}
            columns={columns}
            actions={(item) => (
              <div className="flex space-x-2">
                <IconButton
                  icon={Eye}
                  size="sm"
                  variant="outline"
                  onClick={() => handleVisualizarClick(item)}
                />
                {isAdmin && (
                  <>
                    <IconButton
                      icon={Edit2}
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(item)}
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="danger"
                      onClick={() => handleExcluirClick(item)}
                    />
                  </>
                )}
              </div>
            )}
          />
        </StateHandler>
      </div>

      {/* Modal de Visualização */}
      <ModalPadrao
        isOpen={isModalVisualizacaoOpen}
        onClose={() => setIsModalVisualizacaoOpen(false)}
        title="Detalhes do Funcionário"
        onConfirm={() => setIsModalVisualizacaoOpen(false)}
        confirmLabel="Fechar"
      >
        {funcionarioParaVisualizar && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <p className="text-sm text-gray-900">{funcionarioParaVisualizar.nome}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-sm text-gray-900 flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {funcionarioParaVisualizar.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <p className="text-sm text-gray-900">{funcionarioParaVisualizar.cargo?.nome || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <p className="text-sm text-gray-900 flex items-center">
                {funcionarioParaVisualizar.gerente ? (
                  <>
                    <Shield className="w-4 h-4 mr-2 text-purple-600" />
                    Gerente
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2 text-gray-600" />
                    Funcionário
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </ModalPadrao>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        open={modalExclusaoOpen}
        onCancel={() => setModalExclusaoOpen(false)}
        onConfirm={handleExcluirConfirm}
        title="Excluir Funcionário"
        message={`Tem certeza que deseja excluir o funcionário "${funcionarioParaExcluir?.nome}"?`}
        confirmLabel="Excluir"
        variant="danger"
      />

      {/* Modal de Cadastro */}
      <ModalPadrao
        isOpen={isModalCadastroOpen}
        onClose={() => setIsModalCadastroOpen(false)}
        title="Cadastrar Funcionário"
        onConfirm={handleCadastroSubmit}
        confirmLabel="Cadastrar"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nome completo"
            className="w-full border px-3 py-2 rounded-md"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full border px-3 py-2 rounded-md"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gerente"
              checked={formData.gerente}
              onChange={(e) => setFormData({ ...formData, gerente: e.target.checked })}
            />
            <label htmlFor="gerente" className="text-sm text-gray-700">É gerente</label>
          </div>
        </div>
      </ModalPadrao>

      {/* Modal de Edição */}
      <ModalPadrao
        isOpen={isModalEdicaoOpen}
        onClose={() => {
          setIsModalEdicaoOpen(false);
          setFuncionarioParaEditar(null);
          resetForm();
        }}
        title="Editar Funcionário"
        onConfirm={handleEdicaoSubmit}
        confirmLabel="Salvar"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nome completo"
            className="w-full border px-3 py-2 rounded-md"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full border px-3 py-2 rounded-md"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gerenteEdit"
              checked={formData.gerente}
              onChange={(e) => setFormData({ ...formData, gerente: e.target.checked })}
            />
            <label htmlFor="gerenteEdit" className="text-sm text-gray-700">É gerente</label>
          </div>
        </div>
      </ModalPadrao>
    </PageLayout>
  );
}