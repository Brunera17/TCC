import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, DollarSign, Eye } from 'lucide-react';
import { apiService, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
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

interface Servico {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  valor_unitario: number;
  categoria_id?: number;
  ativo: boolean;
  created_at?: string;
}

interface Categoria {
  id: number;
  nome: string;
}

type ServicoCadastroPayload = {
  codigo: string;
  nome: string;
  descricao?: string;
  valor_unitario: number;
  categoria_id: number | null;
  ativo: boolean;
};

export default function ServicosPage() {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [isModalVisualizacaoOpen, setIsModalVisualizacaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);
  const [servicoParaEditar, setServicoParaEditar] = useState<Servico | null>(null);
  const [servicoParaVisualizar, setServicoParaVisualizar] = useState<Servico | null>(null);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<Servico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCarregando, setIsCarregando] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_unitario: '',
    codigo: '',
    categoria_id: '',
  });

  // Verificação de admin - temporariamente true para debug
  const isAdmin = true; // TODO: Voltar para Boolean(user?.gerente)

  // =============================
  // 🔹 FUNÇÕES AUXILIARES
  // =============================
  const handleVisualizarClick = (servico: Servico) => {
    setServicoParaVisualizar(servico);
    setIsModalVisualizacaoOpen(true);
  };

  const handleExcluirClick = (servico: Servico) => {
    setServicoParaExcluir(servico);
    setModalExclusaoOpen(true);
  };

  const handleExcluirConfirm = async () => {
    if (!servicoParaExcluir) return;

    try {
      await apiService.deleteServico(servicoParaExcluir.id);
      setModalExclusaoOpen(false);
      fetchServicos();
      setServicoParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
      setError('Erro ao excluir serviço');
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Aqui você pode implementar filtro se necessário
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // =============================
  // 🔹 COLUNAS DA TABELA
  // =============================
  const columns: Column<Servico>[] = [
    {
      key: 'codigo',
      label: 'Código',
      render: (_, item) => item.codigo
    },
    {
      key: 'nome',
      label: 'Nome',
      render: (_, item) => item.nome
    },
    {
      key: 'valor_unitario',
      label: 'Valor',
      render: (_, item) => (
        <span className="inline-flex items-center text-green-600 font-medium">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatarValor(item.valor_unitario)}
        </span>
      )
    },
    {
      key: 'categoria_id',
      label: 'Categoria',
      render: (_, item) => {
        const categoria = categorias.find((c) => c.id === item.categoria_id);
        return categoria?.nome || '-';
      }
    },
  ];

  // =============================
  // 🔹 BUSCAR SERVIÇOS E CATEGORIAS
  // =============================
  const fetchServicos = async () => {
    try {
      console.log('🔍 Iniciando busca de serviços...');
      setIsCarregando(true);
      setError(null);
      
      const data = await apiService.getServicos();
      console.log('✅ Serviços recebidos:', data);
      console.log('📊 Quantidade:', data?.length || 0);
      
      setServicos(data || []);
    } catch (err) {
      console.error('❌ Erro ao buscar serviços:', err);
      setError('Erro ao buscar serviços: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsCarregando(false);
      console.log('🏁 Busca finalizada. Carregando:', false);
    }
  };

  const fetchCategorias = async () => {
    try {
      console.log('🔍 Iniciando busca de categorias...');
      const data = await apiService.getCategorias();
      console.log('✅ Categorias recebidas:', data);
      setCategorias(data || []);
    } catch (err) {
      console.error('❌ Erro ao buscar categorias:', err);
    }
  };

  useEffect(() => {
    console.log('🔍 ServicosPage montado');
    console.log('👤 Usuário autenticado:', !!user);
    console.log('👤 Dados do usuário:', user);
    console.log('🔑 Token no localStorage:', !!localStorage.getItem('access_token'));
    
    fetchServicos();
    fetchCategorias();
  }, [user]);

  // =============================
  // 🔹 CADASTRO
  // =============================
  const handleCadastroSubmit = async () => {
    setError(null);

    const dados: ServicoCadastroPayload = {
      codigo: formData.codigo || `SVC-${Date.now()}`,
      nome: formData.nome,
      descricao: formData.descricao || undefined,
      valor_unitario: parseFloat(formData.valor_unitario) || 0,
      categoria_id: parseInt(formData.categoria_id) || null,
      ativo: true,
    };

    try {
      await apiService.createServico(dados);
      handleCadastroClose();
      fetchServicos();
      return;
    } catch (err) {
      console.error('Erro ao cadastrar serviço:', err);

      if (err instanceof ApiError) {
        const details = err.details;
        if (details && typeof details === 'object') {
          const serverMessage = typeof details.error === 'string' ? details.error : JSON.stringify(details);

          if (serverMessage.includes('UNIQUE constraint failed')) {
            const match = serverMessage.match(/UNIQUE constraint failed: ([\w.]+)/);
            const campo = match?.[1]?.split('.').pop();

            if (campo === 'nome' || campo === 'codigo') {
              const valorDuplicado = campo === 'nome' ? dados.nome : dados.codigo;
              const reativado = await tentarReativarServicoInativo(campo, valorDuplicado, dados);

              if (reativado) {
                handleCadastroClose();
                fetchServicos();
                return;
              }
            }

            const campoTraduzido = campo === 'codigo' ? 'código' : campo === 'nome' ? 'nome do serviço' : campo;
            setError(`Já existe um serviço cadastrado com esse ${campoTraduzido ?? 'valor'}. Ajuste os dados ou reative o registro arquivado antes de tentar novamente.`);
            return;
          }

          setError(serverMessage);
          return;
        }

        if (typeof details === 'string' && details.trim()) {
          setError(details);
          return;
        }
      }

      if (err instanceof Error) {
        setError(err.message);
        return;
      }

      setError('Erro ao cadastrar serviço');
    }
  };

  // =============================
  // 🔹 EDIÇÃO
  // =============================
  const handleEdicaoSubmit = async () => {
    if (!servicoParaEditar) return;

    try {
      const dados = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        valor_unitario: parseFloat(formData.valor_unitario) || 0,
        categoria_id: parseInt(formData.categoria_id) || null,
      };

      console.log('📝 Dados para edição:', dados);
      console.log('🆔 ID do serviço:', servicoParaEditar.id);
      
      await apiService.updateServico(servicoParaEditar.id, dados);
      handleEdicaoClose();
      fetchServicos();
    } catch (err: unknown) {
      console.error('Erro ao editar serviço:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao editar serviço: ${errorMessage}`);
    }
  };

  // =============================
  // 🔹 UTILITÁRIOS
  // =============================
  const tentarReativarServicoInativo = async (
    campo: 'nome' | 'codigo',
    valor: string,
    dados: ServicoCadastroPayload
  ): Promise<boolean> => {
    if (!valor) return false;

    try {
      const existente = campo === 'nome'
        ? await apiService.getServicoPorNome(valor)
        : await apiService.getServicoPorCodigo(valor);

      if (!existente) {
        return false;
      }

      if (existente && existente.ativo === false) {
        await apiService.updateServico(existente.id, {
          nome: dados.nome,
          descricao: dados.descricao,
          valor_unitario: dados.valor_unitario,
          categoria_id: dados.categoria_id,
          ativo: true,
        });
        console.info('🔁 Serviço reativado automaticamente:', existente.id);
        return true;
      }
    } catch (erroReativacao) {
      if (erroReativacao instanceof ApiError && erroReativacao.status === 404) {
        return false;
      }

      console.warn('⚠️ Não foi possível reativar serviço inativo automaticamente:', erroReativacao);
    }

    return false;
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      valor_unitario: '',
      codigo: '',
      categoria_id: '',
    });
  };

  const handleEditClick = (servico: Servico) => {
    resetForm(); // Limpa o formulário primeiro
    setServicoParaEditar(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      valor_unitario: servico.valor_unitario.toString(),
      codigo: servico.codigo,
      categoria_id: servico.categoria_id?.toString() || '',
    });
    setIsModalEdicaoOpen(true);
  };

  // Função para abrir modal de cadastro
  const handleCadastroOpen = () => {
    resetForm();
    setServicoParaEditar(null);
    setIsModalCadastroOpen(true);
  };

  // Função para fechar modal de cadastro
  const handleCadastroClose = () => {
    setIsModalCadastroOpen(false);
    resetForm();
    setServicoParaEditar(null);
  };

  // Função para fechar modal de edição
  const handleEdicaoClose = () => {
    setIsModalEdicaoOpen(false);
    resetForm();
    setServicoParaEditar(null);
  };

  // =============================
  // 🔹 INTERFACE
  // =============================
  return (
    <PageLayout>
      <PageHeader 
        title="Serviços"
        subtitle="Gerenciar serviços oferecidos"
      >
        {isAdmin && (
          <IconButton
            icon={Plus}
            onClick={handleCadastroOpen}
            label="Novo Serviço"
          />
        )}
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <SearchBar
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Buscar serviços..."
          />
        </div>

        <StateHandler
          loading={isCarregando}
          error={error || undefined}
          isEmpty={servicos.length === 0}
        >
          <DataTable
            data={servicos}
            columns={columns}
            actions={(item) => {
              console.log('🔍 Renderizando ações para item:', item.id, 'isAdmin:', isAdmin);
              return (
                <div className="flex space-x-2">
                  <IconButton
                    icon={Eye}
                    size="sm"
                    variant="outline"
                    onClick={() => handleVisualizarClick(item)}
                    label="Visualizar"
                  />
                  {isAdmin && (
                    <>
                      <IconButton
                        icon={Edit2}
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(item)}
                        label="Editar"
                      />
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        variant="danger"
                        onClick={() => handleExcluirClick(item)}
                        label="Excluir"
                      />
                    </>
                  )}
                </div>
              );
            }}
          />
        </StateHandler>
      </div>

      {/* Modal de Visualização */}
      <ModalPadrao
        isOpen={isModalVisualizacaoOpen}
        onClose={() => setIsModalVisualizacaoOpen(false)}
        title="Detalhes do Serviço"
        onConfirm={() => setIsModalVisualizacaoOpen(false)}
        confirmLabel="Fechar"
      >
        {servicoParaVisualizar && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <p className="text-sm text-gray-900">{servicoParaVisualizar.codigo}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <p className="text-sm text-gray-900">{servicoParaVisualizar.nome}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário</label>
              <p className="text-sm text-gray-900">{formatarValor(servicoParaVisualizar.valor_unitario)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <p className="text-sm text-gray-900">{servicoParaVisualizar.descricao || 'Não informado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <p className="text-sm text-gray-900">
                {categorias.find(c => c.id === servicoParaVisualizar.categoria_id)?.nome || 'Não informado'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
              <p className="text-sm text-gray-900">
                {servicoParaVisualizar.created_at 
                  ? format(new Date(servicoParaVisualizar.created_at), 'dd/MM/yyyy')
                  : 'Não informado'
                }
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
        title="Excluir Serviço"
        message={`Tem certeza que deseja excluir o serviço "${servicoParaExcluir?.nome}"?`}
        confirmLabel="Excluir"
        variant="danger"
      />

      {/* ==================== MODAL DE CADASTRO ==================== */}
      {isModalCadastroOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Cadastrar Serviço</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              <textarea
                placeholder="Descrição"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
              <input
                type="number"
                placeholder="Valor unitário"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.valor_unitario}
                onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
              />
              <select
                title="Categoria do serviço"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={handleCadastroClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCadastroSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DE EDIÇÃO ==================== */}
      {isModalEdicaoOpen && servicoParaEditar && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Editar Serviço</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              <textarea
                placeholder="Descrição"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
              <input
                type="number"
                placeholder="Valor unitário"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.valor_unitario}
                onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
              />
              <select
                title="Categoria do serviço"
                className="w-full border px-3 py-2 rounded-md"
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={handleEdicaoClose}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdicaoSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
