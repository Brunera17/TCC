import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../lib/api';
import type { PropostaParaCriacao, PropostaResponse, EstadoSalvamento } from '../types';

// ⚠️ FUNÇÃO: Identificar se é MEI
const isMEI = (regimeTributario: any): boolean => {
  if (!regimeTributario) return false;

  // Verificar por código do regime
  if (regimeTributario?.codigo?.toLowerCase().includes('mei')) {
    return true;
  }

  // Verificar por nome do regime
  if (regimeTributario?.nome?.toLowerCase().includes('microempreendedor') ||
    regimeTributario?.nome?.toLowerCase().includes('mei')) {
    return true;
  }

  return false;
};

// ⚠️ FUNÇÃO PARA CALCULAR TAXA DE ABERTURA
const calcularTaxaAbertura = (cliente: any, regimeTributario: any): number => {
  if (!cliente?.abertura_empresa) {
    return 0;
  }

  return isMEI(regimeTributario) ? 300.00 : 1000.00;
};

// ⚠️ FUNÇÃO PARA OBTER TIPO DE ABERTURA
const getTipoAbertura = (cliente: any, regimeTributario: any): string => {
  if (!cliente?.abertura_empresa) {
    return '';
  }

  return isMEI(regimeTributario) ? 'MEI' : 'Empresa';
};

// ⚠️ FUNÇÃO: Verificar se precisa criar serviço de taxa de abertura
const garantirServicoTaxaAbertura = async (tipo: 'MEI' | 'EMPRESA'): Promise<number> => {
  try {
    // Buscar se já existe serviço de taxa de abertura
    const servicosResponse = await apiService.getServicos({ ativo: true, per_page: 1000 });
    const servicos = servicosResponse?.items || [];
    const servicoExistente = servicos.find((s: any) =>
      s.codigo === `TAXA_ABERTURA_${tipo}` ||
      s.nome.toLowerCase().includes(`taxa abertura ${tipo.toLowerCase()}`)
    );

    if (servicoExistente) {
      return servicoExistente.id;
    }

    // Se não existe, usar IDs padrão
    return tipo === 'MEI' ? 998 : 999;

  } catch (error) {
    console.warn('Não foi possível buscar serviço de taxa de abertura, usando ID padrão');
    return tipo === 'MEI' ? 998 : 999;
  }
};

// ⚠️ FUNÇÃO: Preparar dados para API
const prepararDadosParaAPI = async (dados: any): Promise<PropostaParaCriacao> => {
  // ⚠️ NOVO: Validar dados obrigatórios
  if (!dados.cliente?.id || !dados.tipoAtividade?.id || !dados.regimeTributario?.id) {
    console.error('Dados obrigatórios incompletos:', {
      clienteId: dados.cliente?.id,
      tipoAtividadeId: dados.tipoAtividade?.id,
      regimeTributarioId: dados.regimeTributario?.id
    });
    throw new Error('Dados obrigatórios incompletos para salvar proposta');
  }

  // Calcular valores totais
  const subtotalServicos = dados.servicosSelecionados.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  const taxaAbertura = calcularTaxaAbertura(dados.cliente, dados.regimeTributario);
  const valorSemDesconto = subtotalServicos + taxaAbertura;
  const valorDesconto = (valorSemDesconto * (dados.percentualDesconto || 0)) / 100;
  const valorTotal = valorSemDesconto - valorDesconto;

  // ⚠️ NOVO: Converter serviços selecionados para itens da proposta
  const itens: any[] = [];

  // Adicionar serviços regulares
  dados.servicosSelecionados.forEach((servico: any) => {
    itens.push({
      servico_id: servico.servico_id,
      quantidade: servico.quantidade,
      valor_unitario: servico.valor_unitario,
      valor_total: servico.subtotal,
      descricao_personalizada: servico.extras?.nomeOrgao
        ? `Órgão de Classe: ${servico.extras.nomeOrgao}`
        : undefined
    });
  });

  // ⚠️ NOVO: Adicionar taxa de abertura com serviço real
  if (taxaAbertura > 0) {
    const ehMEI = isMEI(dados.regimeTributario);
    const servicoTaxaId = await garantirServicoTaxaAbertura(ehMEI ? 'MEI' : 'EMPRESA');

    itens.push({
      servico_id: servicoTaxaId,
      quantidade: 1,
      valor_unitario: taxaAbertura,
      valor_total: taxaAbertura,
      descricao_personalizada: `Regime: ${dados.regimeTributario.nome}`
    });
  }

  // ⚠️ NOVO: Montar observações com informações de desconto
  let observacoesCompletas = dados.observacoes || '';

  if (dados.percentualDesconto && dados.percentualDesconto > 0) {
    const infoDesconto = [
      '--- INFORMAÇÕES DE DESCONTO ---',
      `Percentual de desconto: ${dados.percentualDesconto}%`,
      `Valor do desconto: R$ ${valorDesconto.toFixed(2)}`,
      `Valor original: R$ ${valorSemDesconto.toFixed(2)}`,
      `Valor final: R$ ${valorTotal.toFixed(2)}`,
      `Requer aprovação: ${dados.requerAprovacao ? 'Sim' : 'Não'}`,
      '--- FIM INFORMAÇÕES DESCONTO ---'
    ].join('\n');

    observacoesCompletas = observacoesCompletas
      ? `${observacoesCompletas}\n\n${infoDesconto}`
      : infoDesconto;
  }

  return {
    cliente_id: dados.cliente?.id,
    tipo_atividade_id: dados.tipoAtividade?.id,
    regime_tributario_id: dados.regimeTributario?.id,
    faixa_faturamento_id: dados.faixaFaturamento?.id,
    valor_total: valorTotal,
    data_validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    status: 'RASCUNHO',
    observacoes: observacoesCompletas,
    itens,
    // Campos extras para controle (se a API suportar)
    percentual_desconto: dados.percentualDesconto || 0,
    valor_desconto: valorDesconto,
    requer_aprovacao: dados.requerAprovacao || false
  };
};

