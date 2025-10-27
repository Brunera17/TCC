// src/pages/ServicosPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, DollarSign, Eye, Info, Tag, AlignLeft, Calendar, Hash, Type as IconType } from 'lucide-react'; // Adicionados ícones
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
// IMPORTAR O NOVO MODAL E A INTERFACE FieldConfig (se ModalVisualizacaoPadrao for usado)
import { ModalCadastroCategoria } from '../components/modals/ModalCadastroCategoria'; // Ajuste o caminho se necessário
import { ModalVisualizacaoPadrao, FieldConfig } from '../components/ui/ModalVisualizacaoPadrao'; // Ajuste o caminho

// --- Interfaces (Mantenha ou importe de types/index.ts) ---
interface Servico {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  valor_unitario: number;
  regras_cobranca?: string; // <-- Campo adicionado
  categoria_id?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string; // Adicionado para consistência
  status?: string; // Adicionado para consistência (pode ser usado no lugar de 'ativo')
}

interface Categoria {
  id: number;
  nome: string;
  // ativo: boolean; // Se existir no seu modelo Categoria
}

// Interface ajustada para incluir regras_cobranca
// (Idealmente definida em types/index.ts)
type ServicoCadastroPayload = {
  // codigo?: string; // Removido, gerado no backend
  nome: string;
  descricao?: string;
  valor_unitario: number;
  regras_cobranca: string; // <-- Campo adicionado e obrigatório (?)
  categoria_id: number | null;
  ativo: boolean;
};

