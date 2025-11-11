import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Clock,
  Edit2,
  Eye,
  MapPin,
  Plus,
  RefreshCcw,
  Tag,
  Trash2,
  User
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { apiService, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, ConfirmDialog, IconButton, ModalPadrao, PageHeader, StateHandler } from '../components/ui';
import { Button } from '../components/forms/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { ModalAgendamento } from '../components/modals/ModalAgendamento';
import type {
  Agendamento,
  AgendamentoPayload,
  AgendamentoPrioridade,
  AgendamentoStatus,
  AgendamentoTipo,
  Funcionario
} from '../types';

type AgendamentoStatusFiltro = AgendamentoStatus | 'todos';
type AgendamentoTipoFiltro = AgendamentoTipo | 'todos';
type AgendamentoPrioridadeFiltro = AgendamentoPrioridade | 'todos';

interface AgendaFilters {
  search: string;
  status: AgendamentoStatusFiltro;
  tipo: AgendamentoTipoFiltro;
  prioridade: AgendamentoPrioridadeFiltro;
  dataInicio: string;
  dataFim: string;
  somenteMeus: boolean;
}

const STATUS_LABELS: Record<AgendamentoStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  adiado: 'Adiado'
};

const STATUS_STYLES: Record<AgendamentoStatus, string> = {
  pendente: 'border-amber-200 bg-amber-50 text-amber-700',
  confirmado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  em_andamento: 'border-sky-200 bg-sky-50 text-sky-700',
  concluido: 'border-gray-200 bg-gray-50 text-gray-700',
  cancelado: 'border-red-200 bg-red-50 text-red-700',
  adiado: 'border-violet-200 bg-violet-50 text-violet-700'
};

const PRIORIDADE_LABELS: Record<AgendamentoPrioridade, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

const PRIORIDADE_STYLES: Record<AgendamentoPrioridade, string> = {
  baixa: 'border-slate-200 bg-slate-50 text-slate-700',
  normal: 'border-amber-200 bg-amber-50 text-amber-700',
  alta: 'border-rose-200 bg-rose-50 text-rose-700',
  urgente: 'border-red-300 bg-red-50 text-red-700'
};

const TIPO_LABELS: Record<AgendamentoTipo, string> = {
  reuniao: 'Reunião',
  compromisso: 'Compromisso',
  tarefa: 'Tarefa',
  outro: 'Outro'
};

const STATUS_FILTER_OPTIONS: Array<{ value: AgendamentoStatusFiltro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: STATUS_LABELS.pendente },
  { value: 'confirmado', label: STATUS_LABELS.confirmado },
  { value: 'em_andamento', label: STATUS_LABELS.em_andamento },
  { value: 'concluido', label: STATUS_LABELS.concluido },
  { value: 'cancelado', label: STATUS_LABELS.cancelado },
  { value: 'adiado', label: STATUS_LABELS.adiado }
];

const TIPO_FILTER_OPTIONS: Array<{ value: AgendamentoTipoFiltro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'reuniao', label: TIPO_LABELS.reuniao },
  { value: 'compromisso', label: TIPO_LABELS.compromisso },
  { value: 'tarefa', label: TIPO_LABELS.tarefa },
  { value: 'outro', label: TIPO_LABELS.outro }
];

const PRIORIDADE_FILTER_OPTIONS: Array<{ value: AgendamentoPrioridadeFiltro; label: string }> = [
  { value: 'todos', label: 'Todas' },
  { value: 'baixa', label: PRIORIDADE_LABELS.baixa },
  { value: 'normal', label: PRIORIDADE_LABELS.normal },
  { value: 'alta', label: PRIORIDADE_LABELS.alta },
  { value: 'urgente', label: PRIORIDADE_LABELS.urgente }
];

const extractArray = <T,>(source: unknown): T[] => {
  if (Array.isArray(source)) {
    return source;
  }

  if (source && typeof source === 'object') {
    const candidate = source as {
      data?: T[];
      items?: T[];
      results?: T[];
    };

    if (Array.isArray(candidate.data)) return candidate.data;
    if (Array.isArray(candidate.items)) return candidate.items;
    if (Array.isArray(candidate.results)) return candidate.results;
  }

  return [];
};

const normalizePrioridade = (value: string | null | undefined): AgendamentoPrioridade => {
  switch (value) {
    case 'baixa':
    case 'normal':
    case 'alta':
    case 'urgente':
      return value;
    case 'media':
      return 'normal';
    default:
      return 'normal';
  }
};

type TimingStyleKey = Extract<AgendamentoStatus, 'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'adiado'>;