export const useSalvamentoAutomatico = (dadosProposta: any) => {
  const [estadoSalvamento, setEstadoSalvamento] = useState<EstadoSalvamento>({
    salvando: false,
    propostaSalva: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const propostaIdRef = useRef<number | null>(null);

  // Função para salvar como rascunho
  const salvarComoRascunho = useCallback(async (dados: any) => {
    setEstadoSalvamento(prev => ({ ...prev, salvando: true, erro: undefined }));

    try {
      const dadosAPI = await prepararDadosParaAPI(dados);

      let proposta: PropostaResponse;

      if (propostaIdRef.current) {
        // ⚠️ ATUALIZAR: Proposta existente
        proposta = await apiService.updateProposta(propostaIdRef.current, dadosAPI);
      } else {
        // ⚠️ CRIAR: Nova proposta
        proposta = await apiService.createProposta(dadosAPI);
        propostaIdRef.current = proposta.id;
      }

      setEstadoSalvamento({
        salvando: false,
        ultimoSalvamento: new Date(),
        propostaSalva: true,
        erro: undefined
      });

      return proposta;

    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      setEstadoSalvamento(prev => ({
        ...prev,
        salvando: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      }));
      throw error;
    }
  }, []);

  // ⚠️ NOVO: Salvamento automático com debounce
  const salvarAutomaticamente = useCallback(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar novo timeout para salvar após 2 segundos de inatividade
    timeoutRef.current = setTimeout(() => {
      if (dadosProposta && dadosProposta.cliente && dadosProposta.tipoAtividade) {
        salvarComoRascunho(dadosProposta);
      }
    }, 2000);
  }, [dadosProposta, salvarComoRascunho]);

  // ⚠️ NOVO: Efeito para salvamento automático
  useEffect(() => {
    if (dadosProposta && dadosProposta.cliente && dadosProposta.tipoAtividade) {
      salvarAutomaticamente();
    }

    // Cleanup do timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dadosProposta, salvarAutomaticamente]);

  // ⚠️ NOVO: Função para limpar estado
  const limparEstado = useCallback(() => {
    setEstadoSalvamento({
      salvando: false,
      propostaSalva: false
    });
    propostaIdRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    estadoSalvamento,
    salvarComoRascunho,
    salvarAutomaticamente,
    limparEstado,
    setEstadoSalvamento
  };
};
