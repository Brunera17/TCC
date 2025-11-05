// src/pages/ServicosPage.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2,Wrench , Edit2, Eye, Info, Tag, AlignLeft, Calendar, Type as IconType } from 'lucide-react'; // Ícones adicionados/mantidos
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
import { ModalCadastroCategoria } from '../components/modals/ModalCadastroCategoria'; // Ajuste o caminho se necessário

export interface Servico {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  valor_unitario: number;
  regras_cobranca?: string;
  categoria_id?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

export interface Categoria {
  id: number;
  nome: string;
}

type ServicoCadastroPayload = {
  nome: string;
  descricao?: string;
  valor_unitario: number;
  regras_cobranca: string;
  categoria_id: number | null;
  ativo: boolean;
};

const opcoesRegrasCobranca = [
  { value: 'VALOR_UNICO', label: 'Valor Único' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'POR_HORA', label: 'Por Hora' },
  { value: 'PERCENTUAL', label: 'Percentual' },
  { value: 'POR_NF', label: 'Por NF' }
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
  const [isModalCategoriaOpen, setIsModalCategoriaOpen] = useState(false); 

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_unitario: '',
    categoria_id: '',
    regras_cobranca: opcoesRegrasCobranca[0].value,
  });

  const isAdmin = true;// Ajuste conforme sua lógica de permissão

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categorias.forEach(c => map.set(c.id, c.nome));
    return map;
  }, [categorias]);

  const filteredServicos = useMemo(() => {
    if (!searchTerm) return servicos;
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
    } catch (err) { setError('Erro ao excluir serviço'); }
  };

  const handleSearch = (term: string) => setSearchTerm(term);

  const formatarValor = (valor: number | string) => {
    const num = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(num)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const handleCategoriaCadastrada = (novaCategoria: Categoria) => {
    setIsModalCategoriaOpen(false);
    fetchCategorias();
    if (novaCategoria?.id) {
        setFormData(prev => ({ ...prev, categoria_id: novaCategoria.id.toString() }));
    }
  };
// =============================
  const columns: Column<Servico>[] = [
    { 
      key: 'nome', 
      label: 'Nome', 
      render: (_, item) => (  
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
            <Wrench className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
                <div className="text-sm font-medium text-gray-900">
                  {item.nome}
                </div>
          </div>
        </div> 
      )
    },
    { 
      key: 'codigo',
      label: 'Código', 
      render: (_, item) => (
        <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {item.codigo || 'N/A'}
        </span>
      )
    },
    { 
      key: 'valor_unitario', 
      label: 'Valor', 
      render: (_, item) => (
        <span className="inline-flex items-center text-green-600 font-medium">
          {formatarValor(item.valor_unitario)}
        </span>
      ) 
    },
    { 
      key: 'regras_cobranca', 
      label: 'Cobrança', 
      render: (_, item) => (
        <span className="text-sm text-gray-700">
          {opcoesRegrasCobranca.find(
            o => o.value === item.regras_cobranca
          )?.label || item.regras_cobranca || '-'}
        </span>
      ) 
    },
    { 
      key: 'categoria_id', 
      label: 'Categoria', 
      render: (_, item) =>(
        <span className="text-sm text-gray-500">
          {item.categoria_id ?
          categoryMap.get(item.categoria_id) || '-' 
          : '-' }
        </span>
      ) 
    },
  ];
// =============================
  const fetchServicos = useCallback(async () => {
    try {
      setIsCarregando(true);
      setError(null);
      const data = await apiService.getServicos({ ativo_only: true });
      setServicos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao buscar serviços: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      setServicos([]);
    } finally { setIsCarregando(false); }
  }, []);

// =============================

  const fetchCategorias = useCallback(async () => {
    try {
      const data = await apiService.getCategorias({ ativo_only: true });
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      setCategorias([]);
    }
  }, []);

  useEffect(() => {
    fetchServicos();
    fetchCategorias();
  }, [fetchServicos, fetchCategorias, user]);
// =============================
  const handleCadastroSubmit = async () => {
    setError(null);
    if (!formData.nome.trim() || !formData.valor_unitario || !formData.regras_cobranca) { setError('Nome, Valor Unitário e Tipo de Cobrança são obrigatórios.'); return; }
    const valorNum = parseFloat(formData.valor_unitario);
    if (isNaN(valorNum) || valorNum < 0) { setError('Valor Unitário inválido.'); return; }

    const dados: ServicoCadastroPayload = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || undefined,
      valor_unitario: valorNum,
      regras_cobranca: formData.regras_cobranca,
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      ativo: true,
    };

    try {
      await apiService.createServico(dados);
      handleCadastroClose(); fetchServicos();
    } catch (err) {
      if (err instanceof ApiError && err.details) { setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details)); }
      else if (err instanceof Error) { setError(err.message); }
      else { setError('Erro desconhecido ao cadastrar.'); }
    }
  };

  const handleEdicaoSubmit = async () => {
    if (!servicoParaEditar) return;
    setError(null);
    if (!formData.nome.trim() || !formData.valor_unitario || !formData.regras_cobranca) { setError('Nome, Valor Unitário e Tipo de Cobrança são obrigatórios.'); return; }
    const valorNum = parseFloat(formData.valor_unitario);
    if (isNaN(valorNum) || valorNum < 0) { setError('Valor Unitário inválido.'); return; }

    try {
      const dados = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        valor_unitario: valorNum,
        regras_cobranca: formData.regras_cobranca,
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      };
      await apiService.updateServico(servicoParaEditar.id, dados);
      handleEdicaoClose(); fetchServicos();
    } catch (err) {
      if (err instanceof ApiError && err.details) { setError(typeof err.details === 'string' ? err.details : err.details.error || JSON.stringify(err.details)); }
      else if (err instanceof Error) { setError(err.message); }
      else { setError('Erro desconhecido ao editar.'); }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '', descricao: '', valor_unitario: '', categoria_id: '',
      regras_cobranca: opcoesRegrasCobranca[0].value,
    });
  };

  const handleEditClick = (servico: Servico) => {
    resetForm(); setServicoParaEditar(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      valor_unitario: servico.valor_unitario.toString(),
      categoria_id: servico.categoria_id?.toString() || '',
      regras_cobranca: servico.regras_cobranca || opcoesRegrasCobranca[0].value, 
    });
    setError(null); setIsModalEdicaoOpen(true);
  };

  const handleCadastroOpen = () => { resetForm(); setError(null); setIsModalCadastroOpen(true); };
  const handleCadastroClose = () => { setIsModalCadastroOpen(false); resetForm(); setError(null); };
  const handleEdicaoClose = () => { setIsModalEdicaoOpen(false); resetForm(); setError(null); setServicoParaEditar(null); };

  return (
    <PageLayout>
      <PageHeader title="Serviços" subtitle="Gerenciar serviços oferecidos">
        {isAdmin && <IconButton icon={Plus} onClick={handleCadastroOpen} label="Novo Serviço" />}
      </PageHeader>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <SearchBar value={searchTerm} onChange={handleSearch} placeholder="Buscar por nome, código ou categoria..." />
        </div>

        <StateHandler loading={isCarregando} error={error || undefined} onErrorDismiss={() => setError(null)} isEmpty={filteredServicos.length === 0 && !isCarregando}>
          <DataTable data={filteredServicos} columns={columns}
            actions={(item) => (
              <div className="flex space-x-1">
                <IconButton icon={Eye} size="sm" variant="outline" onClick={() => handleVisualizarClick(item)} title="Visualizar" />
                <IconButton icon={Edit2} size="sm" variant="outline" onClick={() => handleEditClick(item)} title="Editar" />
                <IconButton icon={Trash2} size="sm" variant="danger" onClick={() => handleExcluirClick(item)} title="Excluir" />
              </div>
            )}
          />
        </StateHandler>
      </div>

      <ModalPadrao
        isOpen={isModalVisualizacaoOpen}
        onClose={() => setIsModalVisualizacaoOpen(false)}
        title="Detalhes do Serviço"
        confirmLabel="Fechar"
        onConfirm={() => setIsModalVisualizacaoOpen(false)}
        showFooter={true}
        size="lg"
      >
        {servicoParaVisualizar && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3">
                <Info className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Identificação</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                  <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded w-fit">{servicoParaVisualizar.codigo}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                  <p className="text-gray-900 font-semibold">{servicoParaVisualizar.nome}</p>
                </div>
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><Tag className="w-3 h-3 mr-1" /> Categoria</label>
                  <p className="text-gray-900">{categoryMap.get(servicoParaVisualizar.categoria_id || 0) || <span className="italic text-gray-400">Não informada</span>}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Valores</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <div>
                        <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><DollarSign className="w-3 h-3 mr-1" /> Valor Unitário</label>
                        <p className="text-green-700 font-bold text-base">{formatarValor(servicoParaVisualizar.valor_unitario)}</p>
                    </div>
                      <div>
                        <label className="flex items-center text-xs font-medium text-gray-500 mb-1"><IconType className="w-3 h-3 mr-1" /> Tipo de Cobrança</label>
                        <p className="text-gray-900">
                          {opcoesRegrasCobranca.find(o => o.value === servicoParaVisualizar.regras_cobranca)?.label || servicoParaVisualizar.regras_cobranca || <span className="italic text-gray-400">Não informado</span>}
                        </p>
                      </div>
                </div>
            </div>

            {servicoParaVisualizar.descricao && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center mb-3"><AlignLeft className="w-5 h-5 text-gray-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Descrição</h3></div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{servicoParaVisualizar.descricao}</p>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center mb-3"><Calendar className="w-5 h-5 text-purple-600 mr-2" /><h3 className="text-lg font-semibold text-gray-800">Datas</h3></div>
              <div className="text-sm">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data de Criação</label>
                <p className="text-gray-900">{servicoParaVisualizar.created_at ? format(new Date(servicoParaVisualizar.created_at), 'dd/MM/yyyy HH:mm') : <span className="italic text-gray-400">Não informada</span>}</p>
              </div>
            </div>
          </div>
        )}
      </ModalPadrao>

      <ConfirmDialog open={modalExclusaoOpen} onCancel={() => setModalExclusaoOpen(false)} onConfirm={handleExcluirConfirm} title="Excluir Serviço" message={`Tem certeza que deseja excluir o serviço "${servicoParaExcluir?.nome}" (Código: ${servicoParaExcluir?.codigo})? Esta ação marcará o serviço como inativo.`} confirmLabel="Sim, Excluir" variant="danger"/>

      <ModalPadrao isOpen={isModalCadastroOpen} onClose={handleCadastroClose} title="Cadastrar Novo Serviço" confirmLabel={isCarregando ? 'Cadastrando...' : 'Cadastrar'} onConfirm={handleCadastroSubmit} size="lg">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">{error}</div>}
          <input type="text" placeholder="Nome do Serviço *" className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })}/>
          <textarea placeholder="Descrição (opcional)" className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3}/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="valor_unitario_cad" className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário *</label>
              <div className="flex items-center space-x-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 px-3"><span className="text-gray-500">R$</span><input type="number" id="valor_unitario_cad" placeholder="0.00" step="0.01" min="0" className="flex-grow py-2 border-0 focus:ring-0" value={formData.valor_unitario} onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}/></div>
            </div>
            <div>
              <label htmlFor="regras_cobranca_cad" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cobrança *</label>
              <select id="regras_cobranca_cad" title="Tipo de Cobrança" className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white" value={formData.regras_cobranca} onChange={(e) => setFormData({ ...formData, regras_cobranca: e.target.value })}>{opcoesRegrasCobranca.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="categoria_id_cad" className="block text-sm font-medium text-gray-700 mb-1">Categoria (opcional)</label>
              <button
                type="button"
                onClick={() => setIsModalCategoriaOpen(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                + Nova Categoria
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <select id="categoria_id_cad" title="Categoria do serviço" className="flex-grow border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white" value={formData.categoria_id} onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}>
                <option value="">Selecione uma categoria</option>
                {categorias.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
            </div>
          </div>
        </div>
      </ModalPadrao>

      <ModalPadrao isOpen={isModalEdicaoOpen} onClose={handleEdicaoClose} title={`Editar Serviço: ${servicoParaEditar?.nome || ''}`} confirmLabel={isCarregando ? 'Salvando...' : 'Salvar Alterações'} onConfirm={handleEdicaoSubmit} size="lg">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-500 mb-1">Código</label><p className="text-sm text-gray-900 bg-gray-100 p-2 rounded">{servicoParaEditar?.codigo}</p></div>
          <input type="text" placeholder="Nome do Serviço *" className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })}/>
          <textarea placeholder="Descrição (opcional)" className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={3}/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="valor_unitario_edit" className="block text-sm font-medium text-gray-700 mb-1">Valor Unitário *</label>
                  <div className="flex items-center space-x-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 px-3"><span className="text-gray-500">R$</span><input type="number" id="valor_unitario_edit" placeholder="0.00" step="0.01" min="0" className="flex-grow py-2 border-0 focus:ring-0" value={formData.valor_unitario} onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}/></div>
              </div>
              <div>
                  <label htmlFor="regras_cobranca_edit" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cobrança *</label>
                  <select id="regras_cobranca_edit" title="Tipo de Cobrança" className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white" value={formData.regras_cobranca} onChange={(e) => setFormData({ ...formData, regras_cobranca: e.target.value })}>{opcoesRegrasCobranca.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select>
              </div>
          </div>
          <div>
            <label htmlFor="categoria_id_edit" className="block text-sm font-medium text-gray-700 mb-1">Categoria (opcional)</label>
            <div className="flex items-center space-x-2">
              <select id="categoria_id_edit" title="Categoria do serviço" className="flex-grow border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 bg-white" value={formData.categoria_id} onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}>
                <option value="">Selecione uma categoria</option>
                {categorias.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              <IconButton icon={Plus} onClick={() => setIsModalCategoriaOpen(true)} variant="outline" size="md" title="Adicionar Nova Categoria"/>
            </div>
          </div>
        </div>
      </ModalPadrao>

      <ModalCadastroCategoria isOpen={isModalCategoriaOpen} onClose={() => setIsModalCategoriaOpen(false)} onCategoriaCadastrada={handleCategoriaCadastrada}/>

    </PageLayout>
  );
}