const getTimingStatus = (agendamento: Agendamento): { label: string; styleKey: TimingStyleKey } => {
  const baseStatus = agendamento.status;

  if (baseStatus === 'cancelado' || baseStatus === 'adiado') {
    return { label: STATUS_LABELS[baseStatus], styleKey: baseStatus };
  }

  const inicio = new Date(agendamento.data_inicio);
  const fim = new Date(agendamento.data_fim);
  const agora = new Date();

  const inicioValido = !Number.isNaN(inicio.getTime());
  const fimValido = !Number.isNaN(fim.getTime());

  if (!inicioValido || !fimValido) {
    const fallbackKey: TimingStyleKey =
      baseStatus === 'confirmado'
        ? 'confirmado'
        : baseStatus === 'concluido'
          ? 'concluido'
          : 'pendente';
    return { label: STATUS_LABELS[baseStatus] ?? STATUS_LABELS.pendente, styleKey: fallbackKey };
  }

  if (agora < inicio) {
    const distancia = formatDistanceToNow(inicio, { locale: ptBR, addSuffix: false });
    const styleKey: TimingStyleKey = baseStatus === 'confirmado' ? 'confirmado' : 'pendente';
    const prefixo = baseStatus === 'confirmado' ? 'Começa em' : 'Falta';
    return { label: `${prefixo} ${distancia}`, styleKey };
  }

  if (agora >= inicio && agora <= fim) {
    const restante = formatDistanceToNow(fim, { locale: ptBR, addSuffix: false });
    return { label: `Em andamento · termina em ${restante}`, styleKey: 'em_andamento' };
  }

  const transcorrido = formatDistanceToNow(fim, { locale: ptBR, addSuffix: false });
  return { label: `Encerrado há ${transcorrido}`, styleKey: 'concluido' };
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, 'dd/MM/yyyy HH:mm');
};

