import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Info,
  AlertCircle,
  CheckCircle,
  List,
  User,
  Loader2 // 1. Usar Loader2
} from 'lucide-react';
import { apiService } from '../../lib/api';
// 2. Importar componentes de UI padronizados
import {
  PageHeader,
  Card,
  ErrorMessage
} from '../../components/ui';
import { Button, Input, Textarea } from '../../components/forms';
import type { Servico as ServicoBase, Categoria as CategoriaType } from '../../types';
import { formatarHora } from '../../utils/formatters';

// ... (Interfaces e funções helper como formatarMoeda, etc. permanecem as mesmas) ...
type Servico = ServicoBase & {
  categoria_id?: number | null;
  categoria_nome?: string | null;
  categoria_codigo?: string | null;
};

interface ServicoSelecionado {
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
}

interface ServicoPorCategoria {
  key: string;
  categoriaId?: number | null;
  categoriaCodigo?: string;
  displayName: string;
  servicos: Servico[];
  total: number;
}

type CategoriaInfo = CategoriaType & {
  codigo?: string | null;
  slug?: string | null;
};

type InfoFiltros = {
  regime: string;
  totalDisponiveis: number;
  totalFiltrados: number;
};

type InformacoesExtrasPersistidas = Record<string, Record<string, unknown>>;

type ServicoSelecionadoDetalhado = ServicoSelecionado & {
  servico?: Servico;
};

interface Passo3DadosSalvos {
  passo?: number;
  tipoAtividadeId?: number;
  regimeTributarioId?: number;
  servicosSelecionados?: ServicoSelecionado[];
  informacoesExtras?: InformacoesExtrasPersistidas;
  abaAtiva?: number;
  timestamp?: string;
  dadosCompletos?: {
    tipoAtividade: TipoAtividade | null;
    regimeTributario: RegimeTributario | null;
    servicos: ServicoSelecionadoDetalhado[];
  };
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
  regimeTributario: RegimeTributario;
  valorMensalidade?: number;
  onVoltar: () => void;
  onProximo: (dados: {
    servicos: ServicoSelecionado[];
    valor_mensalidade: number;
    total_servicos: number;
    total_geral: number;
    tipo_atividade: TipoAtividade;
    regime_tributario: RegimeTributario;
  }) => void;
  dadosSalvos?: Passo3DadosSalvos;
  onSalvarProgresso?: (dados: Passo3DadosSalvos) => void | Promise<void>;
}

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

const formatarTipoCobranca = (tipoCobranca: string): string => {
  const tipos: Record<string, string> = {
    'MENSAL': 'mês',
    'POR_NF': 'NF',
    'VALOR_UNICO': 'serviço'
  };
  return tipos[tipoCobranca] || tipoCobranca;
};

const PALAVRAS_MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

const formatarNomeCategoria = (nome: string): string => {
  const base = nome
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');

  return base.split(' ').map((palavra, index) => {
    if (!palavra) return '';
    if (index > 0 && PALAVRAS_MINUSCULAS.has(palavra)) {
      return palavra;
    }
    const [primeira, ...resto] = palavra;
    return primeira.toLocaleUpperCase('pt-BR') + resto.join('');
  }).join(' ');
};

const calcularValorGestaoFuncionarios = (quantidade: number): { valorTotal: number; detalhes: Array<{ funcionario: number; valor: number }> } => {
  const detalhes: Array<{ funcionario: number; valor: number }> = [];
  let valorTotal = 0;
  for (let i = 1; i <= quantidade; i++) {
    let valorFuncionario: number;
    if (i === 1) valorFuncionario = 50.00;
    else if (i === 2) valorFuncionario = 40.00;
    else valorFuncionario = 30.00;
    detalhes.push({ funcionario: i, valor: valorFuncionario });
    valorTotal += valorFuncionario;
  }
  return { valorTotal, detalhes };
};

const normalizarCategoriaCodigo = (valor?: string | null): string => {
  if (!valor) return '';
  return valor.trim().toUpperCase();
};

const normalizarCategoriaNome = (valor?: string | null): string => {
  if (!valor) return '';
  return valor.trim().toLowerCase();
};

