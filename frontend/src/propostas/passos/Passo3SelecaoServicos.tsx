import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Info,
  AlertCircle,
  Save,
  CheckCircle
} from 'lucide-react';
import { apiService } from '../../lib/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { designUtils } from '../../utils/designTokens';

interface Servico {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  tipo_cobranca: string;
  valor_base: number;
  descricao: string;
  ativo: boolean;
}

interface ServicoSelecionado {
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
}

interface ServicoPorCategoria {
  categoria: string;
  servicos: Servico[];
  total: number;
}

interface TipoAtividade {
  id: number;
  codigo: string;
  nome: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
}

interface RegimeTributario {
  id: number;
  codigo: string;
  nome: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
}

interface Passo3Props {
  tipoAtividade: TipoAtividade;
  regimeTributario: RegimeTributario; // ⚠️ NOVO: Receber regime do Passo 2
  valorMensalidade?: number; // ⚠️ NOVO: Valor da mensalidade automática
  onVoltar: () => void;
  onProximo: (dados: {
    servicos: ServicoSelecionado[];
    valor_mensalidade: number;
    total_servicos: number;
    total_geral: number;
    tipo_atividade: TipoAtividade;
    regime_tributario: RegimeTributario;
  }) => void; // ✅ CORREÇÃO: Interface atualizada
  // ⚠️ NOVO: Props para salvamento automático
  dadosSalvos?: any;
  onSalvarProgresso?: (dados: any) => void;
}

// Função para formatar moeda
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

// Função para formatar tipo de cobrança
const formatarTipoCobranca = (tipoCobranca: string): string => {
  const tipos: Record<string, string> = {
    'MENSAL': 'mês',
    'POR_NF': 'NF',
    'VALOR_UNICO': 'serviço'
  };
  return tipos[tipoCobranca] || tipoCobranca;
};

// ✅ NOVO: Função de cálculo específica para Gestão de Funcionários
const calcularValorGestaoFuncionarios = (quantidade: number): { valorTotal: number; detalhes: Array<{ funcionario: number; valor: number }> } => {
  const detalhes: Array<{ funcionario: number; valor: number }> = [];
  let valorTotal = 0;

  for (let i = 1; i <= quantidade; i++) {
    let valorFuncionario: number;

    if (i === 1) {
      valorFuncionario = 50.00; // 1º funcionário: R$ 50,00
    } else if (i === 2) {
      valorFuncionario = 40.00; // 2º funcionário: R$ 40,00
    } else {
      valorFuncionario = 30.00; // 3º funcionário em diante: R$ 30,00
    }

    detalhes.push({ funcionario: i, valor: valorFuncionario });
    valorTotal += valorFuncionario;
  }

  return { valorTotal, detalhes };
};

// ✅ TESTES: Validação da regra de negócio
// Teste 1: 1 funcionário = R$ 50,00
// Teste 2: 2 funcionários = R$ 50,00 + R$ 40,00 = R$ 90,00
// Teste 3: 3 funcionários = R$ 50,00 + R$ 40,00 + R$ 30,00 = R$ 120,00
// Teste 4: 5 funcionários = R$ 50,00 + R$ 40,00 + R$ 30,00 + R$ 30,00 + R$ 30,00 = R$ 180,00
console.log('🧪 Testes da regra de Gestão de Funcionários:');
console.log('1 funcionário:', calcularValorGestaoFuncionarios(1)); // R$ 50,00
console.log('2 funcionários:', calcularValorGestaoFuncionarios(2)); // R$ 90,00
console.log('3 funcionários:', calcularValorGestaoFuncionarios(3)); // R$ 120,00
console.log('5 funcionários:', calcularValorGestaoFuncionarios(5)); // R$ 180,00

