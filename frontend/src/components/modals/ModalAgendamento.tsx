import { useEffect, useMemo, useState } from 'react';
import { FormField } from '../forms/FormField';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { Textarea } from '../forms/Textarea';
import { Button } from '../forms/Button';
import { ModalPadrao } from '../ui';
import type {
  Agendamento,
  AgendamentoPayload,
  AgendamentoPrioridade,
  AgendamentoStatus,
  AgendamentoTipo,
  Funcionario
} from '../../types';

const STATUS_OPTIONS: Array<{ value: AgendamentoStatus; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'adiado', label: 'Adiado' }
];

const TIPO_OPTIONS: Array<{ value: AgendamentoTipo; label: string }> = [
  { value: 'reuniao', label: 'Reunião' },
  { value: 'compromisso', label: 'Compromisso' },
  { value: 'tarefa', label: 'Tarefa' },
  { value: 'outro', label: 'Outro' }
];

const PRIORIDADE_OPTIONS: Array<{ value: AgendamentoPrioridade; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' }
];

interface ModalAgendamentoProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: AgendamentoPayload) => Promise<void> | void;
  initialData?: Agendamento | null;
  funcionarios: Funcionario[];
  submitting?: boolean;
  defaultResponsavelId?: number | null;
}

interface AgendamentoFormValues {
  titulo: string;
  descricao: string;
  observacoes: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  prioridade: AgendamentoPrioridade;
  destinatario: string;
  local: string;
  data_inicio: string;
  data_fim: string;
  funcionario_id: string;
}

type FormErrors = Partial<Record<keyof AgendamentoFormValues | 'submit', string>>;

