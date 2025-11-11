// Tipos e interfaces principais do sistema

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  gerente: boolean;
  cargo_id?: number;
  empresa_id?: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LoginData {
  email: string;
  senha: string;
}

export interface LoginResponse {
  user: Usuario;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

export interface Endereco {
  id: number;
  logradouro: string;
  numero: string;
  bairro: string;
  complemento?: string;
  cidade: string;
  estado: string;
  cep: string;
  rua?: string;
  cliente_id: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EntidadeJuridica {
  id: number;
  nome: string;
  cnpj: string;
  tipo: string;
  cliente_id: number;
  ativo?: boolean;
  endereco_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Cliente {
  id: number;
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  abertura_empresa: boolean;
  ativo: boolean;
  tipo_cliente?: string | null;
  is_pessoa_juridica?: boolean;
  created_at?: string;
  updated_at?: string;
  enderecos?: Endereco[];
  entidades_juridicas?: EntidadeJuridica[];
}

export interface Empresa {
  id: number;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Departamento {
  id: number;
  nome: string;
  descricao?: string;
  empresa_id: number;
  empresa?: Empresa;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Cargo {
  id: number;
  nome: string;
  descricao?: string;
  nivel?: string;
  salario_base?: number;
  departamento_id?: number;
  departamento?: Departamento;
  empresa_id: number;
  empresa?: Empresa;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Funcionario {
  id: number;
  nome: string;
  email: string;
  cargo_id?: number;
  empresa_id?: number;
  gerente: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  cargo?: Cargo;
  empresa?: Empresa;
}

export interface TipoAtividade {
  id: number;
  nome: string;
  codigo?: string;
  descricao?: string;
  aplicavel_pf?: boolean;
  aplicavel_pj?: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RegimeTributario {
  id: number;
  nome: string;
  codigo?: string;
  descricao?: string;
  aplicavel_pf?: boolean;
  aplicavel_pj?: boolean;
  requer_definicoes_fiscais?: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FaixaFaturamento {
  id: number;
  nome: string;
  valor_inicial: number;
  valor_final?: number;
  limite_min?: number;
  limite_max?: number;
  percentual_imposto?: number;
  aliquota?: number;
  regime_tributario_id: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Servico {
  id: number;
  codigo?: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  tipo_cobranca?: string;
  valor_base?: number;
  valor_unitario?: number;
  preco_base?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ItemProposta {
  id: number;
  proposta_id: number;
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  descricao_personalizada?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  servico?: Servico;
}

export interface Proposta {
  id: number;
  numero?: string;
  cliente_id: number;
  funcionario_responsavel_id?: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total: number;
  percentual_desconto?: number;
  valor_mensalidade?: number;
  requer_aprovacao?: boolean;
  aprovada_por?: number;
  data_aprovacao?: string;
  motivo_rejeicao?: string;
  data_validade?: string;
  status: 'rascunho' | 'enviada' | 'aceita' | 'rejeitada' | 'expirada' | string;
  observacoes?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  pdf_gerado?: boolean;
  pdf_caminho?: string;
  pdf_data_geracao?: string;
  cliente?: Cliente;
  funcionario_responsavel?: Funcionario;
  tipo_atividade?: TipoAtividade;
  regime_tributario?: RegimeTributario;
  faixa_faturamento?: FaixaFaturamento;
  itens?: ItemProposta[];
}

export interface PropostaParaCriacao {
  cliente_id: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total?: number;
  valor_mensalidade?: number;
  percentual_desconto?: number;
  data_validade?: string;
  status?: string;
  observacoes?: string;
  valor_desconto?: number;
  requer_aprovacao?: boolean;
  servicos?: Array<{
    servico_id: number;
    quantidade: number;
    valor_unitario: number;
    valor_total?: number;
    descricao_personalizada?: string;
  }>;
  itens?: Array<{
    servico_id: number;
    quantidade: number;
    valor_unitario: number;
    valor_total?: number;
    descricao_personalizada?: string;
  }>;
  observacoes_internas?: string;
}

export interface PropostaResponse extends Proposta {
  itens: ItemProposta[];
}

export interface EstadoSalvamento {
  salvando: boolean;
  ultimoSalvamento?: Date;
  propostaSalva: boolean;
  erro?: string;
  tentativas?: number;
}

export type ServicosProposta = ItemProposta;

export interface ServicoCreateData {
  nome: string;
  descricao?: string;
  preco_base: number;
  ativo?: boolean;
}

export type ServicoUpdateData = Partial<ServicoCreateData>;

export interface FuncionarioCreateData {
  nome: string;
  email: string;
  senha: string;
  gerente: boolean;
  cargo_id: number;
  empresa_id: number;
  ativo?: boolean;
}

export interface FuncionarioUpdateData extends Partial<Omit<FuncionarioCreateData, 'senha'>> {
  senha?: string;
}

export type AgendamentoStatus = 'pendente' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado' | 'adiado';
export type AgendamentoPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';
export type AgendamentoTipo = 'reuniao' | 'compromisso' | 'tarefa' | 'outro';

export interface Agendamento {
  id: number;
  titulo: string;
  descricao?: string;
  observacoes?: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  prioridade: AgendamentoPrioridade;
  destinatario?: string;
  local?: string;
  data_inicio: string;
  data_fim: string;
  funcionario_id?: number | null;
  funcionario?: Funcionario | null;
  created_at?: string;
  updated_at?: string;
  empresa_id?: number;
}

export interface AgendamentoPayload {
  titulo: string;
  descricao?: string;
  observacoes?: string;
  tipo: AgendamentoTipo;
  status: AgendamentoStatus;
  prioridade: AgendamentoPrioridade;
  destinatario?: string;
  local?: string;
  data_inicio: string;
  data_fim: string;
  funcionario_id?: number | null;
  empresa_id?: number;
}

export interface ItemOrdemServico {
  id?: number;
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  valor_total: number;
  servico?: Servico;
}

export interface OrdemServico {
  id: number;
  protocolo: string;
  cliente_id: number;
  usuario_id: number;
  departamento_id?: number;
  vencimento: string;
  observacao?: string;
  status: 'aberta' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';
  data_abertura: string;
  data_fechamento?: string;
  valor_total_os: number;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  usuario?: Usuario;
  departamento?: Departamento;
  itens: ItemOrdemServico[];
  ativo: boolean;
}

export interface OrdemServicoCreateData {
  protocolo: string;
  cliente_id: number;
  usuario_id: number;
  departamento_id?: number;
  vencimento: string;
  observacao?: string;
  status: 'aberta' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';
  valor_total_os: number;
  itens: ItemOrdemServico[];
}

export interface OrdemServicoUpdateData extends Partial<Omit<OrdemServicoCreateData, 'itens' | 'protocolo' | 'usuario_id'>> {
  itens?: ItemOrdemServico[];
}

export type NotificacaoVencimentoTipo = 'vencendo' | 'vencida' | 'critica';

export interface NotificacaoVencimento {
  id: number;
  ordem_servico: OrdemServico;
  tipo: NotificacaoVencimentoTipo;
  dias_restantes: number;
  lida: boolean;
  created_at: string;
  mensagem?: string;
}

export interface NotificacoesVencimentoFiltro {
  dias?: number;
  status?: string[] | string | null;
  incluir_atrasadas?: boolean;
}

export interface ListarNotificacoesVencimentoResponse {
  data: NotificacaoVencimento[];
  total: number;
  filtros: {
    dias: number;
    status: string[] | null;
    incluir_atrasadas: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages?: number;
  current_page?: number;
  per_page?: number;
  data?: T[];
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

export interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  proposta_id?: number;
  para_funcionario_id: number;
  de_funcionario_id?: number;
  lida: boolean;
  data_leitura?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  proposta?: Proposta;
  para_funcionario?: Funcionario;
  de_funcionario?: Funcionario;
}

export interface RegimeTributarioPage {
  id: number;
  nome: string;
  codigo: string;
  descricao?: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}