const obterChaveCategoriaServico = (servico: Servico): string => {
  if (typeof servico.categoria_id === 'number') {
    return `id-${servico.categoria_id}`;
  }
  const nomeNormalizado = normalizarCategoriaNome(servico.categoria ?? servico.categoria_nome ?? servico.categoria_codigo ?? null);
  if (nomeNormalizado) return `nome-${nomeNormalizado}`;
  return `servico-${servico.id}`;
};

const obterCodigoCategoriaAgrupamento = (servico: Servico, categoria?: CategoriaInfo | null): string => {
  if (categoria?.codigo) return normalizarCategoriaCodigo(categoria.codigo);
  if (categoria?.nome) return normalizarCategoriaCodigo(categoria.nome);
  if (servico.categoria_codigo) return normalizarCategoriaCodigo(servico.categoria_codigo);
  return normalizarCategoriaCodigo(servico.categoria ?? servico.categoria_nome ?? null);
};

const obterDisplayNameCategoria = (servico: Servico, categoria?: CategoriaInfo | null): string => {
  const nome = categoria?.nome ?? servico.categoria ?? servico.categoria_nome ?? servico.categoria_codigo;
  if (nome) return formatarNomeCategoria(nome);
  return 'Outros';
};

const normalizarValorBase = (valor: unknown): number => {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string') {
    const parsed = Number(valor.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  if (valor && typeof (valor as { toString: () => string }).toString === 'function') {
    const parsed = Number((valor as { toString: () => string }).toString());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const adaptarServico = (servico: Servico): Servico => {
  const valorBase = normalizarValorBase(servico.valor_base ?? servico.valor_unitario ?? servico.preco_base ?? 0);
  const categoriaNome = servico.categoria ?? servico.categoria_nome ?? servico.categoria_codigo ?? undefined;
  return {
    ...servico,
    valor_base: valorBase,
    categoria: categoriaNome,
    categoria_codigo: servico.categoria_codigo ?? normalizarCategoriaCodigo(categoriaNome),
  };
};

const obterValorBaseServico = (servico: Servico): number => {
  return normalizarValorBase(servico.valor_base);
};


export const Passo3SelecaoServicos: React.FC<Passo3Props> = ({
  tipoAtividade,
  regimeTributario,
  valorMensalidade = 0,
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
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [infoFiltros, setInfoFiltros] = useState<InfoFiltros>({ regime: '', totalDisponiveis: 0, totalFiltrados: 0 });
  const [servicosDisponiveis, setServicosDisponiveis] = useState<Servico[]>([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<CategoriaInfo[]>([]);

  // ... (Toda a lógica interna, hooks e funções de fetch permanecem os mesmos) ...
  // ... (isServicoBooleano, salvarProgresso, fetchServicosDisponiveis, etc.) ...
  const isAtividadeServicos = useMemo(() => {
    const nome = tipoAtividade?.nome?.toLowerCase() ?? '';
    const codigo = tipoAtividade?.codigo?.toLowerCase() ?? '';
    return nome.includes('serviç') || codigo.includes('serv');
  }, [tipoAtividade]);

  const carregarCategorias = useCallback(async () => {
    try {
      const resposta = await apiService.getCategorias({ ativo_only: true });
      const lista = Array.isArray(resposta) ? (resposta as CategoriaInfo[]) : [];
      const enriquecidas = lista.map(categoria => ({
        ...categoria,
        codigo: categoria.codigo ?? null,
        slug: categoria.slug ?? null
      }));
      setCategoriasDisponiveis(enriquecidas);
    } catch (err) {
      console.warn('Não foi possível carregar categorias de serviços:', err);
      setCategoriasDisponiveis([]);
    }
  }, []);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  const isServicoBooleano = useCallback((servico: Servico): boolean => {
    const categoriaCodigo = normalizarCategoriaCodigo(servico.categoria_codigo ?? servico.categoria);
    return categoriaCodigo === 'CONTABIL' || categoriaCodigo === 'SOCIETARIO';
  }, []);

  const precisaInformacoesExtras = useCallback((servico: Servico): boolean => {
    const categoriaCodigo = normalizarCategoriaCodigo(servico.categoria_codigo ?? servico.categoria);
    return categoriaCodigo === 'SOCIETARIO';
  }, []);

  useEffect(() => {
    if (dadosSalvos) {
      if (Array.isArray(dadosSalvos.servicosSelecionados)) {
        const servicosMap = new Map<number, ServicoSelecionado>();
        (dadosSalvos.servicosSelecionados as ServicoSelecionado[]).forEach((servicoSelecionado) => {
          servicosMap.set(servicoSelecionado.servico_id, servicoSelecionado);
        });
        setServicosSelecionados(servicosMap);
      }
      if (dadosSalvos.informacoesExtras) {
        const extrasMap = new Map<number, Record<string, unknown>>();
        Object.entries(dadosSalvos.informacoesExtras).forEach(([key, value]) => {
          extrasMap.set(parseInt(key), value as Record<string, unknown>);
        });
        setInformacoesExtras(extrasMap);
      }
      if (dadosSalvos.abaAtiva !== undefined) setAbaAtiva(dadosSalvos.abaAtiva);
    }
    const dadosBackup = localStorage.getItem('proposta_passo3_backup');
    if (dadosBackup && !dadosSalvos) {
      try {
        const dados = JSON.parse(dadosBackup);
        if (Array.isArray(dados.servicosSelecionados)) {
          const servicosMap = new Map<number, ServicoSelecionado>();
          (dados.servicosSelecionados as ServicoSelecionado[]).forEach((servicoSelecionado) => {
            servicosMap.set(servicoSelecionado.servico_id, servicoSelecionado);
          });
          setServicosSelecionados(servicosMap);
        }
        if (dados.informacoesExtras) {
          const extrasMap = new Map<number, Record<string, unknown>>();
          Object.entries(dados.informacoesExtras).forEach(([key, value]) => {
            extrasMap.set(parseInt(key), value as Record<string, unknown>);
          });
          setInformacoesExtras(extrasMap);
        }
        if (dados.abaAtiva !== undefined) setAbaAtiva(dados.abaAtiva);
      } catch (error) {
        console.warn('Erro ao recuperar backup do Passo 3:', error);
      }
    }
  }, [dadosSalvos]);

  const salvarProgresso = useCallback(async () => {
    if (servicosSelecionados.size === 0 || !tipoAtividade?.id || !regimeTributario?.id) return;
    setSalvando(true);
    try {
      const servicosArray = Array.from(servicosSelecionados.values());
      const extrasObject = Object.fromEntries(informacoesExtras) as InformacoesExtrasPersistidas;
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
      localStorage.setItem('proposta_passo3_backup', JSON.stringify(dadosParaSalvar));
      if (onSalvarProgresso) {
        await onSalvarProgresso(dadosParaSalvar);
      }
      setUltimoSalvamento(new Date());
    } catch (error) {
      console.warn('Falha ao salvar progresso do Passo 3:', error);
    } finally {
      setSalvando(false);
    }
  }, [servicosSelecionados, informacoesExtras, abaAtiva, tipoAtividade, regimeTributario, todosServicos, onSalvarProgresso]);

  useEffect(() => {
    if (servicosSelecionados.size > 0 && tipoAtividade?.id && regimeTributario?.id) {
      const timeoutId = setTimeout(salvarProgresso, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [servicosSelecionados, informacoesExtras, salvarProgresso, tipoAtividade?.id, regimeTributario?.id]);

  useEffect(() => {
    return () => {
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
        } catch {
          localStorage.removeItem('proposta_passo3_backup');
        }
      }
    };
  }, []);

  const carregarServicosDisponiveis = useCallback(async () => {
    if (!regimeTributario?.id) return;
    setLoading(true);
    setError('');
    try {
      const resposta = await apiService.getServicosPorRegime(regimeTributario.id);
      const adaptados = (Array.isArray(resposta) ? resposta : []).map(adaptarServico);
      setServicosDisponiveis(adaptados);
      setInfoFiltros({
        regime: regimeTributario.nome,
        totalDisponiveis: adaptados.length,
        totalFiltrados: adaptados.length,
      });
    } catch (err) {
      console.warn('Falha ao carregar serviços por regime:', err);
      setServicosDisponiveis([]);
      setInfoFiltros({
        regime: regimeTributario?.nome || '',
        totalDisponiveis: 0,
        totalFiltrados: 0,
      });
      setError(err instanceof Error ? err.message : 'Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [regimeTributario]);

  useEffect(() => {
    carregarServicosDisponiveis();
  }, [carregarServicosDisponiveis]);

  const aplicarFiltroEspecial = useCallback((servicos: Servico[], categoriaCodigo?: string | null): Servico[] => {
    const codigo = normalizarCategoriaCodigo(categoriaCodigo);
    if (codigo === 'FISCAL' && isAtividadeServicos) {
      return servicos.filter(servico => (servico.codigo ?? '').toUpperCase() === 'NFS-E');
    }
    return servicos;
  }, [isAtividadeServicos]);

  const agruparServicosPorCategoria = useCallback((servicos: Servico[]): ServicoPorCategoria[] => {
    if (servicos.length === 0) return [];

    const categoriaPorId = new Map<number, CategoriaInfo>();
    const categoriaPorNome = new Map<string, CategoriaInfo>();

    categoriasDisponiveis.forEach(categoria => {
      if (typeof categoria.id === 'number') {
        categoriaPorId.set(categoria.id, categoria);
      }
      const nomeChave = normalizarCategoriaNome(categoria.nome);
      if (nomeChave) categoriaPorNome.set(nomeChave, categoria);
      const codigoChave = normalizarCategoriaNome(categoria.codigo);
      if (codigoChave) categoriaPorNome.set(codigoChave, categoria);
      const slugChave = normalizarCategoriaNome(categoria.slug);
      if (slugChave) categoriaPorNome.set(slugChave, categoria);
    });

    const grupos = new Map<string, { categoria?: CategoriaInfo | null; servicos: Servico[] }>();

    servicos.forEach(servico => {
      const chave = obterChaveCategoriaServico(servico);
      const categoriaMeta = typeof servico.categoria_id === 'number'
        ? categoriaPorId.get(servico.categoria_id)
        : categoriaPorNome.get(normalizarCategoriaNome(servico.categoria ?? servico.categoria_nome ?? servico.categoria_codigo ?? null));
      const existente = grupos.get(chave);
      if (existente) {
        existente.servicos.push(servico);
      } else {
        grupos.set(chave, { categoria: categoriaMeta ?? null, servicos: [servico] });
      }
    });

    return Array.from(grupos.entries()).map(([chave, grupo]) => {
      const { categoria: categoriaMeta, servicos: lista } = grupo;
      const codigo = obterCodigoCategoriaAgrupamento(lista[0], categoriaMeta);
      const filtrados = aplicarFiltroEspecial(lista, codigo);
      if (filtrados.length === 0) {
        return null;
      }
      return {
        key: chave,
        categoriaId: categoriaMeta?.id ?? filtrados[0].categoria_id ?? null,
        categoriaCodigo: codigo,
        displayName: obterDisplayNameCategoria(filtrados[0], categoriaMeta),
        servicos: filtrados,
        total: 0,
      } as ServicoPorCategoria;
    }).filter((grupo): grupo is ServicoPorCategoria => Boolean(grupo))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR', { sensitivity: 'base' }));
  }, [categoriasDisponiveis, aplicarFiltroEspecial]);

  const carregarServicosAgrupados = useCallback(() => {
    const grupos = agruparServicosPorCategoria(servicosDisponiveis);
    setServicosPorCategoria(grupos);
    setTodosServicos(servicosDisponiveis);
    setAbaAtiva(prev => (grupos.length === 0 ? 0 : Math.min(prev, grupos.length - 1)));
    setInfoFiltros(prev => ({
      ...prev,
      totalFiltrados: servicosDisponiveis.length,
    }));
  }, [agruparServicosPorCategoria, servicosDisponiveis]);

  useEffect(() => {
    carregarServicosAgrupados();
  }, [servicosDisponiveis, carregarServicosAgrupados]);

  const totaisPorCategoria = useMemo(() => {
    const totais = new Map<string, number>();
    servicosPorCategoria.forEach(categoria => {
      const totalCategoria = Array.from(servicosSelecionados.values())
        .filter(item => {
          const servico = todosServicos.find(s => s.id === item.servico_id);
          if (!servico) return false;
          const chaveCategoriaServico = obterChaveCategoriaServico(servico);
          const codigoServico = (servico.codigo ?? '').toUpperCase();
          if (isServicoBooleano(servico) || codigoServico === 'ORGAO-CLASSE') {
            return chaveCategoriaServico === categoria.key && item.quantidade === 1;
          }
          return chaveCategoriaServico === categoria.key && item.quantidade > 0;
        })
        .reduce((sum, item) => sum + item.subtotal, 0);
      totais.set(categoria.key, totalCategoria);
    });
    return totais;
  }, [servicosSelecionados, servicosPorCategoria, todosServicos, isServicoBooleano]);

  const totalGeral = useMemo(() => {
    const totalServicos = Array.from(totaisPorCategoria.values()).reduce((sum, total) => sum + total, 0);
    return totalServicos + (valorMensalidade || 0);
  }, [totaisPorCategoria, valorMensalidade]);

  // ... (Funções handleServicoToggle, handleQuantidadeChange, etc. permanecem as mesmas) ...
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
    const codigoServico = normalizarCategoriaCodigo(servico?.codigo);
    if (codigoServico === 'FUNCIONARIO') {
      const calculo = calcularValorGestaoFuncionarios(item.quantidade);
      return calculo.valorTotal;
    }
    return item.quantidade * item.valor_unitario;
  };
  const handleServicoToggle = (servico: Servico, checked: boolean) => {
    const newMap = new Map(servicosSelecionados);
    const codigoServico = normalizarCategoriaCodigo(servico.codigo);
    const valorBase = normalizarValorBase(servico.valor_base);
    if (checked) {
      if (isServicoBooleano(servico) || codigoServico === 'ORGAO-CLASSE') {
        newMap.set(servico.id, {
          servico_id: servico.id,
          quantidade: 1,
          valor_unitario: valorBase,
          subtotal: valorBase
        });
      } else {
        let subtotalInicial = 0;
        if (codigoServico === 'FUNCIONARIO') {
          subtotalInicial = calcularValorGestaoFuncionarios(0).valorTotal;
        }
        newMap.set(servico.id, {
          servico_id: servico.id,
          quantidade: 0,
          valor_unitario: valorBase,
          subtotal: subtotalInicial
        });
      }
    } else {
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
      const codigoServico = normalizarCategoriaCodigo(servico?.codigo);
      if (codigoServico === 'FUNCIONARIO') {
        const calculo = calcularValorGestaoFuncionarios(Math.max(0, quantidade));
        subtotal = calculo.valorTotal;
      } else {
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

  const podeProximo = useMemo(() => {
    const temServicoValido = Array.from(servicosSelecionados.values())
      .some(item => {
        const servico = todosServicos.find(s => s.id === item.servico_id);
        if (!servico) return false;
        const codigoServico = normalizarCategoriaCodigo(servico.codigo);
        if (isServicoBooleano(servico) || codigoServico === 'ORGAO-CLASSE') {
          return true;
        }
        return item.quantidade > 0;
      });
    return temServicoValido || servicosPorCategoria.length === 0;
  }, [servicosSelecionados, servicosPorCategoria, todosServicos, isServicoBooleano]);

  const handleProximo = () => {
    if (podeProximo) {
      if (tipoAtividade?.id && regimeTributario?.id) {
        salvarProgresso();
      }
      const servicosParaEnvio = Array.from(servicosSelecionados.values())
        .filter(item => {
          const servico = todosServicos.find(s => s.id === item.servico_id);
          if (!servico) return false;
          const codigoServico = normalizarCategoriaCodigo(servico.codigo);
          if (isServicoBooleano(servico) || codigoServico === 'ORGAO-CLASSE') {
            return true;
          }
          return item.quantidade > 0;
        })
        .map(item => ({
          ...item,
          extras: informacoesExtras.get(item.servico_id) || {}
        }));
      const dadosCompletos = {
        servicos: servicosParaEnvio,
        valor_mensalidade: valorMensalidade || 0,
        total_servicos: Array.from(totaisPorCategoria.values()).reduce((sum, total) => sum + total, 0),
        total_geral: totalGeral,
        tipo_atividade: tipoAtividade,
        regime_tributario: regimeTributario
      };
      onProximo(dadosCompletos);
    }
  };

  // 3. Componente de Gestão de Funcionários padronizado
  const ComponenteGestaoFuncionarios: React.FC<{
    servico: Servico;
    quantidade: number;
    subtotal: number;
    onQuantidadeChange: (quantidade: number) => void;
  }> = ({ quantidade, subtotal, onQuantidadeChange }) => {
    const calculo = calcularValorGestaoFuncionarios(quantidade);
    return (
      <Card variant="bordered" className="mt-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Gestão de Funcionários</h4>
              <p className="text-sm text-gray-600">Regra especial: Desconto progressivo por funcionário.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Valor Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatarMoeda(subtotal)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 mb-4">
          <label className="text-sm font-medium text-gray-700">Quantidade de Funcionários:</label>
          <Input
            type="number"
            min="0"
            max="50"
            value={quantidade || ''}
            onChange={(e) => onQuantidadeChange(parseInt(e.target.value) || 0)}
            className="w-24"
            placeholder="0"
          />
        </div>
        {quantidade > 0 && (
          <Card className="p-4">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Detalhamento do Cálculo:</h5>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">Total:</span>
                <span className="text-lg font-bold text-gray-900">{formatarMoeda(calculo.valorTotal)}</span>
              </div>
            </div>
          </Card>
        )}
      </Card>
    );
  };

  // 4. Componente de Indicador de Filtro padronizado
  const IndicadorFiltro: React.FC<{
    tipoAtividade: TipoAtividade;
    regimeTributario: RegimeTributario;
    infoFiltros: InfoFiltros;
  }> = ({ tipoAtividade, regimeTributario, infoFiltros }) => (
    <div className="mb-6 flex items-start space-x-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <Info className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-800">Serviços Filtrados por Configuração</p>
        <div className="text-xs text-blue-700 mt-1 space-y-1">
          <p><strong>Tipo:</strong> {tipoAtividade.nome} | <strong>Regime:</strong> {regimeTributario.nome}</p>
          <p><strong>Resultado:</strong> {infoFiltros.totalDisponiveis} serviços compatíveis encontrados.</p>
        </div>
      </div>
    </div>
  );

  if (!tipoAtividade?.id || !regimeTributario?.id) {
    return (
      <div className="pb-32 flex items-center justify-center pt-10">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-gray-500 mb-2">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  // 5. Renderização Principal Padronizada
  return (
    <div className="pb-32">
      <PageHeader
        title="Nova Proposta - Passo 3"
        subtitle="Seleção de Serviços"
      >
        <div className="flex items-center space-x-2">
          {/* Status do Salvamento */}
          {salvando && (
            <div className="flex items-center text-blue-600 text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Salvando...</span>
            </div>
          )}
          {ultimoSalvamento && !salvando && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Salvo {formatarHora(ultimoSalvamento)}</span>
            </div>
          )}
          <Button variant="ghost" onClick={onVoltar} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Voltar
          </Button>
        </div>
      </PageHeader>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}

      {tipoAtividade?.nome && regimeTributario?.nome && (
        <IndicadorFiltro
          tipoAtividade={tipoAtividade}
          regimeTributario={regimeTributario}
          infoFiltros={infoFiltros}
        />
      )}

      {dadosSalvos?.servicosSelecionados && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <CheckCircle className="w-5 h-5" />
          <span>Seleção de serviços recuperada.</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 mr-3 animate-spin text-blue-600" />
          <span className="text-gray-500">Carregando serviços...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Abas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {servicosPorCategoria.map((categoria, index) => {
                const total = totaisPorCategoria.get(categoria.key) || 0;
                const temServicos = categoria.servicos.length > 0;
                return (
                  <button
                    key={categoria.key}
                    onClick={() => setAbaAtiva(index)}
                    disabled={!temServicos}
                    className={`flex-shrink-0 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${abaAtiva === index
                        ? 'border-blue-500 text-blue-600'
                        : temServicos
                          ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          : 'border-transparent text-gray-300 cursor-not-allowed'
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{categoria.displayName}</span>
                      {total > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mt-1">
                          {formatarMoeda(total)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo da Aba */}
          {servicosPorCategoria.length > 0 && servicosPorCategoria[abaAtiva] && (
            <div className="space-y-6">
              {normalizarCategoriaCodigo(servicosPorCategoria[abaAtiva].categoriaCodigo) === 'FISCAL' && isAtividadeServicos && (
                <div className="flex items-start space-x-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <Info className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">Filtro Especial Aplicado</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Para atividades de serviços, apenas a Nota Fiscal de Serviços (NFS-e) é exibida nesta categoria.
                    </p>
                  </div>
                </div>
              )}

              {servicosPorCategoria[abaAtiva].servicos.map((servico) => {
                const isSelecionado = isServicoSelecionado(servico.id);
                const quantidade = getQuantidadeServico(servico.id);
                const subtotal = getSubtotalServico(servico.id);
                const valorBase = obterValorBaseServico(servico);
                const codigoServico = normalizarCategoriaCodigo(servico.codigo);
                return (
                  <Card
                    key={servico.id}
                    className={`transition-all ${isSelecionado ? 'border-blue-300 ring-2 ring-blue-200' : 'hover:border-gray-300'}`}
                  >
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelecionado}
                        onChange={(e) => handleServicoToggle(servico, e.target.checked)}
                        className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        aria-label={`Selecionar serviço ${servico.nome}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{servico.nome}</h3>
                            <p className="text-sm text-gray-600 mt-1">{servico.descricao}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-lg font-semibold text-gray-900">{formatarMoeda(valorBase)}</p>
                            <p className="text-sm text-gray-500">/ {formatarTipoCobranca(servico.tipo_cobranca ?? '')}</p>
                          </div>
                        </div>
                        {isSelecionado && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {codigoServico === 'FUNCIONARIO' ? (
                              <ComponenteGestaoFuncionarios
                                servico={servico}
                                quantidade={quantidade}
                                subtotal={subtotal}
                                onQuantidadeChange={(qtd) => handleQuantidadeChange(servico.id, qtd)}
                              />
                            ) : codigoServico === 'ORGAO-CLASSE' ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-700">✓ Selecionado (Valor Único)</span>
                                  <span className="text-xl font-bold text-blue-600">{formatarMoeda(valorBase)}</span>
                                </div>
                                <Textarea
                                  placeholder="Nome do Órgão de Classe (Ex: CRC, CRA)"
                                  value={(informacoesExtras.get(servico.id)?.nomeOrgao as string) || ''}
                                  onChange={(e) => {
                                    const newMap = new Map(informacoesExtras);
                                    newMap.set(servico.id, { ...newMap.get(servico.id), nomeOrgao: e.target.value });
                                    setInformacoesExtras(newMap);
                                  }}
                                  rows={1}
                                />
                              </div>
                            ) : isServicoBooleano(servico) ? (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-700">✓ Selecionado</span>
                                <span className="text-xl font-bold text-blue-600">{formatarMoeda(valorBase)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <label className="text-sm font-medium text-gray-700">Qtd:</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={quantidade || ''}
                                    onChange={(e) => handleQuantidadeChange(servico.id, parseInt(e.target.value) || 0)}
                                    className="w-24"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">Subtotal</p>
                                  <p className={`text-xl font-bold ${subtotal > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {formatarMoeda(subtotal)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {servicosPorCategoria[abaAtiva].servicos.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <List className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium">Nenhum serviço disponível nesta categoria.</p>
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          <Card variant="bordered" className="mt-8 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo dos Serviços</h3>
            {servicosPorCategoria.map(categoria => {
              const total = totaisPorCategoria.get(categoria.key) || 0;
              if (total === 0) return null;
              return (
                <div key={categoria.key} className="flex justify-between items-center mb-2 text-sm">
                  <span className="font-medium text-gray-700 capitalize">{categoria.displayName}:</span>
                  <span className="font-semibold text-gray-900">{formatarMoeda(total)}</span>
                </div>
              );
            })}

            {valorMensalidade > 0 && (
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                <span className="font-medium text-green-700">Mensalidade Automática:</span>
                <span className="font-semibold text-green-700">{formatarMoeda(valorMensalidade)}</span>
              </div>
            )}

            <div className="border-t border-gray-300 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-gray-900">TOTAL GERAL:</span>
                <span className="text-2xl font-bold text-blue-600">{formatarMoeda(totalGeral)}</span>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Rodapé Fixo */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {/* Status do Salvamento */}
            {salvando && (
              <div className="flex items-center text-blue-600 text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Salvando...</span>
              </div>
            )}
            {ultimoSalvamento && !salvando && (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Salvo {formatarHora(ultimoSalvamento)}</span>
              </div>
            )}
            <span className="text-sm text-gray-600 hidden md:block">Total: <strong className="text-lg text-blue-600">{formatarMoeda(totalGeral)}</strong></span>
          </div>

          <div className="flex space-x-3">
            <Button variant="secondary" onClick={onVoltar}>Anterior</Button>
            <Button
              variant="primary"
              onClick={handleProximo}
              disabled={!podeProximo}
              rightIcon={!podeProximo ? <AlertCircle className="w-4 h-4" /> : undefined}
            >
              Próximo Passo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};