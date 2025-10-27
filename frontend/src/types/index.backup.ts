export interface User {
  id: number;
  nome: string;
  email: string;
  cargo_id: number;
  empresa_id: number;
  gerente: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Funcionario {
  id: number;
  nome: string;
  email: string;
  gerente: boolean;
  cargo_id: number;
  empresa_id: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  cargo?: {
    nome: string;
    codigo: string;
    nivel?: string;
  };
  empresa?: {
    nome: string;
    cnpj: string;
  };
}

export interface Cliente {
  id: number;
  nome: string;
  cpf?: string;
  email: string;
  telefone?: string;
  abertura_empresa: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // ✅ NOVO: Campos de detecção do backend
  tipo_cliente?: string;
  is_pessoa_juridica?: boolean;
  enderecos?: Array<{
    id: number;
    rua: string;
    numero: string;
    cidade: string;
    estado: string;
    cep: string;
    cliente_id: number;
    ativo: boolean;
    created_at: string;
    updated_at: string;
  }>;
  entidades_juridicas?: Array<{
    id: number;
    nome: string;
    cnpj: string;
    tipo: string;
    cliente_id: number;
    endereco_id?: number;
    ativo: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

export interface TipoAtividade {
  id: number;
  nome: string;
  codigo: string;
  descricao: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
}

export interface RegimeTributario {
  id: number;
  nome: string;
  codigo: string;
  descricao: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  requer_definicoes_fiscais: boolean;
  ativo: boolean;
}

export interface Cargo {
  id: number;
  nome: string;
  descricao: string;
  nivel: string;
  departamento_id?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FaixaFaturamento {
  id: number;
  nome: string;
  valor_inicial: number;
  valor_final?: number;
  aliquota: number;
  regime_tributario_id: number;
}

export interface Servico {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  tipo_cobranca: string;
  valor_base: number;
  descricao?: string;
  tipo_atividade_id?: number;
  ativo: boolean;
  regimes_tributarios?: Array<{
    id: number;
    codigo: string;
    nome: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface Proposta {
  id: number;
  numero: string;
  cliente_id: number;
  funcionario_responsavel_id?: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total: number;
  percentual_desconto: number;
  requer_aprovacao: boolean;
  aprovada_por?: number;
  data_aprovacao?: string;
  motivo_rejeicao?: string;
  data_validade?: string;
  status: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: number;
    nome: string;
    cpf: string;
    email: string;
  };
  funcionario_responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
  tipo_atividade?: TipoAtividade;
  regime_tributario?: RegimeTributario;
  faixa_faturamento?: FaixaFaturamento;
  itens?: ItemProposta[];
  // Campos de PDF
  pdf_gerado?: boolean;
  pdf_caminho?: string;
  pdf_data_geracao?: string;
}

// ⚠️ NOVO: Interface para criação de proposta
export interface PropostaParaCriacao {
  cliente_id: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total: number;
  valor_mensalidade?: number;  // Valor da mensalidade automática
  percentual_desconto?: number;
  data_validade?: string;
  status?: 'RASCUNHO' | 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'ENVIADA';
  observacoes?: string;
  // ⚠️ NOVO: Itens da proposta separados
  itens: {
    servico_id: number;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    descricao_personalizada?: string;
  }[];
  // ⚠️ NOVO: Dados de desconto nas observações ou campo customizado
  valor_desconto?: number;
  requer_aprovacao?: boolean;
}

// ⚠️ NOVO: Interface para resposta da API
export interface PropostaResponse {
  id: number;
  numero: string;
  cliente_id: number;
  funcionario_responsavel_id: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total: number;
  valor_mensalidade?: number;  // Valor da mensalidade automática
  data_validade?: string;
  status: string;
  observacoes?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  itens: ItemProposta[];
  cliente?: {
    id: number;
    nome: string;
    cpf: string;
    email: string;
  };
  funcionario_responsavel?: {
    id: number;
    nome: string;
    email: string;
  };
}

// ⚠️ NOVO: Interface para item de proposta
export interface ItemProposta {
  id: number;
  proposta_id: number;
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  descricao_personalizada?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ⚠️ NOVO: Interface para estado de salvamento
export interface EstadoSalvamento {
  salvando: boolean;
  ultimoSalvamento?: Date;
  propostaSalva: boolean;
  erro?: string;
  tentativas?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
  current_page: number;
  per_page: number;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
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

// Interface para a página de Regimes Tributários
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

// ✅ NOVO: Funções de validação de dados
export class DataValidator {
  /**
   * Valida se um cliente tem todos os dados necessários
   */
  static validateCliente(cliente: Cliente): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!cliente) {
      errors.push('Cliente é obrigatório');
      return { isValid: false, errors };
    }

    if (!cliente.id || cliente.id <= 0) {
      errors.push('ID do cliente é inválido');
    }

    if (!cliente.nome || cliente.nome.trim().length === 0) {
      errors.push('Nome do cliente é obrigatório');
    }

    // CPF é opcional agora
    // Email é opcional agora

    // Validar entidades jurídicas se existirem
    if (cliente.entidades_juridicas && cliente.entidades_juridicas.length > 0) {
      cliente.entidades_juridicas.forEach((entidade, index) => {
        if (!entidade.nome || entidade.nome.trim().length === 0) {
          errors.push(`Nome da entidade jurídica ${index + 1} é obrigatório`);
        }
        if (!entidade.tipo || entidade.tipo.trim().length === 0) {
          errors.push(`Tipo da entidade jurídica ${index + 1} é obrigatório`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valida se uma proposta tem todos os dados necessários para ser criada
   */
  static validateProposta(proposta: PropostaParaCriacao): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!proposta) {
      errors.push('Dados da proposta são obrigatórios');
      return { isValid: false, errors };
    }

    if (!proposta.cliente_id || proposta.cliente_id <= 0) {
      errors.push('Cliente é obrigatório');
    }

    if (!proposta.tipo_atividade_id || proposta.tipo_atividade_id <= 0) {
      errors.push('Tipo de atividade é obrigatório');
    }

    if (!proposta.regime_tributario_id || proposta.regime_tributario_id <= 0) {
      errors.push('Regime tributário é obrigatório');
    }

    if (!proposta.valor_total || proposta.valor_total <= 0) {
      errors.push('Valor total deve ser maior que zero');
    }

    if (!proposta.itens || proposta.itens.length === 0) {
      errors.push('Pelo menos um serviço deve ser selecionado');
    } else {
      proposta.itens.forEach((item, index) => {
        if (!item.servico_id || item.servico_id <= 0) {
          errors.push(`Serviço ${index + 1} é obrigatório`);
        }
        if (!item.quantidade || item.quantidade <= 0) {
          errors.push(`Quantidade do serviço ${index + 1} deve ser maior que zero`);
        }
        if (!item.valor_unitario || item.valor_unitario <= 0) {
          errors.push(`Valor unitário do serviço ${index + 1} deve ser maior que zero`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valida se os dados de salvamento automático estão completos
   */
  static validateDadosSalvamento(dados: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dados) {
      errors.push('Dados de salvamento são obrigatórios');
      return { isValid: false, errors };
    }

    if (!dados.passo || dados.passo <= 0) {
      errors.push('Passo é obrigatório');
    }

    if (!dados.clienteId || dados.clienteId <= 0) {
      errors.push('ID do cliente é obrigatório');
    }

    if (!dados.timestamp) {
      errors.push('Timestamp é obrigatório');
    }

    if (!dados.dadosCompletos || !dados.dadosCompletos.cliente) {
      errors.push('Dados completos do cliente são obrigatórios');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Sanitiza dados de cliente para garantir consistência
   */
  static sanitizeCliente(cliente: any): Cliente {
    return {
      ...cliente,
      entidades_juridicas: cliente.entidades_juridicas || [],
      enderecos: cliente.enderecos || [],
      nome: cliente.nome?.trim() || '',
      cpf: cliente.cpf?.trim() || '',
      email: cliente.email?.trim() || ''
    };
  }
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
  departamento?: {
    id: number;
    nome: string;
  };
}

export interface OrdemServicoCreateData {
  protocolo: string;
  cliente_id: number;
  usuario_id: number;
  departamento_id?: number;
  vencimento: string;
  observacao?: string;
  status?: 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada';
}

export interface OrdemServicoUpdateData {
  protocolo?: string;
  cliente_id?: number;
  usuario_id?: number;
  departamento_id?: number;
  vencimento?: string;
  observacao?: string;
  status?: 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada';
}

export interface Departamento {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// Interfaces para criação e atualização
export interface ServicoCreateData {
  codigo: string;
  nome: string;
  categoria: string;
  tipo_cobranca: string;
  valor_base: number;
  descricao?: string;
  definicoes_fiscais?: unknown;
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