export const AgendaPage: React.FC = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filters, setFilters] = useState<AgendaFilters>({
    search: '',
    status: 'todos',
    tipo: 'todos',
    prioridade: 'todos',
    dataInicio: '',
    dataFim: '',
    somenteMeus: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<Agendamento | null>(null);
  const [agendamentoParaDetalhes, setAgendamentoParaDetalhes] = useState<Agendamento | null>(null);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<Agendamento | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const funcionarioMap = useMemo(() => {
    const map = new Map<number, string>();
    funcionarios.forEach((funcionarioAtual) => {
      map.set(funcionarioAtual.id, funcionarioAtual.nome);
    });
    return map;
  }, [funcionarios]);

  const responsavelPadrao = useMemo(() => {
    if (user?.id && funcionarioMap.has(user.id)) {
      return user.id;
    }
    return null;
  }, [user?.id, funcionarioMap]);

  const carregarAgendamentos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resposta = await apiService.getAgendamentos({ per_page: 500 });
      const itens = extractArray<Agendamento>(resposta);
      const itensNormalizados = itens.map(item => ({
        ...item,
        prioridade: normalizePrioridade(item.prioridade)
      }));
      setAgendamentos(itensNormalizados);
    } catch (err) {
      const mensagem = err instanceof ApiError
        ? (typeof err.details === 'string' ? err.details : err.message)
        : err instanceof Error
          ? err.message
          : 'Não foi possível carregar os agendamentos.';
      setError(mensagem);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarFuncionarios = useCallback(async () => {
    try {
      const resposta = await apiService.getFuncionarios({ ativo: true, per_page: 1000 });
      const itens = extractArray<Funcionario>(resposta);
      setFuncionarios(itens);
    } catch (err) {
      console.warn('Falha ao carregar funcionários para agenda:', err);
    }
  }, []);

  useEffect(() => {
    carregarAgendamentos();
    carregarFuncionarios();
  }, [carregarAgendamentos, carregarFuncionarios]);

  const handleRefresh = () => {
    carregarAgendamentos();
  };

  const filteredAgendamentos = useMemo(() => {
    const busca = filters.search.trim().toLowerCase();
    return agendamentos.filter((item) => {
      if (filters.status !== 'todos' && item.status !== filters.status) {
        return false;
      }

      if (filters.tipo !== 'todos' && item.tipo !== filters.tipo) {
        return false;
      }

      if (filters.prioridade !== 'todos' && item.prioridade !== filters.prioridade) {
        return false;
      }

      if (filters.dataInicio) {
        const filtroInicio = new Date(filters.dataInicio);
        const dataItem = new Date(item.data_inicio);
        if (!Number.isNaN(filtroInicio.getTime()) && dataItem < filtroInicio) {
          return false;
        }
      }

      if (filters.dataFim) {
        const filtroFim = new Date(`${filters.dataFim}T23:59:59`);
        const dataItemFim = new Date(item.data_fim);
        if (!Number.isNaN(filtroFim.getTime()) && dataItemFim > filtroFim) {
          return false;
        }
      }

      if (filters.somenteMeus && user?.id) {
        if (item.funcionario_id !== user.id) {
          return false;
        }
      }

      if (busca) {
        const alvo = [
          item.titulo,
          item.descricao,
          item.destinatario,
          item.local
        ].join(' ').toLowerCase();
        if (!alvo.includes(busca)) {
          return false;
        }
      }

      return true;
    });
  }, [agendamentos, filters, user?.id]);

  const agendamentosOrdenados = useMemo(() => (
    [...filteredAgendamentos]
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
  ), [filteredAgendamentos]);

  const abrirModalCriacao = () => {
    setAgendamentoParaEditar(null);
    setIsModalOpen(true);
  };

  const abrirModalEdicao = (agendamento: Agendamento) => {
    setAgendamentoParaEditar(agendamento);
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setAgendamentoParaEditar(null);
  };

  const handleSalvarAgendamento = async (payload: AgendamentoPayload) => {
    setModalSubmitting(true);
    try {
      if (agendamentoParaEditar) {
        await apiService.updateAgendamento(agendamentoParaEditar.id, payload);
        showSuccess('Agendamento atualizado', 'As informações foram salvas com sucesso.');
      } else {
        await apiService.createAgendamento(payload);
        showSuccess('Agendamento criado', 'O compromisso foi adicionado à agenda.');
      }

      await carregarAgendamentos();
      fecharModal();
    } catch (err) {
      const mensagemBruta = err instanceof ApiError
        ? (typeof err.details === 'string' ? err.details : err.details?.message || err.message)
        : err instanceof Error
          ? err.message
          : 'Não foi possível salvar o agendamento.';
      showError('Falha ao salvar agendamento', mensagemBruta);
      throw err instanceof Error ? err : new Error(mensagemBruta);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!agendamentoParaExcluir || excluindoId) {
      return;
    }

    setExcluindoId(agendamentoParaExcluir.id);
    try {
      await apiService.deleteAgendamento(agendamentoParaExcluir.id);
      showSuccess('Agendamento removido', 'O compromisso foi excluído da agenda.');
      await carregarAgendamentos();
      setAgendamentoParaExcluir(null);
    } catch (err) {
      const mensagem = err instanceof ApiError
        ? (typeof err.details === 'string' ? err.details : err.message)
        : err instanceof Error
          ? err.message
          : 'Não foi possível excluir o agendamento.';
      showError('Falha ao excluir', mensagem);
    } finally {
      setExcluindoId(null);
    }
  };

  const renderStatusBadge = (agendamentoAtual: Agendamento) => {
    const { label, styleKey } = getTimingStatus(agendamentoAtual);
    const style = STATUS_STYLES[styleKey] ?? 'border-gray-200 bg-gray-50 text-gray-700';
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${style}`}>
        {label}
      </span>
    );
  };

  const renderPrioridadeBadge = (prioridade: AgendamentoPrioridade) => (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${PRIORIDADE_STYLES[prioridade]}`}>
      {PRIORIDADE_LABELS[prioridade]}
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        subtitle="Gerencie compromissos, reuniões e lembretes em um só lugar"
      >
        <Button
          variant="ghost"
          className="border border-gray-300 text-gray-700 hover:bg-gray-50"
          size="sm"
          leftIcon={<RefreshCcw className="h-4 w-4" />}
          onClick={handleRefresh}
        >
          Atualizar
        </Button>
        <IconButton icon={Plus} onClick={abrirModalCriacao} label="Novo Agendamento" />
      </PageHeader>

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Buscar</label>
            <Input
              placeholder="Título, destinatário ou local"
              value={filters.search}
              onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <Select
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value as AgendamentoStatusFiltro }))}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
            <Select
              value={filters.tipo}
              onChange={(value) => setFilters(prev => ({ ...prev, tipo: value as AgendamentoTipoFiltro }))}
              options={TIPO_FILTER_OPTIONS}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Prioridade</label>
            <Select
              value={filters.prioridade}
              onChange={(value) => setFilters(prev => ({ ...prev, prioridade: value as AgendamentoPrioridadeFiltro }))}
              options={PRIORIDADE_FILTER_OPTIONS}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">A partir de</label>
            <Input
              type="date"
              value={filters.dataInicio}
              onChange={(event) => setFilters(prev => ({ ...prev, dataInicio: event.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Até</label>
            <Input
              type="date"
              value={filters.dataFim}
              onChange={(event) => setFilters(prev => ({ ...prev, dataFim: event.target.value }))}
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <input
              id="somenteMeus"
              type="checkbox"
              checked={filters.somenteMeus}
              onChange={(event) => setFilters(prev => ({ ...prev, somenteMeus: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="somenteMeus" className="text-sm text-gray-700">
              Mostrar apenas meus compromissos
            </label>
          </div>
        </div>
      </Card>

      <StateHandler
        loading={loading}
        error={error}
        onErrorDismiss={() => setError('')}
        isEmpty={!loading && agendamentosOrdenados.length === 0}
        emptyState={(
          <Card className="flex flex-col items-center justify-center space-y-3 p-10 text-center">
            <Calendar className="h-12 w-12 text-gray-300" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Nenhum agendamento cadastrado</h3>
              <p className="text-sm text-gray-500">
                Utilize o botão "Novo agendamento" para registrar seu primeiro compromisso.
              </p>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={abrirModalCriacao}>
              Criar agendamento
            </Button>
          </Card>
        )}
      >
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Quando</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Responsável</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {agendamentosOrdenados.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      <div className="font-semibold text-gray-900">{item.titulo}</div>
                      {item.destinatario && (
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <User className="mr-1 h-3 w-3" />
                          {item.destinatario}
                        </div>
                      )}
                      {item.local && (
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <MapPin className="mr-1 h-3 w-3" />
                          {item.local}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center text-xs font-medium text-gray-700">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDateTime(item.data_inicio)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-700">{formatDateTime(item.data_fim)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                        <Tag className="mr-1 h-3 w-3" />
                        {TIPO_LABELS[item.tipo]}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      {renderPrioridadeBadge(item.prioridade)}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      {item.funcionario?.nome
                        || (item.funcionario_id ? funcionarioMap.get(item.funcionario_id) : null)
                        || '—'}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-900">
                      {renderStatusBadge(item)}
                    </td>
                    <td className="px-6 py-4 align-top text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <IconButton
                          icon={Eye}
                          variant="outline"
                          size="sm"
                          title="Ver detalhes"
                          onClick={() => setAgendamentoParaDetalhes(item)}
                        />
                        <IconButton
                          icon={Edit2}
                          variant="outline"
                          size="sm"
                          title="Editar"
                          onClick={() => abrirModalEdicao(item)}
                        />
                        <IconButton
                          icon={Trash2}
                          variant="danger"
                          size="sm"
                          title="Excluir"
                          onClick={() => setAgendamentoParaExcluir(item)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </StateHandler>

      <ModalAgendamento
        isOpen={isModalOpen}
        onClose={fecharModal}
        onSubmit={handleSalvarAgendamento}
        initialData={agendamentoParaEditar ?? undefined}
        funcionarios={funcionarios}
        submitting={modalSubmitting}
        defaultResponsavelId={responsavelPadrao}
      />

      <ModalPadrao
        isOpen={Boolean(agendamentoParaDetalhes)}
        onClose={() => setAgendamentoParaDetalhes(null)}
        title="Detalhes do agendamento"
        size="lg"
        showFooter={false}
      >
        {agendamentoParaDetalhes && (
          <div className="space-y-6 text-sm text-gray-700">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{agendamentoParaDetalhes.titulo}</h3>
              {agendamentoParaDetalhes.descricao && (
                <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
                  {agendamentoParaDetalhes.descricao}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Início</p>
                  <p className="font-medium text-gray-900">{formatDateTime(agendamentoParaDetalhes.data_inicio)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Término</p>
                  <p className="font-medium text-gray-900">{formatDateTime(agendamentoParaDetalhes.data_fim)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <Tag className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500">Tipo</p>
                  <p className="font-medium text-gray-900">{TIPO_LABELS[agendamentoParaDetalhes.tipo]}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <User className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs text-gray-500">Responsável</p>
                  <p className="font-medium text-gray-900">
                    {agendamentoParaDetalhes.funcionario?.nome
                      || (agendamentoParaDetalhes.funcionario_id
                        ? funcionarioMap.get(agendamentoParaDetalhes.funcionario_id)
                        : '—')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {renderStatusBadge(agendamentoParaDetalhes)}
              {renderPrioridadeBadge(agendamentoParaDetalhes.prioridade)}
            </div>

            {agendamentoParaDetalhes.destinatario && (
              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 p-3">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Destinatário</p>
                  <p className="font-medium text-gray-900">{agendamentoParaDetalhes.destinatario}</p>
                </div>
              </div>
            )}

            {agendamentoParaDetalhes.local && (
              <div className="flex items-center space-x-2 rounded-lg border border-gray-200 p-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Local</p>
                  <p className="font-medium text-gray-900">{agendamentoParaDetalhes.local}</p>
                </div>
              </div>
            )}

            {agendamentoParaDetalhes.observacoes && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Observações</h4>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                  {agendamentoParaDetalhes.observacoes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setAgendamentoParaDetalhes(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </ModalPadrao>

      <ConfirmDialog
        open={Boolean(agendamentoParaExcluir)}
        title="Excluir agendamento"
        message="Esta ação não pode ser desfeita. Deseja realmente excluir este compromisso?"
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setAgendamentoParaExcluir(null)}
        confirmLabel={excluindoId ? 'Excluindo...' : 'Excluir'}
        cancelLabel="Cancelar"
      />
    </div>
  );
};

export default AgendaPage;