// --- Constantes ---
const opcoesRegrasCobranca = [
  { value: 'VALOR_UNICO', label: 'Valor Único' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'POR_HORA', label: 'Por Hora' },
  { value: 'PERCENTUAL', label: 'Percentual' },
  // { value: 'POR_NF', label: 'Por NF' } // Adicione se necessário
];

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

  // Estado do Modal de Categoria
  const [isModalCategoriaOpen, setIsModalCategoriaOpen] = useState(false);

  // Estado do formulário atualizado
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_unitario: '',
    // codigo: '', // Removido
    categoria_id: '',
    regras_cobranca: opcoesRegrasCobranca[0].value, // Valor padrão
  });

  const isAdmin = true; // TODO: Voltar para Boolean(user?.gerente)

  // =============================
  // 🔹 FUNÇÕES AUXILIARES E MAPAS
  // =============================
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categorias.forEach(c => map.set(c.id, c.nome));
    return map;
  }, [categorias]);

  const filteredServicos = useMemo(() => {
    if (!searchTerm) {
      return servicos;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return servicos.filter(servico =>
      servico.nome.toLowerCase().includes(lowerSearchTerm) ||
      servico.codigo.toLowerCase().includes(lowerSearchTerm) ||
      (servico.categoria_id && categoryMap.get(servico.categoria_id)?.toLowerCase().includes(lowerSearchTerm))
    );
  }, [servicos, searchTerm, categoryMap]);

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
  };

  const formatarValor = (valor: number | string) => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(num)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  // Callback para o modal de categoria
  const handleCategoriaCadastrada = (novaCategoria: Categoria) => {
    setIsModalCategoriaOpen(false); // Fecha o modal de categoria
    fetchCategorias(); // Atualiza a lista de categorias
    // Seleciona automaticamente a nova categoria no formulário de serviço
    if (novaCategoria?.id) {
        setFormData(prev => ({ ...prev, categoria_id: novaCategoria.id.toString() }));
    }
    // Opcional: Mostrar notificação de sucesso
    // showSuccess('Categoria Criada!', `A categoria "${novaCategoria.nome}" foi criada.`);
  };

  // =============================
  // 🔹 COLUNAS DA TABELA
  // =============================
  const columns: Column<Servico>[] = [
    {
      key: 'codigo', // Use string literal for key
      label: 'Código',
      render: (_, item) => item.codigo
    },
    {
      key: 'nome', // Use string literal for key
      label: 'Nome',
      render: (_, item) => item.nome
    },
    {
      key: 'valor_unitario', // Use string literal for key
      label: 'Valor',
      render: (_, item) => (
        <span className="inline-flex items-center text-green-600 font-medium">
          <DollarSign className="w-4 h-4 mr-1" />
          {formatarValor(item.valor_unitario)}
        </span>
      )
    },
    {
       key: 'regras_cobranca', // <-- Nova coluna
       label: 'Cobrança',
       render: (_, item) => (
            <span className="text-sm text-gray-700">
                {opcoesRegrasCobranca.find(o => o.value === item.regras_cobranca)?.label || item.regras_cobranca || '-'}
            </span>
       )
    },
    {
      key: 'categoria_id', // Use string literal for key
      label: 'Categoria',
      render: (_, item) => {
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
      // Ajustar para buscar todos (ativos e inativos) se a lógica de reativação
      // depender de encontrar inativos na lista principal, ou manter como está.
      const data = await apiService.getServicos({ ativo_only: true }); // Exemplo: { ativo_only: true }
      console.log('✅ Serviços recebidos:', data);
      setServicos(Array.isArray(data) ? data : []); // Garante que é um array
    } catch (err) {
      console.error('❌ Erro ao buscar serviços:', err);
      setError('Erro ao buscar serviços: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      setServicos([]); // Define como array vazio em caso de erro
    } finally {
      setIsCarregando(false);
      console.log('🏁 Busca de serviços finalizada.');
    }
  };

  const fetchCategorias = async () => {
    try {
      console.log('🔍 Iniciando busca de categorias...');
      const data = await apiService.getCategorias({ ativo_only: true }); // Exemplo: buscar apenas ativas
      console.log('✅ Categorias recebidas:', data);
      setCategorias(Array.isArray(data) ? data : []); // Garante que é um array
    } catch (err) {
      console.error('❌ Erro ao buscar categorias:', err);
      setCategorias([]); // Define como array vazio em caso de erro
      // Considerar adicionar setError aqui se for crítico
    }
  };

  useEffect(() => {
    console.log('🔍 ServicosPage montado');
    fetchServicos();
    fetchCategorias();
  }, [user]);

  // =============================
  // 🔹 CADASTRO
  // =============================
  const handleCadastroSubmit = async () => {
    setError(null);

    // Validação frontend básica
    if (!formData.nome.trim() || !formData.valor_unitario || !formData.regras_cobranca) {
        setError('Nome, Valor Unitário e Tipo de Cobrança são obrigatórios.');
        return;
    }
    const valorNum = parseFloat(formData.valor_unitario);
    if (isNaN(valorNum) || valorNum < 0) {
        setError('Valor Unitário inválido.');
        return;
    }

    const dados: ServicoCadastroPayload = {
      nome: formData.nome.trim(), // Garante que não há espaços extras
      descricao: formData.descricao.trim() || undefined,
      valor_unitario: valorNum,
      regras_cobranca: formData.regras_cobranca, // <-- Incluído
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      ativo: true,
      // codigo: '', // Enviar vazio ou null se backend esperar mas for ignorar
    };

    try {
      // A lógica de reativação agora está no backend (ServicoService.criar_servico)
      await apiService.createServico(dados);
      handleCadastroClose();
      fetchServicos(); // Rebusca os dados para incluir o novo ou reativado
    } catch (err) {
      console.error('Erro ao cadastrar serviço:', err);
      if (err instanceof ApiError && err.details) {
         setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao cadastrar serviço.');
      }
      // Não precisa mais da lógica 'tentarReativarServicoInativo' aqui
    }
  };

  // =============================
  // 🔹 EDIÇÃO
  // =============================
  const handleEdicaoSubmit = async () => {
    if (!servicoParaEditar) return;
    setError(null);

    // Validação frontend básica
    if (!formData.nome.trim() || !formData.valor_unitario || !formData.regras_cobranca) {
        setError('Nome, Valor Unitário e Tipo de Cobrança são obrigatórios.');
        return;
    }
    const valorNum = parseFloat(formData.valor_unitario);
    if (isNaN(valorNum) || valorNum < 0) {
        setError('Valor Unitário inválido.');
        return;
    }

    try {
      const dados = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        valor_unitario: valorNum,
        regras_cobranca: formData.regras_cobranca, // <-- Incluído
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
        // 'ativo' geralmente não é editado aqui
      };

      await apiService.updateServico(servicoParaEditar.id, dados);
      handleEdicaoClose();
      fetchServicos();
    } catch (err: unknown) {
      console.error('Erro ao editar serviço:', err);
      if (err instanceof ApiError && err.details) {
         setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro desconhecido ao editar serviço.');
      }
    }
  };

  // =============================
  // 🔹 UTILITÁRIOS
  // =============================
  // Remover tentarReativarServicoInativo se a lógica foi movida para o backend

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      valor_unitario: '',
      // codigo: '', // Removido
      categoria_id: '',
      regras_cobranca: opcoesRegrasCobranca[0].value, // Reset para o padrão
    });
  };

  const handleEditClick = (servico: Servico) => {
    resetForm();
    setServicoParaEditar(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      valor_unitario: servico.valor_unitario.toString(),
      // codigo: servico.codigo, // Não é mais editável no form
      categoria_id: servico.categoria_id?.toString() || '',
      regras_cobranca: servico.regras_cobranca || opcoesRegrasCobranca[0].value, // Preenche
    });
    setError(null); // Limpa erros ao abrir
    setIsModalEdicaoOpen(true);
  };

  const handleCadastroOpen = () => {
    resetForm();
    setError(null);
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

  // Configuração para o ModalVisualizacaoPadrao (opcional)
  const servicoViewConfig: FieldConfig[] = useMemo(() => [
        { key: 'codigo', label: 'Código', icon: Hash, section: 'Identificação' },
        { key: 'nome', label: 'Nome', icon: Info, section: 'Identificação' },
        { key: 'categoria_id', label: 'Categoria', icon: Tag, section: 'Identificação',
            render: (value, data) => (
                <p className="text-sm text-gray-900">{categoryMap.get(data.categoria_id || 0) || <span className="italic text-gray-400">Não informada</span>}</p>
            )
        },
        { key: 'valor_unitario', label: 'Valor Unitário', icon: DollarSign, section: 'Valores' },
        {
            key: 'regras_cobranca',
            label: 'Tipo de Cobrança',
            icon: IconType,
            section: 'Valores',
            formatter: (value) => opcoesRegrasCobranca.find(o => o.value === value)?.label || String(value)
        },
        { key: 'descricao', label: 'Descrição', icon: AlignLeft, section: 'Detalhes', hidden: !servicoParaVisualizar?.descricao }, // Oculta se não houver descrição
        { key: 'created_at', label: 'Data de Criação', icon: Calendar, section: 'Datas' },
        // Ocultar campos não relevantes
        { key: 'id', hidden: true },
        { key: 'ativo', hidden: true },
        { key: 'updated_at', hidden: true },
        { key: 'status', hidden: true },
  ], [categoryMap, servicoParaVisualizar]); // Dependências do useMemo

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
            onChange={handleSearch}
            placeholder="Buscar por nome, código ou categoria..."
          />
        </div>

        <StateHandler
          loading={isCarregando}
          error={error || undefined}
          onErrorDismiss={() => setError(null)}
          isEmpty={filteredServicos.length === 0 && !isCarregando} // Melhor condição de vazio
          emptyState={
            <div className="text-center py-10 px-6">
               <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" /> {/* Ícone Package */}
              <p className="text-gray-500 font-medium">
                {searchTerm
                  ? `Nenhum serviço encontrado para "${searchTerm}"`
                  : "Nenhum serviço cadastrado ainda."}
              </p>
               {!searchTerm && isAdmin && (
                 <button onClick={handleCadastroOpen} className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
                   + Cadastrar Novo Serviço
                 </button>
               )}
            </div>
          }
        >
          <DataTable
            data={filteredServicos}
            columns={columns}
            actions={(item) => (
              <div className="flex space-x-1"> {/* Reduzir espaço se necessário */}
                <IconButton
                  icon={Eye}
                  size="sm"
                  variant="outline"
                  onClick={() => handleVisualizarClick(item)}
                  title="Visualizar" // Adicionar title para acessibilidade
                />
                {isAdmin && (
                  <>
                    <IconButton
                      icon={Edit2}
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(item)}
                      title="Editar"
                    />
                    <IconButton
                      icon={Trash2}
                      size="sm"
                      variant="danger"
                      onClick={() => handleExcluirClick(item)}
                      title="Excluir"
                    />
                  </>
                )}
              </div>
            )}
          />
        </StateHandler>
      </div>

      {/* Modal de Visualização com Componente Genérico */}
      <ModalVisualizacaoPadrao
        isOpen={isModalVisualizacaoOpen}
        onClose={() => setIsModalVisualizacaoOpen(false)}
        title="Detalhes do Serviço"
        data={servicoParaVisualizar}
        config={servicoViewConfig}
        size="lg"
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        open={modalExclusaoOpen}
        onCancel={() => setModalExclusaoOpen(false)}
        onConfirm={handleExcluirConfirm}
        title="Excluir Serviço"
        message={`Tem certeza que deseja excluir o serviço "${servicoParaExcluir?.nome}" (Código: ${servicoParaExcluir?.codigo})? Esta ação marcará o serviço como inativo.`}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />

      {/* ==================== MODAL DE CADASTRO ==================== */}
      <ModalPadrao
        isOpen={isModalCadastroOpen}
        onClose={handleCadastroClose}
        title="Cadastrar Novo Serviço"
        confirmLabel={isCarregando ? 'Cadastrando...' : 'Cadastrar'} // Feedback visual
        onConfirm={handleCadastroSubmit}
        size="lg" // Ajustado para 'lg'
      >
        {/* Conteúdo do formulário */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Nome do Serviço *"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
          {/* Campo Código removido do cadastro */}
          <textarea
            placeholder="Descrição (opcional)"
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500"
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="valor_unitario_cad" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Unitário *
                  </label>
                  <div className="flex items-center space-x-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 px-3">
                     <span className="text-gray-500">R$</span>
                     <input
                       type="number"
                       id="valor_unitario_cad"
                       placeholder="0.00"
                       step="0.01"
                       min="0"
                       className="flex-grow py-2 border-0 focus:ring-0" // Input sem borda interna
                       value={formData.valor_unitario}
                       onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                     />
                  </div>
              </div>
              <div>
                  <label htmlFor="regras_cobranca_cad" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cobrança *
                  </label>
                  <select
                    id="regras_cobranca_cad"
                    title="Tipo de Cobrança"
                    className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                    value={formData.regras_cobranca}
                    onChange={(e) => setFormData({ ...formData, regras_cobranca: e.target.value })}
                  >
                    {opcoesRegrasCobranca.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
               </div>
          </div>
          <div>
            <label htmlFor="categoria_id_cad" className="block text-sm font-medium text-gray-700 mb-1">
              Categoria (opcional)
            </label>
            <div className="flex items-center space-x-2">
              <select
                id="categoria_id_cad"
                title="Categoria do serviço"
                className="flex-grow border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
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
              <IconButton
                icon={Plus}
                onClick={() => setIsModalCategoriaOpen(true)}
                variant="outline"
                size="md"
                title="Adicionar Nova Categoria"
              />
            </div>
          </div>
        </div>
      </ModalPadrao>

      {/* ==================== MODAL DE EDIÇÃO ==================== */}
      <ModalPadrao
        isOpen={isModalEdicaoOpen}
        onClose={handleEdicaoClose}
        title={`Editar Serviço: ${servicoParaEditar?.nome || ''}`}
        confirmLabel={isCarregando ? 'Salvando...' : 'Salvar Alterações'} // Feedback visual
        onConfirm={handleEdicaoSubmit}
        size="lg" // Ajustado para 'lg'
      >
        {/* Conteúdo do formulário */}
         <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Código</label>
            <p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">{servicoParaEditar?.codigo}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="valor_unitario_edit" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Unitário *
                  </label>
                  <div className="flex items-center space-x-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 px-3">
                     <span className="text-gray-500">R$</span>
                     <input
                       type="number"
                       id="valor_unitario_edit"
                       placeholder="0.00"
                       step="0.01"
                       min="0"
                       className="flex-grow py-2 border-0 focus:ring-0"
                       value={formData.valor_unitario}
                       onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                     />
                  </div>
              </div>
              <div>
                  <label htmlFor="regras_cobranca_edit" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cobrança *
                  </label>
                  <select
                    id="regras_cobranca_edit"
                    title="Tipo de Cobrança"
                    className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                    value={formData.regras_cobranca}
                    onChange={(e) => setFormData({ ...formData, regras_cobranca: e.target.value })}
                  >
                    {opcoesRegrasCobranca.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
               </div>
          </div>
          <div>
            <label htmlFor="categoria_id_edit" className="block text-sm font-medium text-gray-700 mb-1">
              Categoria (opcional)
            </label>
            <div className="flex items-center space-x-2">
              <select
                id="categoria_id_edit"
                title="Categoria do serviço"
                className="flex-grow border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
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
              <IconButton
                icon={Plus}
                onClick={() => setIsModalCategoriaOpen(true)}
                variant="outline"
                size="md"
                title="Adicionar Nova Categoria"
              />
            </div>
          </div>
        </div>
      </ModalPadrao>

      {/* Modal de Cadastro de Categoria */}
      <ModalCadastroCategoria
        isOpen={isModalCategoriaOpen}
        onClose={() => setIsModalCategoriaOpen(false)}
        onCategoriaCadastrada={handleCategoriaCadastrada}
      />

    </PageLayout>
  );
}