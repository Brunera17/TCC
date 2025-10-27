import { useState, useEffect, useMemo } from 'react'; // 👈 Adicionado useMemo
import { Plus, Trash2, Edit2, DollarSign, Eye } from 'lucide-react';
import { apiService, ApiError } from '../lib/api'; // Import ApiError
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

  const isAdmin = true; // TODO: Voltar para Boolean(user?.gerente)

  // =============================
  // 🔹 FUNÇÕES AUXILIARES E MAPAS
  // =============================

  // Mapa de categorias para otimizar busca de nome (O(1))
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categorias.forEach(c => map.set(c.id, c.nome));
    return map;
  }, [categorias]);

  // Filtra os serviços com base no termo de busca
  const filteredServicos = useMemo(() => {
    if (!searchTerm) {
      return servicos; // Retorna todos se a busca estiver vazia
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return servicos.filter(servico =>
      servico.nome.toLowerCase().includes(lowerSearchTerm) ||
      servico.codigo.toLowerCase().includes(lowerSearchTerm) ||
      (servico.categoria_id && categoryMap.get(servico.categoria_id)?.toLowerCase().includes(lowerSearchTerm))
    );
  }, [servicos, searchTerm, categoryMap]); // Recalcula se dados, busca ou mapa mudarem

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
      fetchServicos(); // Rebusca os dados
      setServicoParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir serviço:', err);
      setError('Erro ao excluir serviço');
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
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
        // ⚡️ Otimizado: Busca O(1) no mapa
        return item.categoria_id ? categoryMap.get(item.categoria_id) || '-' : '-';
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
      setServicos(data || []);
    } catch (err) {
      console.error('❌ Erro ao buscar serviços:', err);
      setError('Erro ao buscar serviços: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsCarregando(false);
      console.log('🏁 Busca de serviços finalizada.');
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
      // Pode adicionar um setError aqui se a falha for crítica
    }
  };

  useEffect(() => {
    console.log('🔍 ServicosPage montado');
    fetchServicos();
    fetchCategorias();
  }, [user]); // Dependência mantida para possível re-fetch se usuário mudar

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
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      ativo: true,
    };

    try {
      await apiService.createServico(dados);
      handleCadastroClose();
      fetchServicos(); // Rebusca os dados
      return; // Importante para sair da função
    } catch (err) {
      console.error('Erro ao cadastrar serviço:', err);

      // Tratamento de erro detalhado
      if (err instanceof ApiError) {
        const details = err.details;
        if (details && typeof details === 'object') {
          const serverMessage = typeof details.error === 'string' ? details.error : JSON.stringify(details);

          if (serverMessage.includes('UNIQUE constraint failed')) {
            const match = serverMessage.match(/UNIQUE constraint failed: ([\w.]+)/);
            const campo = match?.[1]?.split('.').pop();

            if (campo === 'nome' || campo === 'codigo') {
              const valorDuplicado = campo === 'nome' ? dados.nome : dados.codigo;
              const reativado = await tentarReativarServicoInativo(campo as 'nome' | 'codigo', valorDuplicado, dados);

              if (reativado) {
                handleCadastroClose();
                fetchServicos(); // Rebusca os dados
                return; // Serviço reativado, sair da função
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
    setError(null);

    try {
      const dados = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        valor_unitario: parseFloat(formData.valor_unitario) || 0,
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
        // O campo 'ativo' geralmente não é editado aqui, mas sim em uma ação separada (ativar/desativar)
      };

      await apiService.updateServico(servicoParaEditar.id, dados);
      handleEdicaoClose();
      fetchServicos(); // Rebusca os dados
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

      // Se não existe ou se o erro não foi 404, não tentar reativar
      if (!existente) {
        return false;
      }

      // Se existe e está inativo, tenta reativar com os novos dados
      if (existente && existente.ativo === false) {
        await apiService.updateServico(existente.id, {
          ...dados, // Usa os novos dados do formulário
          ativo: true, // Garante que será reativado
        });
        console.info('🔁 Serviço reativado automaticamente:', existente.id);
        return true;
      }
    } catch (erroReativacao) {
      // Ignorar erro 404 (significa que realmente não existe)
      if (erroReativacao instanceof ApiError && erroReativacao.status === 404) {
        return false;
      }
      // Logar outros erros mas continuar (o erro original será mostrado)
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
    resetForm();
    setServicoParaEditar(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      valor_unitario: servico.valor_unitario.toString(),
      codigo: servico.codigo, // Geralmente o código não é editável, mas preenchemos
      categoria_id: servico.categoria_id?.toString() || '',
    });
    setIsModalEdicaoOpen(true);
  };

  const handleCadastroOpen = () => {
    resetForm();
    setError(null); // Limpa erros ao abrir o modal
    setIsModalCadastroOpen(true);
  };

  const handleCadastroClose = () => {
    setIsModalCadastroOpen(false);
    resetForm();
    setError(null);
  };

  const handleEdicaoClose = () => {
    setIsModalEdicaoOpen(false);
    resetForm();
    setError(null);
    setServicoParaEditar(null);
  };

  // =============================
  // 🔹 INTERFACE (JSX)
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
            onChange={handleSearch} // A função handleSearch atualiza o estado searchTerm
            placeholder="Buscar por nome, código ou categoria..."
          />
        </div>

        <StateHandler
          loading={isCarregando}
          error={error || undefined} // Mostra o erro aqui se houver
          onErrorDismiss={() => setError(null)} // Permite fechar a mensagem de erro
          isEmpty={filteredServicos.length === 0 && !searchTerm} // Condição de vazio
          emptyState={
            <div className="text-center py-10">
              <p className="text-gray-500">
                {searchTerm
                  ? `Nenhum serviço encontrado para "${searchTerm}"`
                  : "Nenhum serviço cadastrado ainda."}
              </p>
            </div>
          }
        >
          <DataTable
            data={filteredServicos} // 👈 USA OS DADOS FILTRADOS
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
        title="Detalhes do Serviço"
        confirmLabel="Fechar"
        onConfirm={() => setIsModalVisualizacaoOpen(false)} // Apenas fecha
        showFooter={true} // Mostrar o botão Fechar
        size="md"
      >
        {servicoParaVisualizar && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Código</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{servicoParaVisualizar.codigo}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Nome</label>
              <p className="text-sm text-gray-900">{servicoParaVisualizar.nome}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Valor Unitário</label>
              <p className="text-sm text-gray-900 font-semibold text-green-700">{formatarValor(servicoParaVisualizar.valor_unitario)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Descrição</label>
              <p className="text-sm text-gray-900">{servicoParaVisualizar.descricao || <span className="italic text-gray-400">Não informado</span>}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Categoria</label>
              <p className="text-sm text-gray-900">{categoryMap.get(servicoParaVisualizar.categoria_id || 0) || <span className="italic text-gray-400">Não informado</span>}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Data de Criação</label>
              <p className="text-sm text-gray-900">
                {servicoParaVisualizar.created_at
                  ? format(new Date(servicoParaVisualizar.created_at), 'dd/MM/yyyy HH:mm')
                  : <span className="italic text-gray-400">Não informado</span>
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
        message={`Tem certeza que deseja excluir o serviço "${servicoParaExcluir?.nome}" (Código: ${servicoParaExcluir?.codigo})? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Permanentemente"
        variant="danger"
      />

      {/* ==================== MODAL DE CADASTRO ==================== */}
      <ModalPadrao
        isOpen={isModalCadastroOpen}
        onClose={handleCadastroClose}
        title="Cadastrar Novo Serviço"
        confirmLabel="Cadastrar"
        onConfirm={handleCadastroSubmit} // A função de confirmação chama o submit
        size="lg"
      >
        <div className="space-y-4">
          {/* Mostra erro específico do modal aqui */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <input
            type="text"
            placeholder="Nome do Serviço *"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <input
            type="text"
            placeholder="Código (opcional, ex: SVC-001)"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.codigo}
            onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
          />
          <textarea
            placeholder="Descrição (opcional)"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
          />
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">R$</span>
            <input
              type="number"
              placeholder="Valor unitário *"
              step="0.01"
              min="0"
              className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
              value={formData.valor_unitario}
              onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
            />
          </div>
          <select
            title="Categoria do serviço"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            value={formData.categoria_id}
            onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
          >
            <option value="">Selecione uma categoria (opcional)</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </ModalPadrao>

      {/* ==================== MODAL DE EDIÇÃO ==================== */}
      <ModalPadrao
        isOpen={isModalEdicaoOpen}
        onClose={handleEdicaoClose}
        title={`Editar Serviço: ${servicoParaEditar?.nome || ''}`}
        confirmLabel="Salvar Alterações"
        onConfirm={handleEdicaoSubmit} // A função de confirmação chama o submit
        size="lg"
      >
        <div className="space-y-4">
          {/* Mostra erro específico do modal aqui */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {/* Código não editável */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Código</label>
            <p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">{formData.codigo}</p>
          </div>
          <input
            type="text"
            placeholder="Nome do Serviço *"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          <textarea
            placeholder="Descrição (opcional)"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
          />
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">R$</span>
            <input
              type="number"
              placeholder="Valor unitário *"
              step="0.01"
              min="0"
              className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
              value={formData.valor_unitario}
              onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
            />
          </div>
          <select
            title="Categoria do serviço"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
            value={formData.categoria_id}
            onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
          >
            <option value="">Selecione uma categoria (opcional)</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </ModalPadrao>
    </PageLayout>
  );
}