// Tipos e interfaces principais do sistema

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  gerente: boolean;
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
  token_type: string;
}

export interface Cliente {
  id: number;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  enderecos?: Endereco[];
  entidades_juridicas?: EntidadeJuridica[];
}

export interface Endereco {
  id: number;
  rua: string;
  numero: string;
  complemento?: string;
  cidade: string;
  estado: string;
  cep: string;
  cliente_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface EntidadeJuridica {
  id: number;
  nome: string;
  cnpj: string;
  tipo: string;
  cliente_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface TipoAtividade {
  id: number;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RegimeTributario {
  id: number;
  nome: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Servico {
  id: number;
  nome: string;
  descricao?: string;
  preco_base: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Proposta {
  id: number;
  cliente_id: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total: number;
  percentual_desconto?: number;
  observacoes?: string;
  status: 'rascunho' | 'enviada' | 'aceita' | 'rejeitada' | 'expirada';
  created_at: string;
  updated_at: string;

  // Relacionamentos
  cliente?: Cliente;
  tipo_atividade?: TipoAtividade;
  regime_tributario?: RegimeTributario;
  servicos?: ServicosProposta[];
}

export interface ServicosProposta {
  id: number;
  proposta_id: number;
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  created_at?: string;
  updated_at?: string;

  // Relacionamentos
  servico?: Servico;
}

export interface PropostaParaCriacao {
  cliente_id: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  servicos: Array<{
    servico_id: number;
    quantidade: number;
    valor_unitario: number;
  }>;
  observacoes?: string;
}

export interface FaixaFaturamento {
  id: number;
  nome: string;
  limite_min: number;
  limite_max?: number;
  percentual_imposto?: number;
  regime_tributario_id: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Funcionario {
  id: number;
  nome: string;
  email: string;
  cargo?: Cargo;
  cargo_id?: number;
  empresa?: Empresa;
  empresa_id?: number;
  gerente: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
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
  salario_base?: number;
  departamento_id?: number;
  departamento?: Departamento;
  empresa_id: number;
  empresa?: Empresa;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Interfaces para Ordem de Serviço
export interface OrdemServico {
  id: number;
  protocolo: string;
  cliente_id: number;
  usuario_id: number;
  departamento_id?: number;
  vencimento: string;
  observacao?: string;
  status: 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada';
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  usuario?: {
    id: number;
    nome: string;
    email: string;
  };
  departamento?: Departamento;
}

export interface OrdemServicoCreateData {
  cliente_id: number;
  departamento_id?: number;
  vencimento: string;
  observacao?: string;
}

export interface OrdemServicoUpdateData extends Partial<OrdemServicoCreateData> {
  status?: 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada';
}

// Interfaces para criação e atualização
export interface ServicoCreateData {
  nome: string;
  descricao?: string;
  preco_base: number;
  ativo?: boolean;
}

export interface ServicoUpdateData extends Partial<ServicoCreateData> {}

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