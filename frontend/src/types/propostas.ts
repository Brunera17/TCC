/**
 * Tipos específicos para propostas
 */

import type { Cliente, TipoAtividade, RegimeTributario, FaixaFaturamento } from './index';

export interface ServicoSelecionado {
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  extras?: Record<string, any>;
}

export interface DadosPropostaCompleta {
  cliente: Cliente;
  tipoAtividade: TipoAtividade;
  regimeTributario: RegimeTributario;
  faixaFaturamento?: FaixaFaturamento;
  servicosSelecionados: ServicoSelecionado[];
  // ✅ CORREÇÃO: Adicionar campos de mensalidade
  valor_mensalidade?: number;
  mensalidade_encontrada?: boolean;
  total_servicos?: number;
  total_geral?: number;
}

export interface ResumoFinanceiro {
  subtotalPorCategoria: Map<string, number>;
  subtotalServicos: number;
  taxaAberturaEmpresa: number;
  valorMensalidade: number;
  tipoAbertura: string;
  ehMEI: boolean;
  subtotalGeral: number;
  percentualDesconto: number;
  valorDesconto: number;
  totalFinal: number;
}

export interface PropostaComDesconto {
  cliente: Cliente;
  tipoAtividade: TipoAtividade;
  regimeTributario: RegimeTributario;
  faixaFaturamento?: FaixaFaturamento;
  servicosSelecionados: ServicoSelecionado[];
  // ✅ CORREÇÃO: Adicionar campos de mensalidade
  valor_mensalidade?: number;
  mensalidade_encontrada?: boolean;
  total_servicos?: number;
  total_geral?: number;
  percentualDesconto: number;
  valorDesconto: number;
  totalFinal: number;
  requerAprovacao: boolean;
  observacoes?: string;
  propostaId?: number;
  propostaNumero?: string;
}

export interface ServicoPorCategoria {
  categoria: string;
  servicos: any[];
  total: number;
}
