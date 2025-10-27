import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Eye, Edit2, Clock, CheckCircle, XCircle, Users, History } from 'lucide-react';
import { apiService } from '../lib/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/modals/Modal';
import { Button } from '../components/forms/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { Textarea } from '../components/forms/Textarea';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/layout/Card';
import { DataTable } from '../components/layout/DataTable';
import { NotificacoesVencimento } from '../components/common/NotificacoesVencimento';
import { HistoricoAlteracoes } from '../components/common/HistoricoAlteracoes';
import type { OrdemServico, OrdemServicoCreateData, Cliente, Departamento } from '../types';

const statusOptions = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'finalizada', label: 'Finalizada' },
  { value: 'cancelada', label: 'Cancelada' }
];

const statusColors = {
  aberta: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  em_andamento: 'bg-blue-100 text-blue-800 border-blue-300',
  finalizada: 'bg-green-100 text-green-800 border-green-300',
  cancelada: 'bg-red-100 text-red-800 border-red-300'
};

const statusIcons = {
  aberta: Clock,
  em_andamento: Users,
  finalizada: CheckCircle,
  cancelada: XCircle
};

export const OrdemServicosPage: React.FC = () => {
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isModalCadastroOpen, setIsModalCadastroOpen] = useState(false);
  const [isModalVisualizacaoOpen, setIsModalVisualizacaoOpen] = useState(false);
  const [isModalEdicaoOpen, setIsModalEdicaoOpen] = useState(false);
  const [isModalExclusaoOpen, setIsModalExclusaoOpen] = useState(false);
  const [isModalHistoricoOpen, setIsModalHistoricoOpen] = useState(false);
  
  // Estados dos formulários
  const [ordemParaVisualizar, setOrdemParaVisualizar] = useState<OrdemServico | null>(null);
  const [ordemParaEditar, setOrdemParaEditar] = useState<OrdemServico | null>(null);
  const [ordemParaDeletar, setOrdemParaDeletar] = useState<OrdemServico | null>(null);
  const [ordemParaHistorico, setOrdemParaHistorico] = useState<OrdemServico | null>(null);
  
  // Formulário de cadastro/edição
  const [formData, setFormData] = useState<OrdemServicoCreateData>({
    protocolo: '',
    cliente_id: 0,
    usuario_id: 1, // Assumindo usuário logado
    departamento_id: undefined,
    vencimento: '',
    observacao: '',
    status: 'aberta'
  });

  // Buscar dados iniciais
  const fetchOrdensServico = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        per_page: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter })
      };

      const response = await apiService.getOrdensServico(params);
      setOrdensServico(response.data);
      setTotalPages(Math.ceil(response.total / response.per_page));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError('Erro ao carregar ordens de serviço: ' + errorMessage);
      console.error('Erro ao buscar ordens de serviço:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrdensServico();
    fetchClientes();
    fetchDepartamentos();
  }, [fetchOrdensServico]);

  const fetchClientes = async () => {
    try {
      const response = await apiService.getClientes({ per_page: 1000 });
      setClientes(response.data);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  const fetchDepartamentos = async () => {
    try {
      const response = await apiService.getDepartamentos();
      setDepartamentos(response.data);
    } catch (err) {
      console.error('Erro ao buscar departamentos:', err);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const generateProtocolo = () => {
    const ano = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `OS-${ano}-${timestamp}`;
  };

  const openModalCadastro = () => {
    setFormData({
      protocolo: generateProtocolo(),
      cliente_id: 0,
      usuario_id: 1,
      departamento_id: undefined,
      vencimento: '',
      observacao: '',
      status: 'aberta'
    });
    setIsModalCadastroOpen(true);
  };

  const openModalVisualizacao = (ordem: OrdemServico) => {
    setOrdemParaVisualizar(ordem);
    setIsModalVisualizacaoOpen(true);
  };

  const openModalEdicao = (ordem: OrdemServico) => {
    setOrdemParaEditar(ordem);
    setFormData({
      protocolo: ordem.protocolo,
      cliente_id: ordem.cliente_id,
      usuario_id: ordem.usuario_id,
      departamento_id: ordem.departamento_id,
      vencimento: ordem.vencimento.split('T')[0], // Formato para input date
      observacao: ordem.observacao || '',
      status: ordem.status
    });
    setIsModalEdicaoOpen(true);
  };

  const openModalExclusao = (ordem: OrdemServico) => {
    setOrdemParaDeletar(ordem);
    setIsModalExclusaoOpen(true);
  };

  const openModalHistorico = (ordem: OrdemServico) => {
    setOrdemParaHistorico(ordem);
    setIsModalHistoricoOpen(true);
  };

  const handleNotificacaoClick = (ordem: OrdemServico) => {
    // Abrir modal de visualização quando clicar em uma notificação
    openModalVisualizacao(ordem);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.vencimento) {
      setError('Cliente e data de vencimento são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Ajustar formato da data para ISO
      const dadosFormatados = {
        ...formData,
        vencimento: new Date(formData.vencimento + 'T23:59:59').toISOString()
      };

      if (ordemParaEditar) {
        await apiService.updateOrdemServico(ordemParaEditar.id, dadosFormatados);
        setIsModalEdicaoOpen(false);
        setOrdemParaEditar(null);
      } else {
        await apiService.createOrdemServico(dadosFormatados);
        setIsModalCadastroOpen(false);
      }

      await fetchOrdensServico();
      
      // Reset form
      setFormData({
        protocolo: '',
        cliente_id: 0,
        usuario_id: 1,
        departamento_id: undefined,
        vencimento: '',
        observacao: '',
        status: 'aberta'
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError('Erro ao salvar ordem de serviço: ' + errorMessage);
      console.error('Erro ao salvar ordem de serviço:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!ordemParaDeletar) return;

    try {
      setLoading(true);
      await apiService.deleteOrdemServico(ordemParaDeletar.id);
      setIsModalExclusaoOpen(false);
      setOrdemParaDeletar(null);
      await fetchOrdensServico();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError('Erro ao excluir ordem de serviço: ' + errorMessage);
      console.error('Erro ao excluir ordem de serviço:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: OrdemServico['status']) => {
    const Icon = statusIcons[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusColors[status]}`}>
        <Icon className="w-3 h-3" />
        {statusOptions.find(opt => opt.value === status)?.label || status}
      </span>
    );
  };

  const columns = [
    {
      key: 'protocolo',
      header: 'Protocolo',
      render: (ordem: OrdemServico) => (
        <div className="font-medium text-gray-900">{ordem.protocolo}</div>
      )
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (ordem: OrdemServico) => (
        <div>
          <div className="font-medium text-gray-900">{ordem.cliente?.nome || 'N/A'}</div>
          <div className="text-sm text-gray-500">{ordem.cliente?.email}</div>
        </div>
      )
    },
    {
      key: 'departamento',
      header: 'Departamento',
      render: (ordem: OrdemServico) => (
        <div className="text-gray-900">{ordem.departamento?.nome || 'Não atribuído'}</div>
      )
    },
    {
      key: 'vencimento',
      header: 'Vencimento',
      render: (ordem: OrdemServico) => (
        <div className="text-gray-900">{formatDate(ordem.vencimento)}</div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (ordem: OrdemServico) => getStatusBadge(ordem.status)
    },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (ordem: OrdemServico) => (
        <div className="text-sm text-gray-500">{formatDateTime(ordem.created_at)}</div>
      )
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (ordem: OrdemServico) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openModalVisualizacao(ordem)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModalEdicao(ordem)}
            className="text-green-600 hover:text-green-800 p-1"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModalHistorico(ordem)}
            className="text-purple-600 hover:text-purple-800 p-1"
            title="Ver Histórico"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModalExclusao(ordem)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Ordens de Serviço"
          subtitle="Gerencie as ordens de serviço e acompanhe o progresso dos trabalhos"
        />
        <NotificacoesVencimento
          onNotificacaoClick={handleNotificacaoClick}
        />
      </div>

      {/* Filtros e Ações */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por protocolo, cliente..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status */}
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: '', label: 'Todos os Status' },
                  ...statusOptions
                ]}
                value={statusFilter}
                onChange={handleStatusFilter}
                placeholder="Filtrar por status"
              />
            </div>
          </div>

          {/* Botão Novo */}
          <Button
            onClick={openModalCadastro}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Ordem de Serviço
          </Button>
        </div>
      </Card>

      {/* Mensagem de Erro */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="text-red-600">{error}</div>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable
            data={ordensServico}
            columns={columns}
            loading={loading}
            emptyMessage="Nenhuma ordem de serviço encontrada"
          />
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            
            <span className="flex items-center px-4 py-2 text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </Card>

      {/* Modal de Cadastro */}
      <Modal
        isOpen={isModalCadastroOpen}
        onClose={() => setIsModalCadastroOpen(false)}
        title="Nova Ordem de Serviço"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protocolo *
              </label>
              <Input
                value={formData.protocolo}
                onChange={(e) => setFormData({ ...formData, protocolo: e.target.value })}
                required
                placeholder="Ex: OS-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <Select
                options={[
                  { value: '', label: 'Selecione um cliente' },
                  ...(clientes || []).map(cliente => ({
                    value: cliente.id.toString(),
                    label: cliente.nome
                  }))
                ]}
                value={formData.cliente_id.toString()}
                onChange={(value) => setFormData({ ...formData, cliente_id: Number(value) })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <Select
                options={[
                  { value: '', label: 'Selecione um departamento' },
                  ...(departamentos || []).map(dept => ({
                    value: dept.id.toString(),
                    label: dept.nome
                  }))
                ]}
                value={formData.departamento_id?.toString() || ''}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  departamento_id: value ? Number(value) : undefined 
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={formData.vencimento}
                onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                options={statusOptions}
                value={formData.status || 'aberta'}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  status: value as OrdemServico['status']
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <Textarea
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Descreva os detalhes do serviço..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalCadastroOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Salvando...' : 'Criar Ordem de Serviço'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Visualização */}
      <Modal
        isOpen={isModalVisualizacaoOpen}
        onClose={() => setIsModalVisualizacaoOpen(false)}
        title="Detalhes da Ordem de Serviço"
        size="lg"
      >
        {ordemParaVisualizar && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Protocolo</label>
                <p className="text-gray-900 font-medium">{ordemParaVisualizar.protocolo}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">{getStatusBadge(ordemParaVisualizar.status)}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Cliente</label>
                <p className="text-gray-900">{ordemParaVisualizar.cliente?.nome || 'N/A'}</p>
                <p className="text-sm text-gray-500">{ordemParaVisualizar.cliente?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Departamento</label>
                <p className="text-gray-900">{ordemParaVisualizar.departamento?.nome || 'Não atribuído'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Data de Vencimento</label>
                <p className="text-gray-900">{formatDate(ordemParaVisualizar.vencimento)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500">Criado em</label>
                <p className="text-gray-900">{formatDateTime(ordemParaVisualizar.created_at)}</p>
              </div>
            </div>

            {ordemParaVisualizar.observacao && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Observações</label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{ordemParaVisualizar.observacao}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => openModalEdicao(ordemParaVisualizar)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsModalVisualizacaoOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Edição */}
      <Modal
        isOpen={isModalEdicaoOpen}
        onClose={() => setIsModalEdicaoOpen(false)}
        title="Editar Ordem de Serviço"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protocolo *
              </label>
              <Input
                value={formData.protocolo}
                onChange={(e) => setFormData({ ...formData, protocolo: e.target.value })}
                required
                placeholder="Ex: OS-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <Select
                options={[
                  { value: '', label: 'Selecione um cliente' },
                  ...(clientes || []).map(cliente => ({
                    value: cliente.id.toString(),
                    label: cliente.nome
                  }))
                ]}
                value={formData.cliente_id.toString()}
                onChange={(value) => setFormData({ ...formData, cliente_id: Number(value) })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <Select
                options={[
                  { value: '', label: 'Selecione um departamento' },
                  ...(departamentos || []).map(dept => ({
                    value: dept.id.toString(),
                    label: dept.nome
                  }))
                ]}
                value={formData.departamento_id?.toString() || ''}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  departamento_id: value ? Number(value) : undefined 
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={formData.vencimento}
                onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                options={statusOptions}
                value={formData.status || 'aberta'}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  status: value as OrdemServico['status']
                })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <Textarea
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Descreva os detalhes do serviço..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalEdicaoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={isModalExclusaoOpen}
        onClose={() => setIsModalExclusaoOpen(false)}
        title="Excluir Ordem de Serviço"
        size="md"
      >
        {ordemParaDeletar && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Tem certeza que deseja excluir esta ordem de serviço?</p>
                <p className="text-sm text-red-700">
                  Protocolo: <strong>{ordemParaDeletar.protocolo}</strong>
                </p>
                <p className="text-sm text-red-700">
                  Cliente: <strong>{ordemParaDeletar.cliente?.nome}</strong>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Esta ação não pode ser desfeita. Todos os dados relacionados a esta ordem de serviço serão permanentemente removidos.
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalExclusaoOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Excluindo...' : 'Excluir Ordem de Serviço'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Histórico */}
      {ordemParaHistorico && (
        <HistoricoAlteracoes
          isOpen={isModalHistoricoOpen}
          onClose={() => setIsModalHistoricoOpen(false)}
          ordemServico={ordemParaHistorico}
        />
      )}
    </div>
  );
};
