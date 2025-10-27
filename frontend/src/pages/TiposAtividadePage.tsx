import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, Edit2, AlertTriangle } from 'lucide-react';
import { apiService } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { TipoAtividade } from '../types';
import { 
  PageLayout, 
  PageHeader, 
  SearchBar, 
  IconButton, 
  DataTable, 
  ConfirmDialog, 
  StatusBadge, 
  StateHandler,
  type Column
} from '../components/ui';

export const TiposAtividadePage: React.FC = () => {
  const { user } = useAuth();
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoParaExcluir, setTipoParaExcluir] = useState<TipoAtividade | null>(null);

  const isAdmin = Boolean(user?.gerente);

  const fetchTiposAtividade = useCallback(async () => {
    try {
      setLoading(true);
      const params = searchTerm ? { search: searchTerm, ativo: true } : { ativo: true };
      const response = await apiService.getTiposAtividade(params);
      setTiposAtividade(response.data || []);
      setError('');
    } catch (error) {
      console.error('Erro ao buscar tipos de atividade:', error);
      setError('Erro ao carregar tipos de atividade');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchTiposAtividade();
  }, [fetchTiposAtividade]);

  const handleExcluir = async () => {
    if (!tipoParaExcluir) return;

    try {
      setLoading(true);
      await apiService.deleteTipoAtividade(tipoParaExcluir.id);
      setTiposAtividade(prev => prev.filter(t => t.id !== tipoParaExcluir.id));
      setTipoParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir tipo de atividade:', error);
      setError('Erro ao excluir tipo de atividade');
    } finally {
      setLoading(false);
    }
  };

  // Definir colunas da tabela
  const columns: Column<TipoAtividade>[] = [
    {
      key: 'nome',
      label: 'Nome',
      render: (_, item) => (
        <div className="flex items-center">
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{item.nome}</div>
            <div className="text-sm text-gray-500">ID: {item.id}</div>
          </div>
        </div>
      )
    },
    {
      key: 'id',
      label: 'Código',
      render: (value) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
          #{value}
        </span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (_, item) => (
        <StatusBadge status={item.ativo ? 'ativo' : 'inativo'} />
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value && typeof value === 'string' ? new Date(value).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    }
  ];

  if (!isAdmin) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader 
        title="Tipos de Atividade" 
        subtitle="Configure os tipos de atividade contábil disponíveis"
      >
        <IconButton
          icon={Plus}
          label="Novo Tipo"
          onClick={() => console.log('Abrir modal')}
          variant="primary"
        />
      </PageHeader>

      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar tipos de atividade..."
        className="mb-6"
      />

        <StateHandler 
            loading={loading} 
            error={error} 
            onErrorDismiss={() => setError('')}
            isEmpty={tiposAtividade.length === 0}
            emptyState={
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhum tipo de atividade encontrado</p>
                </div>
            }
        >
        <DataTable
            data={tiposAtividade}
            columns={columns}
            actions={(item) => (
                <>
                <IconButton
                    icon={Eye}
                    onClick={() => console.log('Visualizar', item)}
                    variant="outline"
                    size="sm"
                    title="Visualizar"
                />
                <IconButton
                    icon={Edit2}
                    onClick={() => console.log('Editar', item)}
                    variant="outline"
                    size="sm"
                    title="Editar"
                />
                <IconButton
                    icon={Trash2}
                    onClick={() => setTipoParaExcluir(item)}
                    variant="danger"
                    size="sm"
                    title="Excluir"
                />
                </>
            )}
            />
        </StateHandler>

        <ConfirmDialog
            open={!!tipoParaExcluir}
            title="Confirmar Exclusão"
            message={`Tem certeza que deseja excluir o tipo de atividade "${tipoParaExcluir?.nome}"?`}
            onConfirm={handleExcluir}
            onCancel={() => setTipoParaExcluir(null)}
            confirmLabel="Sim, excluir"
            cancelLabel="Cancelar"
        />
        </PageLayout>
    );
};