const toLocalInputValue = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const fromLocalInputValue = (value: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().replace('Z', '+00:00');
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

const buildDefaultValues = (funcionarioPadrao?: number | null): AgendamentoFormValues => ({
  titulo: '',
  descricao: '',
  observacoes: '',
  tipo: 'reuniao',
  status: 'pendente',
  prioridade: 'normal',
  destinatario: '',
  local: '',
  data_inicio: '',
  data_fim: '',
  funcionario_id: funcionarioPadrao ? String(funcionarioPadrao) : ''
});

export const ModalAgendamento: React.FC<ModalAgendamentoProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  funcionarios,
  submitting = false,
  defaultResponsavelId = null
}) => {
  const funcionarioPadrao = useMemo(
    () => initialData?.funcionario_id ?? defaultResponsavelId ?? null,
    [initialData, defaultResponsavelId]
  );
  const [formValues, setFormValues] = useState<AgendamentoFormValues>(buildDefaultValues(funcionarioPadrao));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialData) {
      setFormValues({
        titulo: initialData.titulo || '',
        descricao: initialData.descricao || '',
        observacoes: initialData.observacoes || '',
        tipo: initialData.tipo,
        status: initialData.status,
  prioridade: normalizePrioridade(initialData.prioridade),
        destinatario: initialData.destinatario || '',
        local: initialData.local || '',
        data_inicio: toLocalInputValue(initialData.data_inicio),
        data_fim: toLocalInputValue(initialData.data_fim),
        funcionario_id: initialData.funcionario_id ? String(initialData.funcionario_id) : ''
      });
    } else {
      setFormValues(buildDefaultValues(funcionarioPadrao));
    }

    setErrors({});
    setSubmitError('');
  }, [isOpen, initialData, funcionarioPadrao]);

  const handleChange = <Key extends keyof AgendamentoFormValues>(key: Key, value: AgendamentoFormValues[Key]) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validate = (): boolean => {
    const validationErrors: FormErrors = {};

    if (!formValues.titulo.trim()) {
      validationErrors.titulo = 'Informe um título.';
    }

    if (!formValues.data_inicio) {
      validationErrors.data_inicio = 'Informe a data de início.';
    }

    if (!formValues.data_fim) {
      validationErrors.data_fim = 'Informe a data de término.';
    }

    if (formValues.data_inicio && formValues.data_fim) {
      const inicio = new Date(formValues.data_inicio);
      const fim = new Date(formValues.data_fim);
      if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fim.getTime()) && fim < inicio) {
        validationErrors.data_fim = 'A data de término deve ser posterior ao início.';
      }
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    const payload: AgendamentoPayload = {
      titulo: formValues.titulo.trim(),
      descricao: formValues.descricao.trim() || undefined,
      observacoes: formValues.observacoes.trim() || undefined,
      tipo: formValues.tipo,
      status: formValues.status,
      prioridade: formValues.prioridade,
      destinatario: formValues.destinatario.trim() || undefined,
      local: formValues.local.trim() || undefined,
      data_inicio: fromLocalInputValue(formValues.data_inicio),
      data_fim: fromLocalInputValue(formValues.data_fim),
      funcionario_id: formValues.funcionario_id ? Number(formValues.funcionario_id) : undefined
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Não foi possível salvar o agendamento.';
      setSubmitError(message);
    }
  };

  return (
    <ModalPadrao
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar agendamento' : 'Novo agendamento'}
      size="xl"
      showFooter={false}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Título" required error={errors.titulo}>
            <Input
              value={formValues.titulo}
              onChange={(event) => handleChange('titulo', event.target.value)}
              placeholder="Reunião com cliente"
              required
            />
          </FormField>

          <FormField label="Tipo" required>
            <Select
              value={formValues.tipo}
              onChange={(value) => handleChange('tipo', value as AgendamentoTipo)}
              options={TIPO_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
            />
          </FormField>

          <FormField label="Status" required>
            <Select
              value={formValues.status}
              onChange={(value) => handleChange('status', value as AgendamentoStatus)}
              options={STATUS_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
            />
          </FormField>

          <FormField label="Prioridade" required>
            <Select
              value={formValues.prioridade}
              onChange={(value) => handleChange('prioridade', value as AgendamentoPrioridade)}
              options={PRIORIDADE_OPTIONS.map(option => ({ value: option.value, label: option.label }))}
            />
          </FormField>

          <FormField label="Início" required error={errors.data_inicio}>
            <Input
              type="datetime-local"
              value={formValues.data_inicio}
              onChange={(event) => handleChange('data_inicio', event.target.value)}
              required
            />
          </FormField>

          <FormField label="Término" required error={errors.data_fim}>
            <Input
              type="datetime-local"
              value={formValues.data_fim}
              onChange={(event) => handleChange('data_fim', event.target.value)}
              required
            />
          </FormField>

          <FormField label="Destinatário">
            <Input
              value={formValues.destinatario}
              onChange={(event) => handleChange('destinatario', event.target.value)}
              placeholder="Nome do contato"
            />
          </FormField>

          <FormField label="Local">
            <Input
              value={formValues.local}
              onChange={(event) => handleChange('local', event.target.value)}
              placeholder="Sala de reuniões, endereço ou link"
            />
          </FormField>

          <FormField label="Responsável">
            <Select
              value={formValues.funcionario_id}
              onChange={(value) => handleChange('funcionario_id', value)}
              placeholder="Selecione um responsável"
              options={funcionarios.map(funcionario => ({
                value: String(funcionario.id),
                label: funcionario.nome
              }))}
            />
          </FormField>
        </div>

        <FormField label="Descrição">
          <Textarea
            value={formValues.descricao}
            onChange={(event) => handleChange('descricao', event.target.value)}
            rows={3}
            placeholder="Detalhes do compromisso"
          />
        </FormField>

        <FormField label="Observações">
          <Textarea
            value={formValues.observacoes}
            onChange={(event) => handleChange('observacoes', event.target.value)}
            rows={3}
            placeholder="Anotações internas"
          />
        </FormField>

        {submitError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {initialData ? 'Salvar alterações' : 'Criar agendamento'}
          </Button>
        </div>
      </form>
    </ModalPadrao>
  );
};