export const Passo3SelecaoServicos: React.FC<Passo3Props> = ({
  tipoAtividade,
  regimeTributario, // ⚠️ NOVO: Usar regime
  valorMensalidade = 0, // ⚠️ NOVO: Valor da mensalidade automática
  onVoltar,
  onProximo,
  dadosSalvos,
  onSalvarProgresso
}) => {
  const [todosServicos, setTodosServicos] = useState<Servico[]>([]);
  const [servicosPorCategoria, setServicosPorCategoria] = useState<ServicoPorCategoria[]>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<Map<number, ServicoSelecionado>>(new Map());
  const [informacoesExtras, setInformacoesExtras] = useState<Map<number, Record<string, unknown>>>(new Map());
  const [abaAtiva, setAbaAtiva] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ⚠️ NOVO: Estados para salvamento automático
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);

  // ✅ NOVO: Estado para informações de filtro por regime tributário
  const [infoFiltros, setInfoFiltros] = useState<{
    regime: string;
    totalDisponiveis: number;
    totalFiltrados: number;
  }>({ regime: '', totalDisponiveis: 0, totalFiltrados: 0 });

  // ✅ NOVO: Estado para serviços filtrados por regime
  const [servicosDisponiveis, setServicosDisponiveis] = useState<Servico[]>([]);

  // Verificar se é atividade de serviços (para filtro especial na aba FISCAL)
  const isAtividadeServicos = useMemo(() => {
    return tipoAtividade?.nome?.toLowerCase().includes('serviç') ||
      tipoAtividade?.codigo?.toLowerCase().includes('serv');
  }, [tipoAtividade]);

  // ⚠️ CORREÇÃO 1: Identificar serviços que devem ser booleanos
  const isServicoBooleano = (servico: Servico): boolean => {
    return servico.categoria === 'CONTABIL' || servico.categoria === 'SOCIETARIO'
  };

  // ⚠️ CORREÇÃO 3: Verificar se precisa de informações extras
  const precisaInformacoesExtras = (servico: Servico): boolean => {
    return servico.categoria === 'SOCIETARIO'
  };

  // ⚠️ NOVO: Recuperar dados salvos ao montar componente
  useEffect(() => {
    if (dadosSalvos) {
      if (dadosSalvos.servicosSelecionados) {
        const servicosMap = new Map();
        dadosSalvos.servicosSelecionados.forEach((servico: any) => {
          servicosMap.set(servico.servico_id, servico);
        });
        setServicosSelecionados(servicosMap);
      }

      if (dadosSalvos.informacoesExtras) {
        const extrasMap = new Map();
        Object.entries(dadosSalvos.informacoesExtras).forEach(([key, value]) => {
          extrasMap.set(parseInt(key), value as Record<string, unknown>);
        });
        setInformacoesExtras(extrasMap);
      }

      if (dadosSalvos.abaAtiva !== undefined) {
        setAbaAtiva(dadosSalvos.abaAtiva);
      }
    }

    // Recuperar do localStorage como fallback
    const dadosBackup = localStorage.getItem('proposta_passo3_backup');
    if (dadosBackup && !dadosSalvos) {
      try {
        const dados = JSON.parse(dadosBackup);
        if (dados.servicosSelecionados) {
          const servicosMap = new Map();
          dados.servicosSelecionados.forEach((servico: any) => {
            servicosMap.set(servico.servico_id, servico);
          });
          setServicosSelecionados(servicosMap);
        }

        if (dados.informacoesExtras) {
          const extrasMap = new Map();
          Object.entries(dados.informacoesExtras).forEach(([key, value]) => {
            extrasMap.set(parseInt(key), value as Record<string, unknown>);
          });
          setInformacoesExtras(extrasMap);
        }

        if (dados.abaAtiva !== undefined) {
          setAbaAtiva(dados.abaAtiva);
        }
      } catch (error) {
        console.warn('Erro ao recuperar backup do Passo 3:', error);
      }
    }
  }, [dadosSalvos]);

  // ⚠️ NOVO: Função de salvamento automático
  const salvarProgresso = useCallback(async () => {
    if (servicosSelecionados.size === 0 || !tipoAtividade?.id || !regimeTributario?.id) return;

    setSalvando(true);
    setErroSalvamento(null);

    try {
      const servicosArray = Array.from(servicosSelecionados.values());
      const extrasObject = Object.fromEntries(informacoesExtras);

      const dadosParaSalvar = {
        passo: 3,
        tipoAtividadeId: tipoAtividade?.id || 0,
        regimeTributarioId: regimeTributario?.id || 0,
        servicosSelecionados: servicosArray,
        informacoesExtras: extrasObject,
        abaAtiva,
        timestamp: new Date().toISOString(),
        dadosCompletos: {
          tipoAtividade: tipoAtividade || null,
          regimeTributario: regimeTributario || null,
          servicos: servicosArray.map(s => ({
            ...s,
            servico: todosServicos.find(ts => ts.id === s.servico_id)
          }))
        }
      };

      // Salvar no localStorage como backup
      localStorage.setItem('proposta_passo3_backup', JSON.stringify(dadosParaSalvar));

      // Chamar callback de salvamento se fornecido
      if (onSalvarProgresso) {
        await onSalvarProgresso(dadosParaSalvar);
      }

      setUltimoSalvamento(new Date());
      console.log('Progresso do Passo 3 salvo com sucesso');

    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      setErroSalvamento(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }, [servicosSelecionados, informacoesExtras, abaAtiva, tipoAtividade?.id, regimeTributario?.id, todosServicos, onSalvarProgresso]);

  // ⚠️ NOVO: Salvamento automático quando serviços mudam
  useEffect(() => {
    if (servicosSelecionados.size > 0 && tipoAtividade?.id && regimeTributario?.id) {
      const timeoutId = setTimeout(salvarProgresso, 2000); // Debounce de 2 segundos
      return () => clearTimeout(timeoutId);
    }
  }, [servicosSelecionados, informacoesExtras, salvarProgresso, tipoAtividade?.id, regimeTributario?.id]);

  // ⚠️ NOVO: Limpar backup ao sair
  useEffect(() => {
    return () => {
      // Manter backup por 24 horas para recuperação
      const dadosBackup = localStorage.getItem('proposta_passo3_backup');
      if (dadosBackup) {
        try {
          const dados = JSON.parse(dadosBackup);
          const timestamp = new Date(dados.timestamp);
          const agora = new Date();
          const diffHoras = (agora.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

          if (diffHoras > 24) {
            localStorage.removeItem('proposta_passo3_backup');
          }
        } catch (error) {
          localStorage.removeItem('proposta_passo3_backup');
        }
      }
    };
  }, []);

  // Calcular totais por categoria
  const totaisPorCategoria = useMemo(() => {
    const totais = new Map<string, number>();

    servicosPorCategoria.forEach(categoria => {
      const totalCategoria = Array.from(servicosSelecionados.values())
        .filter(item => {
          const servico = todosServicos.find(s => s.id === item.servico_id);
          if (!servico) return false;

          // Para serviços booleanos, incluir se estiverem selecionados (quantidade = 1)
          if (isServicoBooleano(servico) || servico.codigo === 'ORGAO-CLASSE') {
            return servico.categoria === categoria.categoria && item.quantidade === 1;
          }

          // Para serviços normais, incluir apenas com quantidade > 0
          return servico.categoria === categoria.categoria && item.quantidade > 0;
        })
        .reduce((sum, item) => sum + item.subtotal, 0);

      totais.set(categoria.categoria, totalCategoria);
    });

    return totais;
  }, [servicosSelecionados, servicosPorCategoria, todosServicos, tipoAtividade?.id, regimeTributario?.id]);

  // ✅ CORREÇÃO: Total geral de todos os serviços + mensalidade
  const totalGeral = useMemo(() => {
    const totalServicos = Array.from(totaisPorCategoria.values()).reduce((sum, total) => sum + total, 0);
    const totalComMensalidade = totalServicos + (valorMensalidade || 0);

    console.log('💰 Passo 3 - Cálculo do total:', {
      totalServicos,
      valorMensalidade: valorMensalidade || 0,
      totalComMensalidade
    });

    return totalComMensalidade;
  }, [totaisPorCategoria, valorMensalidade]);

  // ✅ IMPLEMENTAR: Carregar serviços filtrados pelo regime tributário específico
  const fetchServicosDisponiveis = async () => {
    try {
      console.log('🔍 Carregando serviços para regime:', regimeTributario);

      const servicosFiltrados = await apiService.getServicosPorRegime(regimeTributario.id);

      console.log('🔍 Serviços encontrados para regime', regimeTributario.codigo + ':', servicosFiltrados.length);

      // ✅ ADICIONAL: Log detalhado dos serviços
      servicosFiltrados.forEach((servico: Servico) => {
        console.log(`📋 Serviço disponível: ${servico.nome} - Categoria: ${servico.categoria}`);
      });

      setServicosDisponiveis(servicosFiltrados);

      // ✅ FEEDBACK: Informar se não há serviços disponíveis
      if (servicosFiltrados.length === 0) {
        console.warn(`⚠️ Nenhum serviço encontrado para o regime ${regimeTributario.nome}`);
      }

      // ✅ ATUALIZAR: Informações de filtro
      setInfoFiltros({
        regime: regimeTributario.nome,
        totalDisponiveis: servicosFiltrados.length,
        totalFiltrados: servicosFiltrados.length
      });

    } catch (error) {
      console.error('❌ Erro ao carregar serviços por regime:', error);
      setServicosDisponiveis([]);
      setInfoFiltros({
        regime: regimeTributario.nome,
        totalDisponiveis: 0,
        totalFiltrados: 0
      });
    } finally {
      // Loading state removido para simplificar
    }
  };

  // ✅ IMPLEMENTAR: Carregar serviços quando o regime mudar
  useEffect(() => {
    if (regimeTributario?.id) {
      fetchServicosDisponiveis();
    }
  }, [regimeTributario?.id]);

  // ⚠️ FILTRO ESPECIAL: Apenas para Aba FISCAL + Atividade Serviços
  const aplicarFiltroEspecial = (servicos: Servico[], categoria: string): Servico[] => {
    // ⚠️ REGRA ESPECIAL: Só filtrar na categoria FISCAL + atividade de serviços
    if (categoria === 'FISCAL' && isAtividadeServicos) {
      return servicos.filter(servico => servico.codigo === 'NFS-e');
    }

    // Para todas as outras categorias e tipos de atividade: mostrar todos
    return servicos;
  };

  const agruparServicosPorCategoria = useCallback((servicos: Servico[]): ServicoPorCategoria[] => {
    // Agrupar por categoria
    const grupos = servicos.reduce((acc, servico) => {
      if (!acc[servico.categoria]) {
        acc[servico.categoria] = [];
      }
      acc[servico.categoria].push(servico);
      return acc;
    }, {} as Record<string, Servico[]>);

    // Converter para array e aplicar filtros especiais
    return Object.entries(grupos).map(([categoria, servicosCategoria]) => ({
      categoria,
      servicos: aplicarFiltroEspecial(servicosCategoria, categoria),
      total: 0 // Será calculado dinamicamente
    }));
  }, []);

  // ✅ CORREÇÃO: Função de carregamento com filtros por regime tributário
  const carregarServicosFiltrados = useCallback(async () => {
    if (!tipoAtividade?.id || !regimeTributario?.id) {
      console.warn('Dados obrigatórios não disponíveis para carregar serviços');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔍 Carregando serviços filtrados por regime:', {
        tipoAtividade: tipoAtividade?.nome,
        regime: regimeTributario?.nome
      });

      // ✅ NOVA LÓGICA: Usar serviços já filtrados por regime
      const servicos = servicosDisponiveis.length > 0 ? servicosDisponiveis : [];
      setTodosServicos(servicos);

      // ✅ AGRUPAR: Serviços por categoria
      const grupos = agruparServicosPorCategoria(servicos);
      setServicosPorCategoria(grupos);

      // ✅ DEFINIR: Informações de filtro
      setInfoFiltros({
        regime: regimeTributario?.nome || '',
        totalDisponiveis: servicos.length,
        totalFiltrados: servicos.length
      });

      console.log(`✅ Carregados ${servicos.length} serviços filtrados para ${regimeTributario?.nome || 'Regime'}`);

    } catch (err: unknown) {
      console.error('❌ Erro ao carregar serviços filtrados:', err);

      const errorMessage = (err as Error)?.message || '';
      if (errorMessage.includes('Combinação inválida')) {
        setError(`Combinação inválida: ${tipoAtividade?.nome || 'Atividade'} com ${regimeTributario?.nome || 'Regime'}. Contacte o suporte.`);
      } else if (errorMessage.includes('404') || errorMessage.includes('Failed to fetch')) {
        // ⚠️ FALLBACK: Usar dados mockados filtrados
        const servicosMockados = obterServicosMockadosPorRegime(regimeTributario?.codigo || 'SN');
        setTodosServicos(servicosMockados);
        const grupos = agruparServicosPorCategoria(servicosMockados);
        setServicosPorCategoria(grupos);
        setError('API não disponível. Usando dados de demonstração filtrados.');
      } else {
        setError(errorMessage || 'Erro ao carregar serviços');
      }
    } finally {
      setLoading(false);
    }
  }, [tipoAtividade?.id, regimeTributario?.id, tipoAtividade?.nome, regimeTributario?.nome, regimeTributario?.codigo, servicosDisponiveis]);

  // ✅ NOVO: useEffect para recarregar quando serviços filtrados mudarem
  useEffect(() => {
    if (servicosDisponiveis.length > 0) {
      carregarServicosFiltrados();
    }
  }, [servicosDisponiveis, carregarServicosFiltrados]);

  // ⚠️ CORREÇÃO: Função de fallback com dados mockados - MEMOIZADA
  const obterServicosMockadosPorRegime = useCallback((codigoRegime: string): Servico[] => {
    const todosServicos: Servico[] = [
      {
        id: 1,
        codigo: 'BALANCETE-SN',
        nome: 'Geração de Balancete Mensal para Simples Nacional',
        categoria: 'CONTABIL',
        tipo_cobranca: 'MENSAL',
        valor_base: 50.00,
        descricao: 'Serviços de geração balancete completa para Simples Nacional',
        ativo: true
      },
      {
        id: 2,
        codigo: 'BALANCETE-LP-LR',
        nome: 'Geração de Balancete Mensal para Lucro Presumido e Lucro Real',
        categoria: 'CONTABIL',
        tipo_cobranca: 'MENSAL',
        valor_base: 100.00,
        descricao: 'Serviços de geração balancete completa para LP e LR',
        ativo: true
      },
      {
        id: 3,
        codigo: 'NF-e',
        nome: 'Nota Fiscal Eletrônica',
        categoria: 'FISCAL',
        tipo_cobranca: 'POR_NF',
        valor_base: 20.00,
        descricao: 'Emissão de Nota Fiscal Eletrônica',
        ativo: true
      },
      {
        id: 4,
        codigo: 'NFS-e',
        nome: 'Nota Fiscal de Serviços Eletrônica',
        categoria: 'FISCAL',
        tipo_cobranca: 'POR_NF',
        valor_base: 10.00,
        descricao: 'Emissão de Nota Fiscal de Serviços',
        ativo: true
      },
      {
        id: 5,
        codigo: 'CT-e',
        nome: 'Conhecimento de Transporte Eletrônico',
        categoria: 'FISCAL',
        tipo_cobranca: 'POR_NF',
        valor_base: 20.00,
        descricao: 'Emissão de Conhecimento de Transporte Eletrônico',
        ativo: true
      },
      {
        id: 6,
        codigo: 'FUNCIONARIO',
        nome: 'Gestão de Funcionários',
        categoria: 'PESSOAL',
        tipo_cobranca: 'MENSAL',
        valor_base: 50.00,
        descricao: 'Gestão de funcionários',
        ativo: true
      },
      {
        id: 7,
        codigo: 'PRO-LABORE',
        nome: 'Retirada de Pró-labore',
        categoria: 'PESSOAL',
        tipo_cobranca: 'MENSAL',
        valor_base: 30.00,
        descricao: 'Retirada de pró-labore',
        ativo: true
      },
      {
        id: 8,
        codigo: 'ORGAO-CLASSE',
        nome: 'Registro de Orgão de Classe',
        categoria: 'SOCIETARIO',
        tipo_cobranca: 'VALOR_UNICO',
        valor_base: 1000.00,
        descricao: 'Realização de todo processo de registro de Orgão de Classe',
        ativo: true
      }
    ];

    // ⚠️ APLICAR: Filtros básicos por regime
    return todosServicos.filter(servico => {
      switch (codigoRegime) {
        case 'MEI':
          return ['BALANCETE-SN', 'NFS-e'].some(codigo => servico.codigo.includes(codigo));

        case 'SN':
          return !['FUNCIONARIO', 'PRO-LABORE'].some(codigo => servico.codigo.includes(codigo)) ||
            servico.categoria === 'CONTABIL';

        case 'LP':
        case 'LR':
          return servico.categoria !== 'PESSOAL' ||
            ['FUNCIONARIO', 'PRO-LABORE'].some(codigo => servico.codigo.includes(codigo));

        case 'PR':
          return ['RURAL', 'PRODUTOR'].some(codigo => servico.nome.toUpperCase().includes(codigo));

        case 'Aut':
          return ['INSS', 'AUTONOMO'].some(codigo => servico.codigo.includes(codigo));

        case 'DOM':
          return ['DOMESTICO', 'EMPREGADOR'].some(codigo => servico.codigo.includes(codigo));

        case 'CAT':
          return ['CARTORIO', 'CARNE-LEAO'].some(codigo => servico.codigo.includes(codigo));

        default:
          return true;
      }
    });
  }, []);

  // ⚠️ ATUALIZAR: useEffect para carregar na inicialização
  useEffect(() => {
    if (tipoAtividade?.id && regimeTributario?.id) {
      carregarServicosFiltrados();
    }
  }, [tipoAtividade?.id, regimeTributario?.id]); // Dependências corretas com verificação de segurança

  // Funções auxiliares para gerenciar seleções
  const isServicoSelecionado = (servicoId: number): boolean => {
    return servicosSelecionados.has(servicoId);
  };

  const getQuantidadeServico = (servicoId: number): number => {
    return servicosSelecionados.get(servicoId)?.quantidade || 0;
  };

  const getSubtotalServico = (servicoId: number): number => {
    const item = servicosSelecionados.get(servicoId);
    if (!item) return 0;

    const servico = todosServicos.find(s => s.id === servicoId);

    // ✅ NOVO: Cálculo específico para Gestão de Funcionários
    if (servico?.codigo === 'FUNCIONARIO') {
      const calculo = calcularValorGestaoFuncionarios(item.quantidade);
      return calculo.valorTotal;
    }

    // Cálculo padrão para outros serviços
    return item.quantidade * item.valor_unitario;
  };

  // 🔄 LÓGICA ATUALIZADA: Função de Toggle para Diferentes Tipos de Serviço
  const handleServicoToggle = (servico: Servico, checked: boolean) => {
    const newMap = new Map(servicosSelecionados);

    if (checked) {
      if (isServicoBooleano(servico) || servico.codigo === 'ORGAO-CLASSE') {
        // Serviços booleanos: quantidade fixa = 1
        newMap.set(servico.id, {
          servico_id: servico.id,
          quantidade: 1,
          valor_unitario: servico.valor_base,
          subtotal: servico.valor_base
        });
      } else {
        // Serviços normais: quantidade inicial = 0
        let subtotalInicial = 0;

        // ✅ NOVO: Cálculo específico para Gestão de Funcionários
        if (servico.codigo === 'FUNCIONARIO') {
          subtotalInicial = calcularValorGestaoFuncionarios(0).valorTotal;
        }

        newMap.set(servico.id, {
          servico_id: servico.id,
          quantidade: 0,
          valor_unitario: servico.valor_base,
          subtotal: subtotalInicial
        });
      }
    } else {
      // Remover serviço e informações extras
      newMap.delete(servico.id);
      if (precisaInformacoesExtras(servico)) {
        const newExtras = new Map(informacoesExtras);
        newExtras.delete(servico.id);
        setInformacoesExtras(newExtras);
      }
    }

    setServicosSelecionados(newMap);
  };

  const handleQuantidadeChange = (servicoId: number, quantidade: number) => {
    const novosSelecionados = new Map(servicosSelecionados);
    const item = novosSelecionados.get(servicoId);

    if (item) {
      const servico = todosServicos.find(s => s.id === servicoId);
      let subtotal: number;

      // ✅ NOVO: Cálculo específico para Gestão de Funcionários
      if (servico?.codigo === 'FUNCIONARIO') {
        const calculo = calcularValorGestaoFuncionarios(Math.max(0, quantidade));
        subtotal = calculo.valorTotal;
      } else {
        // Cálculo padrão para outros serviços
        subtotal = Math.max(0, quantidade) * item.valor_unitario;
      }

      novosSelecionados.set(servicoId, {
        ...item,
        quantidade: Math.max(0, quantidade),
        subtotal: subtotal
      });
    }

    setServicosSelecionados(novosSelecionados);
  };

  // Validações
  const podeProximo = useMemo(() => {
    const temServicoValido = Array.from(servicosSelecionados.values())
      .some(item => {
        const servico = todosServicos.find(s => s.id === item.servico_id);
        if (!servico) return false;

        // Para serviços booleanos, basta estar selecionado
        if (isServicoBooleano(servico) || servico.codigo === 'ORGAO-CLASSE') {
          return true;
        }

        // Para serviços normais, precisa ter quantidade > 0
        return item.quantidade > 0;
      });

    return temServicoValido || servicosPorCategoria.length === 0;
  }, [servicosSelecionados, servicosPorCategoria, todosServicos, tipoAtividade?.id, regimeTributario?.id]);

  const handleProximo = () => {
    if (podeProximo) {
      // ⚠️ NOVO: Salvar antes de prosseguir
      if (tipoAtividade?.id && regimeTributario?.id) {
        salvarProgresso();
      }

      const servicosParaEnvio = Array.from(servicosSelecionados.values())
        .filter(item => {
          const servico = todosServicos.find(s => s.id === item.servico_id);
          if (!servico) return false;

          // Incluir serviços booleanos se estiverem selecionados
          if (isServicoBooleano(servico) || servico.codigo === 'ORGAO-CLASSE') {
            return true;
          }

          // Incluir serviços normais apenas com quantidade > 0
          return item.quantidade > 0;
        })
        .map(item => ({
          ...item,
          // Adicionar informações extras se existirem
          extras: informacoesExtras.get(item.servico_id) || {}
        }));

      // ✅ CORREÇÃO: Incluir mensalidade nos dados enviados
      const dadosCompletos = {
        servicos: servicosParaEnvio,
        valor_mensalidade: valorMensalidade || 0,
        total_servicos: Array.from(totaisPorCategoria.values()).reduce((sum, total) => sum + total, 0),
        total_geral: totalGeral,
        tipo_atividade: tipoAtividade,
        regime_tributario: regimeTributario
      };

      console.log('🚀 Passo 3 - Dados enviados para próximo passo:', dadosCompletos);
      onProximo(dadosCompletos);
    }
  };

  // ✅ NOVO: Componente específico para Gestão de Funcionários
  const ComponenteGestaoFuncionarios: React.FC<{
    servico: Servico;
    quantidade: number;
    subtotal: number;
    onQuantidadeChange: (quantidade: number) => void;
  }> = ({ quantidade, subtotal, onQuantidadeChange }) => {
    const calculo = calcularValorGestaoFuncionarios(quantidade);

    return (
      <div className={`mt-4 ${designUtils.colors.backgroundInfo} p-6 rounded-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold text-lg">👥</span>
            </div>
            <div>
              <h4 className={`text-lg font-semibold ${designUtils.colors.textPrimary}`}>
                Gestão de Funcionários
              </h4>
              <p className={`text-sm ${designUtils.colors.textSecondary}`}>
                Regra especial: 1º funcionário R$ 50,00 • 2º funcionário R$ 40,00 • 3º+ funcionários R$ 30,00
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className={`text-sm ${designUtils.colors.textSecondary}`}>Valor Total</p>
            <p className={`text-2xl font-bold ${designUtils.colors.textPrimary}`}>
              {formatarMoeda(subtotal)}
            </p>
          </div>
        </div>

        {/* Controle de quantidade */}
        <div className="flex items-center space-x-4 mb-4">
          <label className={`text-sm font-medium ${designUtils.colors.textPrimary}`}>
            Quantidade de Funcionários:
          </label>
          <input
            type="number"
            min="0"
            max="50"
            value={quantidade || ''}
            onChange={(e) => onQuantidadeChange(parseInt(e.target.value) || 0)}
            className={`w-24 px-3 py-2 ${designUtils.colors.input} bg-white`}
            placeholder="0"
          />
        </div>

        {/* Detalhamento do cálculo */}
        {quantidade > 0 && (
          <div className={`${designUtils.colors.card} p-4`}>
            <h5 className={`text-sm font-semibold ${designUtils.colors.textPrimary} mb-3`}>
              Detalhamento do Cálculo:
            </h5>

            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className={`font-semibold ${designUtils.colors.textPrimary}`}>Total:</span>
                <span className={`text-lg font-bold ${designUtils.colors.textPrimary}`}>
                  {formatarMoeda(calculo.valorTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Informações da regra */}
        <div className={`mt-4 ${designUtils.colors.backgroundInfo} rounded-lg p-3`}>
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-gray-600 text-xs">ℹ️</span>
            </div>
            <div className={`text-sm ${designUtils.colors.textSecondary}`}>
              <p className={`font-medium mb-1 ${designUtils.colors.textPrimary}`}>Regra de Desconto Progressivo:</p>
              <ul className={`space-y-1 text-xs ${designUtils.colors.textMuted}`}>
                <li>• 1º funcionário: R$ 50,00 (valor base)</li>
                <li>• 2º funcionário: R$ 40,00 (20% de desconto)</li>
                <li>• 3º funcionário em diante: R$ 30,00 (40% de desconto)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ⚠️ NOVO: Componente de indicador de filtro
  const IndicadorFiltro: React.FC<{
    tipoAtividade: TipoAtividade;
    regimeTributario: RegimeTributario;
    infoFiltros: any;
  }> = ({ tipoAtividade, regimeTributario, infoFiltros }) => (
    <div className="mb-6 bg-custom-blue-light border border-custom-blue rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-custom-blue-light rounded-full flex items-center justify-center">
          <Info className="w-5 h-5 text-custom-blue" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-custom-blue-dark">
            Serviços Filtrados por Configuração
          </p>
          <div className="text-xs text-custom-blue-dark mt-1 space-y-1">
            <p><strong>Tipo de Atividade:</strong> {tipoAtividade.nome}</p>
            <p><strong>Regime Tributário:</strong> {regimeTributario.nome} ({regimeTributario.codigo})</p>
            <p><strong>Serviços Disponíveis:</strong> {infoFiltros.totalDisponiveis} serviços compatíveis</p>
          </div>
          <div className="mt-2 text-xs text-custom-blue">
            💡 Apenas serviços compatíveis com sua configuração são exibidos
          </div>
        </div>
      </div>
    </div>
  );

  // ⚠️ NOVO: Verificação de dados obrigatórios
  if (!tipoAtividade?.id || !regimeTributario?.id) {
    return (
      <div className="min-h-screen pb-32 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">⏳</span>
          </div>
          <p className="text-lg text-gray-500 mb-2">
            Carregando configurações...
          </p>
          <p className="text-sm text-gray-400">
            Aguarde enquanto preparamos os serviços disponíveis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Proposta - Passo 3</h1>
            <p className="text-sm text-gray-500">Seleção de Serviços</p>
            {tipoAtividade?.nome && regimeTributario?.nome && (
              <p className="text-sm text-gray-600 mt-1">
                {tipoAtividade.nome} • {regimeTributario.nome}
              </p>
            )}

            {/* ⚠️ NOVO: Indicador de salvamento */}
            <div className="flex items-center space-x-2 mt-2">
              {salvando && (
                <div className="flex items-center text-custom-blue text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-custom-blue border-t-transparent rounded-full mr-2"></div>
                  <span>Salvando seleção de serviços...</span>
                </div>
              )}

              {ultimoSalvamento && !salvando && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Salvo {ultimoSalvamento.toLocaleTimeString()}</span>
                </div>
              )}

              {erroSalvamento && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>Erro no salvamento</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onVoltar}
            className={`${designUtils.colors.textSecondary} hover:${designUtils.colors.textPrimary} flex items-center space-x-2 transition-colors`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* ⚠️ NOVO: Indicador de filtro */}
      {tipoAtividade?.nome && regimeTributario?.nome && (
        <IndicadorFiltro
          tipoAtividade={tipoAtividade}
          regimeTributario={regimeTributario}
          infoFiltros={infoFiltros}
        />
      )}

      {/* ⚠️ NOVO: Aviso de recuperação se aplicável */}
      {dadosSalvos && dadosSalvos.servicosSelecionados && dadosSalvos.servicosSelecionados.length > 0 && (
        <div className="mb-6 bg-custom-blue-light border border-custom-blue rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-custom-blue" />
            <span className="text-custom-blue-dark text-sm">
              Seleção de serviços recuperada - {dadosSalvos.servicosSelecionados.length} serviço(s) restaurado(s)
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center">
            <LoadingSpinner size="md" />
            <span className="ml-3 text-gray-500">Carregando serviços...</span>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Navegação por Abas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {servicosPorCategoria.map((categoria, index) => {
                const total = totaisPorCategoria.get(categoria.categoria) || 0;
                const temServicos = categoria.servicos.length > 0;

                return (
                  <button
                    key={categoria.categoria}
                    onClick={() => setAbaAtiva(index)}
                    disabled={!temServicos}
                    className={`
                      whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${abaAtiva === index
                        ? `${designUtils.colors.tabActive}`
                        : temServicos
                          ? `${designUtils.colors.tabInactive}`
                          : `${designUtils.colors.tabDisabled}`
                      }
                    `}
                  >
                    <div className="flex flex-col items-center">
                      <span className="capitalize">{categoria.categoria.toLowerCase()}</span>
                      {total > 0 && (
                        <span className={`text-xs ${designUtils.colors.backgroundInfo} ${designUtils.colors.textPrimary} px-2 py-1 rounded-full mt-1`}>
                          {formatarMoeda(total)}
                        </span>
                      )}
                      {!temServicos && (
                        <span className="text-xs text-gray-400 mt-1">Indisponível</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo da aba ativa */}
          {servicosPorCategoria.length > 0 && servicosPorCategoria[abaAtiva] && (
            <div className="space-y-6">
              {/* Indicador especial para aba FISCAL + atividade serviços */}
              {servicosPorCategoria[abaAtiva].categoria === 'FISCAL' && isAtividadeServicos && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Info className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Filtro Especial Aplicado
                      </p>
                      <p className="text-xs text-yellow-700">
                        Para atividades de serviços, apenas a Nota Fiscal de Serviços (NFS-e) é exibida.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de serviços da categoria */}
              {servicosPorCategoria[abaAtiva].servicos.map((servico) => {
                const isSelecionado = isServicoSelecionado(servico.id);
                const quantidade = getQuantidadeServico(servico.id);
                const subtotal = getSubtotalServico(servico.id);

                return (
                  <div
                    key={servico.id}
                    className={`${designUtils.colors.card} p-6 transition-all ${isSelecionado
                      ? `${designUtils.colors.cardSelected}`
                      : `${designUtils.colors.cardHover}`
                      }`}
                  >
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelecionado}
                        onChange={(e) => handleServicoToggle(servico, e.target.checked)}
                        className="mt-1 h-5 w-5 text-custom-blue focus:ring-custom-blue border-gray-300 rounded"
                      />

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {servico.nome}
                              <span className="ml-2 text-sm text-gray-500">({servico.codigo})</span>
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{servico.descricao}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">
                              {formatarMoeda(servico.valor_base)}
                            </p>
                            <p className="text-sm text-gray-500">
                              por {formatarTipoCobranca(servico.tipo_cobranca)}
                            </p>
                          </div>
                        </div>

                        {/* Controles específicos para cada tipo de serviço */}
                        {isSelecionado && (
                          <>
                            {/* ✅ NOVO: Renderização especial para Gestão de Funcionários */}
                            {servico.codigo === 'FUNCIONARIO' ? (
                              <ComponenteGestaoFuncionarios
                                servico={servico}
                                quantidade={quantidade}
                                subtotal={subtotal}
                                onQuantidadeChange={(qtd) => handleQuantidadeChange(servico.id, qtd)}
                              />
                            ) : servico.codigo === 'ORGAO-CLASSE' ? (
                              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-700">
                                      Incluir registro de órgão de classe
                                    </span>
                                    <span className="text-sm text-green-600 font-medium">
                                      ✓ Selecionado
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Valor único</p>
                                    <p className="text-xl font-bold text-custom-blue">
                                      {formatarMoeda(servico.valor_base)}
                                    </p>
                                  </div>
                                </div>

                                {/* Campo adicional para nome do órgão */}
                                <div className="border-t border-gray-200 pt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome do Órgão de Classe (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ex: CRC, CRA, CREA, etc."
                                    value={(informacoesExtras.get(servico.id)?.nomeOrgao as string) || ''}
                                    onChange={(e) => {
                                      const newMap = new Map(informacoesExtras);
                                      newMap.set(servico.id, {
                                        ...newMap.get(servico.id),
                                        nomeOrgao: e.target.value
                                      });
                                      setInformacoesExtras(newMap);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-custom-blue focus:border-transparent"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Informe o órgão específico se conhecido
                                  </p>
                                </div>

                                <div className="mt-2 text-sm text-gray-600">
                                  Serviço será incluído com valor único de {formatarMoeda(servico.valor_base)}
                                </div>
                              </div>
                            ) : isServicoBooleano(servico) ? (
                              /* ⚠️ CORREÇÃO 1: Controle booleano para serviços CONTÁBIL */
                              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-700">
                                      Incluir este serviço na proposta
                                    </span>
                                    <span className="text-sm text-green-600 font-medium">
                                      ✓ Selecionado
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Valor do serviço</p>
                                    <p className="text-xl font-bold text-custom-blue">
                                      {formatarMoeda(servico.valor_base)}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-2 text-sm text-gray-600">
                                  Serviço será incluído com valor fixo de {servico.categoria === 'CONTABIL' ? formatarMoeda(servico.valor_base) + '/mês' : formatarMoeda(servico.valor_base) + '/ano'}
                                </div>
                              </div>
                            ) : (
                              /* Controle normal com quantidade */
                              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <label className="text-sm font-medium text-gray-700">
                                      Quantidade:
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={quantidade || ''}
                                      onChange={(e) => handleQuantidadeChange(servico.id, parseInt(e.target.value) || 0)}
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-custom-blue focus:border-transparent"
                                      placeholder="0"
                                    />
                                  </div>

                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Subtotal</p>
                                    <p className={`text-xl font-bold ${subtotal > 0 ? 'text-custom-blue' : 'text-gray-400'}`}>
                                      {formatarMoeda(subtotal)}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-2 text-sm text-gray-600">
                                  {quantidade > 0
                                    ? `${quantidade} × ${formatarMoeda(servico.valor_base)} = ${formatarMoeda(subtotal)}`
                                    : 'Defina uma quantidade para calcular o valor'
                                  }
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Estado vazio da categoria */}
              {servicosPorCategoria[abaAtiva].servicos.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">📋</span>
                  </div>
                  <p className="text-lg text-gray-500 mb-2">
                    Nenhum serviço disponível
                  </p>
                  <p className="text-sm text-gray-400">
                    Esta categoria não possui serviços configurados.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ⚠️ CORRIGIR: Resumo geral com padding adequado */}
          <div className="mt-8 mb-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resumo dos Serviços Selecionados
            </h3>

            {servicosPorCategoria.map(categoria => {
              const total = totaisPorCategoria.get(categoria.categoria) || 0;
              const servicosCategoria = Array.from(servicosSelecionados.values())
                .filter(item => {
                  const servico = todosServicos.find(s => s.id === item.servico_id);
                  if (!servico) return false;

                  // Para serviços booleanos, incluir se estiverem selecionados (quantidade = 1)
                  if (isServicoBooleano(servico) || servico.codigo === 'ORGAO-CLASSE') {
                    return servico.categoria === categoria.categoria && item.quantidade === 1;
                  }

                  // Para serviços normais, incluir apenas com quantidade > 0
                  return servico.categoria === categoria.categoria && item.quantidade > 0;
                });

              return (
                <div key={categoria.categoria} className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 capitalize">
                      {categoria.categoria.toLowerCase()}:
                    </span>
                    <span className={`font-semibold ${total > 0 ? 'text-custom-blue' : 'text-gray-400'}`}>
                      {formatarMoeda(total)}
                    </span>
                  </div>

                  {servicosCategoria.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {servicosCategoria.map(item => {
                        const servico = todosServicos.find(s => s.id === item.servico_id);
                        if (!servico) return null;

                        // Para serviços booleanos, mostrar texto diferente
                        if (isServicoBooleano(servico) || servico.codigo === 'ORGAO-CLASSE') {
                          return (
                            <div key={item.servico_id} className="text-sm text-gray-600 flex justify-between">
                              <span>• {servico.nome}: {formatarMoeda(item.valor_unitario)}</span>
                              <span>{formatarMoeda(item.subtotal)}</span>
                            </div>
                          );
                        }

                        // Para serviços normais, mostrar quantidade
                        // ✅ NOVO: Exibição especial para Gestão de Funcionários
                        if (servico.codigo === 'FUNCIONARIO') {
                          return (
                            <div key={item.servico_id} className="text-sm text-gray-600">
                              <div className="flex justify-between mb-1">
                                <span>• {servico.nome}: {item.quantidade} funcionário(s)</span>
                                <span>{formatarMoeda(item.subtotal)}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.servico_id} className="text-sm text-gray-600 flex justify-between">
                            <span>• {servico.nome}: {item.quantidade} × {formatarMoeda(item.valor_unitario)}</span>
                            <span>{formatarMoeda(item.subtotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ⚠️ NOVO: Mensalidade Automática */}
            {valorMensalidade > 0 && (
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-medium text-green-700">
                    Mensalidade Automática:
                  </span>
                  <span className="text-xl font-bold text-green-800">
                    {formatarMoeda(valorMensalidade)}
                  </span>
                </div>
                <div className="text-sm text-green-600">
                  ✅ Valor calculado automaticamente baseado nas configurações tributárias
                </div>
              </div>
            )}

            {/* ⚠️ AJUSTAR: Total com mais espaçamento */}
            <div className="border-t border-gray-300 pt-4 mt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-gray-900">
                  TOTAL GERAL:
                </span>
                <span className="text-2xl font-bold text-custom-blue">
                  {formatarMoeda(totalGeral)}
                </span>
              </div>
            </div>
          </div>

          {/* ⚠️ ADICIONAR: Espaçamento extra antes dos botões */}
          <div className="pb-8">
            {/* Espaço adicional para garantir que não corte */}
          </div>
        </>
      )}

      {/* Botões de ação com posição fixa corrigida */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Total: {formatarMoeda(totalGeral)}
            </span>
            {!podeProximo && (
              <span className="text-sm text-yellow-600 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4" />
                <span>Selecione pelo menos um serviço válido</span>
              </span>
            )}

            {/* ⚠️ NOVO: Botão de salvamento manual */}
            <button
              onClick={salvarProgresso}
              disabled={servicosSelecionados.size === 0 || salvando || !tipoAtividade?.id || !regimeTributario?.id}
              className={`flex items-center space-x-2 px-3 py-1 text-sm ${designUtils.colors.primaryButton} rounded-lg disabled:opacity-50 transition-colors`}
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar Seleção'}</span>
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onVoltar}
              className={`px-6 py-2 text-sm font-medium ${designUtils.colors.secondaryButton} rounded-lg transition-colors`}
            >
              Anterior
            </button>
            <button
              onClick={handleProximo}
              disabled={!podeProximo}
              className={`px-6 py-2 text-sm font-medium ${designUtils.colors.primaryButton} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2`}
            >
              <span>Próximo</span>
              {!podeProximo && <AlertCircle className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
