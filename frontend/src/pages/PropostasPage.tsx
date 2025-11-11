import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Clock,
  Eye,
  Download,
  Loader2,
  Settings // 1. Adicionado Loader2 para o botão de PDF
} from 'lucide-react';
import { apiService } from '../lib/api';
import { LoadingSpinner, StatusBadge } from '../components/common';
import {
  PageHeader,
  PageLayout,
  DataTable,
  StateHandler,
  Pagination,
  Card,
  IconButton,
  type Column
} from '../components/ui';
import { Button } from '../components/forms'; // 3. Importar Button para o emptyState
import {
  Passo1SelecionarCliente,
  Passo2ConfiguracoesTributarias,
  Passo3SelecaoServicos,
  Passo4RevisaoProposta,
  Passo5FinalizacaoProposta
} from '../propostas/passos';
import { ModalExclusaoProposta } from '../components/modals/ModalExclusaoProposta';
import { ModalEdicaoCompleta } from '../components/modals/ModalEdicaoCompleta';
import { HistoricoLogs } from '../propostas/HistoricoLogs';
import { PropostaPDFViewer } from '../propostas/PropostaPDFViewer';
import { useToast } from '../context/ToastContext';
import type { Proposta, PropostaResponse, Servico } from '../types';
import { usePropostaDataReset } from '../hooks/usePropostaDataReset';
import { useAuth } from '../context/AuthContext';

// ... (Interfaces locais não precisam ser alteradas) ...
interface ConfiguracoesTributarias {
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id: number | null;
  valor_mensalidade?: number;
  mensalidade_encontrada?: boolean;
}

interface ServicoSelecionado {
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  extras?: Record<string, any>;
}

interface PropostaCompleta {
  cliente: {
    id: number;
    nome: string;
    cpf: string;
    email: string;
    abertura_empresa: boolean;
    ativo: boolean;
    entidades_juridicas?: any[];
  } | null;
  clienteId: number;
  tipoAtividade: {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
    ativo: boolean;
  } | null;
  regimeTributario: {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
    requer_definicoes_fiscais: boolean;
    ativo: boolean;
  } | null;
  faixaFaturamento?: {
    id: number;
    nome: string;
    valor_inicial: number;
    valor_final?: number;
    aliquota: number;
    regime_tributario_id: number;
    ativo: boolean;
  } | null;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_mensalidade?: number;
  mensalidade_encontrada?: boolean;
  servicosSelecionados: ServicoSelecionado[];
  percentualDesconto?: number;
  valorDesconto?: number;
  totalFinal?: number;
  requerAprovacao?: boolean;
  observacoes?: string;
  propostaId?: number;
  propostaNumero?: string;
}

interface DadosPropostaCompleta {
  cliente: {
    id: number;
    nome: string;
    cpf: string;
    email: string;
    abertura_empresa: boolean;
  };
  tipoAtividade: {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
  };
  regimeTributario: {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
    requer_definicoes_fiscais: boolean;
  };
  faixaFaturamento?: {
    id: number;
    nome: string;
    valor_inicial: number;
    valor_final?: number;
    aliquota: number;
    regime_tributario_id: number;
  };
  servicosSelecionados: ServicoSelecionado[];
  valor_mensalidade?: number;
  mensalidade_encontrada?: boolean;
  total_servicos?: number;
  total_geral?: number;
}

interface PropostaComDesconto {
  cliente: {
    id: number;
    nome: string;
    cpf: string;
    email: string;
    abertura_empresa: boolean;
  };
  tipoAtividade: {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
  };
  regimeTributario: {
    id: number;
    codigo: string;
    nome: string;
    aplicavel_pf: boolean;
    aplicavel_pj: boolean;
    requer_definicoes_fiscais: boolean;
  };
  faixaFaturamento?: {
    id: number;
    nome: string;
    valor_inicial: number;
    valor_final?: number;
    aliquota: number;
    regime_tributario_id: number;
  };
  servicosSelecionados: ServicoSelecionado[];
  percentualDesconto: number;
  valorDesconto: number;
  totalFinal: number;
  requerAprovacao: boolean;
  observacoes?: string;
}

interface TipoAtividade {
  id: number;
  codigo: string;
  nome: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
}

interface PropostasPageProps {
  openModalOnLoad?: boolean;
  propostaId?: number;
}

// 4. Helper de formatação de moeda (necessário para a coluna)
const formatarMoeda = (valor: number | null | undefined): string => {
  if (valor === null || valor === undefined) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const PropostasPage: React.FC<PropostasPageProps> = ({ openModalOnLoad = false, propostaId }) => {
  // ... (Hooks existentes - usePropostaDataReset, useAuth, useToast) ...
  const { limparTodosDadosProposta, verificarDadosExistentes } = usePropostaDataReset();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [filteredPropostas, setFilteredPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  // ... (Estados dos passos 1-5 e dados da proposta - permanecem iguais) ...
  const [dadosProposta, setDadosProposta] = useState<PropostaCompleta>({
    cliente: null,
    clienteId: 0,
    tipoAtividade: null,
    regimeTributario: null,
    faixaFaturamento: null,
    tipo_atividade_id: 0,
    regime_tributario_id: 0,
    faixa_faturamento_id: undefined,
    servicosSelecionados: []
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividade | null>(null);
  const [configTributarias, setConfigTributarias] = useState<ConfiguracoesTributarias | null>(null);
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);
  const [dadosPropostaCompleta, setDadosPropostaCompleta] = useState<DadosPropostaCompleta | null>(null);

  // ... (Estados dos modais - permanecem iguais) ...
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);
  const [modalEdicaoCompletaOpen, setModalEdicaoCompletaOpen] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState<Proposta | null>(null);
  const [modalHistorico, setModalHistorico] = useState({
    isOpen: false,
    propostaId: 0
  });
  const [modalPDF, setModalPDF] = useState({
    isOpen: false,
    propostaId: 0
  });
  const [gerandoPDF, setGerandoPDF] = useState<number | null>(null);
  const [todosServicos, setTodosServicos] = useState<Servico[]>([]);

  // ... (Todos os useEffects e funções de handle (fetchPropostas, handleNovaPropostaClick, etc.) permanecem iguais) ...
  // ... (A lógica interna deles não muda, apenas a renderização da lista) ...
  useEffect(() => {
    if (propostaId) {
      const proposta = propostas.find(p => p.id === propostaId);
      if (proposta) {
        setPropostaSelecionada(proposta);
        setModalEdicaoCompletaOpen(true);
      }
    } else {
      setPropostaSelecionada(null);
      setModalEdicaoCompletaOpen(false);
    }
  }, [propostaId, propostas]);

  useEffect(() => {
    return () => {
      setPropostaSelecionada(null);
      setModalEdicaoCompletaOpen(false);
    };
  }, []);

  const fetchTodosServicos = async () => {
    try {
      const servicosResponse = await apiService.getServicos({ ativo: true, per_page: 1000 });
      const servicos = Array.isArray(servicosResponse?.data)
        ? (servicosResponse.data as Servico[])
        : [];
      setTodosServicos(servicos);
    } catch (error) {
      console.error('❌ Erro ao carregar todos os serviços:', error);
      setTodosServicos([]);
    }
  };

  const fetchPropostas = async (page = 1, search = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getPropostas({
        page,
        per_page: 20, // 5. Ajustado para 20
        search: search.trim() || undefined
      });
      const items = response.data || [];
      const pages = Math.ceil(response.total / response.per_page) || 1;
      setPropostas(items);
      setFilteredPropostas(items);
      setTotalPages(pages);
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('UNAUTHORIZED')) {
        setError('Erro de autenticação. Faça login novamente.');
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Servidor não disponível. Verifique se o backend está rodando.');
      } else {
        setError(`Erro ao carregar propostas: ${errorMessage}`);
      }
      setPropostas([]);
      setFilteredPropostas([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 0) {
      fetchPropostas(currentPage, searchTerm);
    }
  }, [currentPage, searchTerm, currentStep]);

  useEffect(() => {
    if (currentStep === 0) {
      const temDadosSalvos = verificarDadosExistentes();
      if (temDadosSalvos) {
        limparTodosDadosProposta();
      }
    }
  }, [currentStep, limparTodosDadosProposta, verificarDadosExistentes]);

  useEffect(() => {
    fetchTodosServicos();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPropostas(propostas);
    } else {
      const filtered = propostas.filter(proposta =>
        proposta.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposta.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposta.observacoes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposta.cliente?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposta.funcionario_responsavel?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPropostas(filtered);
    }
    // 6. Resetar para página 1 ao filtrar
    setCurrentPage(1);
  }, [searchTerm, propostas]);

  useEffect(() => {
    if (openModalOnLoad) {
      handleNovaPropostaClick();
    }
  }, [openModalOnLoad]);

  const handleNovaPropostaClick = () => {
    limparTodosDadosProposta();
    setCurrentStep(1);
    setDadosProposta({
      cliente: null,
      clienteId: 0,
      tipoAtividade: null,
      regimeTributario: null,
      faixaFaturamento: null,
      tipo_atividade_id: 0,
      regime_tributario_id: 0,
      faixa_faturamento_id: undefined,
      servicosSelecionados: []
    });
    setSelectedClienteId(null);
    setConfigTributarias(null);
    setTipoAtividade(null);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
  };

  const handleVoltarPasso1 = () => {
    setCurrentStep(0);
    setSelectedClienteId(null);
    setConfigTributarias(null);
    setTipoAtividade(null);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
  };
  
  const handleProximoPasso1 = (clienteId: number) => {
    const buscarClienteCompleto = async () => {
      try {
        if (!clienteId || clienteId <= 0) {
          throw new Error('ID do cliente inválido');
        }
        let cliente;
        try {
          cliente = await apiService.getCliente(clienteId);
        } catch (apiError: unknown) {
          const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
          if (errorMessage?.includes('404') || errorMessage?.includes('NOT FOUND')) {
            throw new Error(`Cliente com ID ${clienteId} não existe no sistema`);
          }
          throw apiError;
        }
        if (!cliente || !cliente.id) {
          throw new Error('Cliente não encontrado na resposta da API');
        }
        setDadosProposta(prev => ({
          ...prev,
          cliente: cliente,
          clienteId: clienteId
        }));
        setSelectedClienteId(clienteId);
        setCurrentStep(2);
      } catch (error: any) {
        let errorMessage = 'Erro desconhecido ao carregar cliente';
        let shouldProceed = false;
        if (error.message?.includes('404') || error.message?.includes('não encontrado')) {
          errorMessage = `Cliente ID ${clienteId} não encontrado`;
        } else if (error.message?.includes('401')) {
          errorMessage = 'Erro de autenticação. Faça login novamente.';
        } else if (error.message?.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
          shouldProceed = true;
        }
        showError('Erro ao Carregar Dados', errorMessage);
        if (shouldProceed) {
          setDadosProposta(prev => ({
            ...prev,
            cliente: {
              id: clienteId,
              nome: `Cliente ID: ${clienteId}`,
              cpf: '000.000.000-00',
              email: 'cliente@exemplo.com',
              abertura_empresa: false,
              ativo: true,
              entidades_juridicas: []
            },
            clienteId: clienteId
          }));
          setSelectedClienteId(clienteId);
          setCurrentStep(2);
        }
      }
    };
    buscarClienteCompleto();
  };

  const handleVoltarPasso2 = () => {
    setCurrentStep(1);
    setConfigTributarias(null);
    setTipoAtividade(null);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
  };

  const handleProximoPasso2 = (dados: ConfiguracoesTributarias) => {
    setConfigTributarias(dados);
    const buscarDadosCompletos = async () => {
      try {
        let tipos: TipoAtividade[] = [];
        let tipoEncontrado: TipoAtividade | null = null;
        try {
          const responseTipos = await apiService.getTiposAtividade({ ativo: true });
          const tiposResponse = responseTipos?.data || responseTipos || [];
          tipos = Array.isArray(tiposResponse) ? tiposResponse : [];
          tipoEncontrado = tipos.find((t: TipoAtividade) => t.id === dados.tipo_atividade_id) || null;
        } catch (error: any) {
          if (error.message.includes('403')) {
            tipoEncontrado = {
              id: dados.tipo_atividade_id,
              codigo: `TIPO_${dados.tipo_atividade_id}`,
              nome: `Tipo de Atividade ${dados.tipo_atividade_id}`,
              aplicavel_pf: true,
              aplicavel_pj: true,
              ativo: true
            };
          } else {
            throw error;
          }
        }
        const responseRegimes = await apiService.getRegimesTributarios({ ativo: true });
        const regimesResponse = responseRegimes?.data || responseRegimes || [];
        const regimes = Array.isArray(regimesResponse) ? regimesResponse : [];
        const regimeEncontrado = regimes.find((r: any) => r.id === dados.regime_tributario_id);
        let faixaEncontrada = null;
        if (dados.faixa_faturamento_id) {
          const responseFaixas = await apiService.getFaixasFaturamento({ regime_tributario_id: dados.regime_tributario_id });
          const faixasResponse = responseFaixas?.data || responseFaixas?.items || responseFaixas || [];
          const faixas = Array.isArray(faixasResponse) ? faixasResponse : [];
          faixaEncontrada = faixas.find((f: any) => f.id === dados.faixa_faturamento_id);
        }
        if (tipoEncontrado && regimeEncontrado) {
          setDadosProposta(prev => ({
            ...prev,
            tipoAtividade: tipoEncontrado,
            regimeTributario: regimeEncontrado,
            faixaFaturamento: faixaEncontrada,
            tipo_atividade_id: dados.tipo_atividade_id,
            regime_tributario_id: dados.regime_tributario_id,
            faixa_faturamento_id: dados.faixa_faturamento_id || undefined,
            valor_mensalidade: dados.valor_mensalidade || 0,
            mensalidade_encontrada: dados.mensalidade_encontrada || false
          }));
          setTipoAtividade(tipoEncontrado);
          setCurrentStep(3);
        } else {
          showError('Dados Não Encontrados', 'Erro: Dados não encontrados');
        }
      } catch (error) {
        setCurrentStep(3);
      }
    };
    buscarDadosCompletos();
  };
  
  const handleVoltarPasso3 = () => {
    setCurrentStep(2);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
  };

  const handleProximoPasso3 = async (dadosCompletos: any) => {
    const servicos = dadosCompletos.servicos || [];
    setServicosSelecionados(servicos);
    setDadosProposta(prev => ({
      ...prev,
      servicosSelecionados: servicos
    }));
    if (dadosProposta.cliente && dadosProposta.tipoAtividade && dadosProposta.regimeTributario) {
      const valorServicos = Array.isArray(servicos) ? servicos.reduce((total, servico) => total + servico.subtotal, 0) : 0;
      const valorMensalidade = dadosProposta.valor_mensalidade || 0;
      const valorTotal = valorServicos + valorMensalidade;
      const dadosCompletos: DadosPropostaCompleta = {
        cliente: {
          ...dadosProposta.cliente,
          id: dadosProposta.cliente.id,
          nome: dadosProposta.cliente.nome,
          cpf: dadosProposta.cliente.cpf,
          email: dadosProposta.cliente.email,
          abertura_empresa: dadosProposta.cliente.abertura_empresa,
          tipo_cliente: dadosProposta.cliente.tipo_cliente,
          is_pessoa_juridica: dadosProposta.cliente.is_pessoa_juridica,
          entidades_juridicas: dadosProposta.cliente.entidades_juridicas || []
        },
        tipoAtividade: {
          id: dadosProposta.tipoAtividade.id,
          codigo: dadosProposta.tipoAtividade.codigo,
          nome: dadosProposta.tipoAtividade.nome,
          aplicavel_pf: dadosProposta.tipoAtividade.aplicavel_pf,
          aplicavel_pj: dadosProposta.tipoAtividade.aplicavel_pj
        },
        regimeTributario: {
          id: dadosProposta.regimeTributario.id,
          codigo: dadosProposta.regimeTributario.codigo,
          nome: dadosProposta.regimeTributario.nome,
          aplicavel_pf: dadosProposta.regimeTributario.aplicavel_pf,
          aplicavel_pj: dadosProposta.regimeTributario.aplicavel_pj,
          requer_definicoes_fiscais: dadosProposta.regimeTributario.requer_definicoes_fiscais
        },
        faixaFaturamento: dadosProposta.faixaFaturamento ? {
          id: dadosProposta.faixaFaturamento.id,
          nome: dadosProposta.faixaFaturamento.nome,
          valor_inicial: dadosProposta.faixaFaturamento.valor_inicial,
          valor_final: dadosProposta.faixaFaturamento.valor_final,
          aliquota: dadosProposta.faixaFaturamento.aliquota,
          regime_tributario_id: dadosProposta.faixaFaturamento.regime_tributario_id
        } : undefined,
        servicosSelecionados: servicos,
        valor_mensalidade: valorMensalidade,
        mensalidade_encontrada: dadosProposta.mensalidade_encontrada || false,
        total_servicos: valorServicos,
        total_geral: valorTotal
      };
      try {
        const dadosPropostaAPI = {
          cliente_id: dadosProposta.cliente.id,
          tipo_atividade_id: dadosProposta.tipoAtividade.id,
          regime_tributario_id: dadosProposta.regimeTributario.id,
          faixa_faturamento_id: dadosProposta.faixaFaturamento?.id,
          valor_total: valorTotal,
          valor_mensalidade: valorMensalidade,
          percentual_desconto: 0,
          valor_desconto: 0,
          requer_aprovacao: false,
          observacoes: null,
          status: 'RASCUNHO',
          itens: servicos.map(servico => ({
            servico_id: servico.servico_id,
            quantidade: servico.quantidade,
            valor_unitario: servico.valor_unitario,
            valor_total: servico.subtotal,
            descricao_personalizada: undefined
          }))
        };
        const propostaCriada = await apiService.createProposta(dadosPropostaAPI);
        setDadosProposta(prev => ({
          ...prev,
          propostaId: propostaCriada.id,
          propostaNumero: propostaCriada.numero
        }));
        setDadosPropostaCompleta(dadosCompletos);
        setCurrentStep(4);
      } catch (error) {
        showError('Erro ao Criar Proposta', 'Erro ao criar proposta: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    } else {
      showError('Dados Incompletos', 'Erro: Dados incompletos para prosseguir');
    }
  };

  const handleVoltarPasso4 = () => {
    setCurrentStep(3);
  };

  const handleProximoPasso4 = async (dadosComDesconto: PropostaComDesconto) => {
    setDadosProposta(prev => ({
      ...prev,
      percentualDesconto: dadosComDesconto.percentualDesconto,
      valorDesconto: dadosComDesconto.valorDesconto,
      totalFinal: dadosComDesconto.totalFinal,
      requerAprovacao: dadosComDesconto.requerAprovacao,
      observacoes: dadosComDesconto.observacoes
    }));
    setCurrentStep(5);
  };

  const handleVoltarPasso5 = () => {
    setCurrentStep(4);
  };

  const handleFinalizadoPasso5 = (propostaFinalizada: any) => {
    setCurrentStep(0);
    setSelectedClienteId(null);
    setConfigTributarias(null);
    setTipoAtividade(null);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
    setDadosProposta({
      cliente: null,
      clienteId: 0,
      tipoAtividade: null,
      regimeTributario: null,
      faixaFaturamento: null,
      tipo_atividade_id: 0,
      regime_tributario_id: 0,
      faixa_faturamento_id: undefined,
      servicosSelecionados: []
    });
  };

  const handleEditarPropostaCompleta = (proposta: Proposta) => {
    setPropostaSelecionada(proposta);
    setModalEdicaoCompletaOpen(true);
  };

  const handleExcluirProposta = (proposta: Proposta) => {
    setPropostaSelecionada(proposta);
    setModalExclusaoOpen(true);
  };

  const handleVerHistorico = (proposta: Proposta) => {
    setModalHistorico({ isOpen: true, propostaId: proposta.id });
  };

  const handleGerarPDF = async (proposta: Proposta) => {
    setGerandoPDF(proposta.id);
    try {
      await apiService.gerarPDFProposta(proposta.id);
      await fetchPropostas(currentPage, searchTerm);
    } catch (error) {
      showError('Erro ao Gerar PDF', 'Erro ao gerar PDF: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setGerandoPDF(null);
    }
  };

  const handleVisualizarPDF = (proposta: Proposta) => {
    setModalPDF({ isOpen: true, propostaId: proposta.id });
  };

  const handleDownloadPDF = async (proposta: Proposta) => {
    try {
      const blob = await apiService.visualizarPDFProposta(proposta.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta_${proposta.numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      showError('Erro ao Baixar PDF', 'Erro ao baixar PDF: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleSalvarEdicao = async (propostaId: number, dados: Partial<Proposta>) => {
    try {
      await apiService.updateProposta(propostaId, dados);
      await fetchPropostas(currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao atualizar proposta:', error);
      throw error;
    }
  };

  const handleSalvarEdicaoCompleta = async () => {
    try {
      await fetchPropostas(currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao atualizar proposta:', error);
    }
  };

  const handleConfirmarExclusao = async (propostaId: number, observacao?: string) => {
    try {
      const response = await apiService.deleteProposta(propostaId, observacao);
      if (response.notificacao_enviada) {
        showSuccess('Proposta Excluída', 'Proposta excluída com sucesso! Uma notificação foi enviada ao funcionário responsável.');
      } else {
        showSuccess('Proposta Excluída', 'Proposta excluída com sucesso!');
      }
      await fetchPropostas(currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      throw error;
    }
  };

  // 7. Definição das colunas para a DataTable
  const columns: Column<Proposta>[] = [
    {
      key: 'numero',
      label: 'Número',
      render: (numero) => (
        <span className="font-medium text-gray-900">{numero || 'N/A'}</span>
      )
    },
    {
      key: 'cliente',
      label: 'Cliente',
      render: (cliente, proposta) => (
        <span className="text-sm text-gray-900">
          {cliente?.nome || `Cliente ID: ${proposta.cliente_id}`}
        </span>
      )
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      render: (valor) => (
        <span className="text-sm text-gray-900 font-medium">
          {formatarMoeda(valor)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <StatusBadge
          status={status}
          size="sm"
          showIcon={true}
          showTooltip={true}
        />
      )
    },
    {
      key: 'created_at',
      label: 'Data',
      render: (data) => (
        <span className="text-sm text-gray-900">
          {data ? new Date(data).toLocaleDateString('pt-BR') : 'N/A'}
        </span>
      )
    },
    {
      key: 'funcionario_responsavel',
      label: 'Responsável',
      render: (funcionario, proposta) => (
        <span className="text-sm text-gray-900">
          {funcionario?.nome || (proposta.funcionario_responsavel_id ? `Funcionário ID: ${proposta.funcionario_responsavel_id}` : 'Não atribuído')}
        </span>
      )
    }
  ];

  // RENDERIZAÇÃO CONDICIONAL BASEADA NO PASSO ATUAL
  // ... (Lógica dos passos 1-5 permanece inalterada) ...
  if (currentStep === 1) {
    return (
      <Passo1SelecionarCliente
        onVoltar={handleVoltarPasso1}
        onProximo={handleProximoPasso1}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <Passo2ConfiguracoesTributarias
        clienteId={selectedClienteId!}
        onVoltar={handleVoltarPasso2}
        onProximo={handleProximoPasso2}
      />
    );
  }

  if (currentStep === 3 && tipoAtividade && dadosProposta.regimeTributario) {
    return (
      <Passo3SelecaoServicos
        tipoAtividade={tipoAtividade}
        regimeTributario={dadosProposta.regimeTributario}
        valorMensalidade={dadosProposta.valor_mensalidade || 0}
        onVoltar={handleVoltarPasso3}
        onProximo={handleProximoPasso3}
      />
    );
  }

  if (currentStep === 4 && dadosPropostaCompleta) {
    return (
      <Passo4RevisaoProposta
        dadosProposta={dadosPropostaCompleta as any}
        propostaId={dadosProposta.propostaId}
        propostaNumero={dadosProposta.propostaNumero}
        onVoltar={handleVoltarPasso4}
        onProximo={handleProximoPasso4 as any}
        todosServicos={todosServicos}
      />
    );
  }

  if (currentStep === 5 && dadosProposta.cliente && dadosProposta.tipoAtividade) {
    const dadosCompletosPasso5: PropostaComDesconto = {
      cliente: dadosProposta.cliente,
      tipoAtividade: dadosProposta.tipoAtividade,
      regimeTributario: dadosProposta.regimeTributario!,
      faixaFaturamento: dadosProposta.faixaFaturamento || undefined,
      servicosSelecionados: dadosProposta.servicosSelecionados,
      percentualDesconto: dadosProposta.percentualDesconto || 0,
      valorDesconto: dadosProposta.valorDesconto || 0,
      totalFinal: dadosProposta.totalFinal || 0,
      requerAprovacao: dadosProposta.requerAprovacao || false,
      observacoes: dadosProposta.observacoes
    };
    return (
      <Passo5FinalizacaoProposta
        dadosCompletos={dadosCompletosPasso5 as any}
        proposta={{
          id: dadosProposta.propostaId || 0,
          numero: dadosProposta.propostaNumero || 'NOVA',
          cliente_id: dadosCompletosPasso5.cliente.id,
          funcionario_responsavel_id: undefined,
          tipo_atividade_id: dadosCompletosPasso5.tipoAtividade.id,
          regime_tributario_id: dadosCompletosPasso5.regimeTributario.id,
          faixa_faturamento_id: dadosCompletosPasso5.faixaFaturamento ? dadosCompletosPasso5.faixaFaturamento.id : undefined,
          valor_total: dadosCompletosPasso5.totalFinal,
          status: dadosCompletosPasso5.requerAprovacao ? 'PENDENTE' : 'APROVADA',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ativo: true,
          pdf_gerado: false,
          pdf_caminho: undefined,
          pdf_data_geracao: undefined
        }}
        onVoltar={handleVoltarPasso5}
        onNovaProposta={() => handleFinalizadoPasso5({})}
      />
    );
  }

  // 8. PÁGINA NORMAL DE PROPOSTAS (Refatorada)
  return (
    <PageLayout>
      {/* Header da Página */}
      <PageHeader
        title="Propostas"
        subtitle="Crie e gerencie propostas contábeis para seus clientes"
      >
        <IconButton
          icon={Plus}
          onClick={handleNovaPropostaClick}
          label="Nova Proposta"
        />
      </PageHeader>

      {/* Barra de Ações (Busca) */}
      <Card className="p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente, funcionário, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-custom-blue focus:border-transparent w-full"
          />
        </div>
      </Card>

      {/* Gerenciador de Estado (Tabela, Loading, Vazio, Erro) */}
      <StateHandler
        loading={loading}
        error={error || undefined}
        onErrorDismiss={() => setError('')}
        isEmpty={filteredPropostas.length === 0 && !loading}
        emptyState={
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta cadastrada'}
            </h3>
            <p className="text-gray-500 mb-4 px-4">
              {searchTerm
                ? `Não encontramos propostas para "${searchTerm}". Tente buscar por número, cliente, status ou responsável.`
                : 'Comece cadastrando sua primeira proposta clicando no botão "Nova Proposta".'}
            </p>
            {!searchTerm && (
              <Button
                variant="primary"
                onClick={handleNovaPropostaClick}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Cadastrar Nova Proposta
              </Button>
            )}
          </div>
        }
      >
        {/* Tabela de Propostas */}
        <DataTable
          data={filteredPropostas}
          columns={columns}
          actions={(proposta) => (
            <div className="flex items-center justify-end space-x-2">
              <IconButton
                icon={Edit2}
                size="sm"
                variant="outline"
                onClick={() => handleEditarPropostaCompleta(proposta)}
                title="Editar proposta"
              />
              <IconButton
                icon={Clock}
                size="sm"
                variant="outline"
                onClick={() => handleVerHistorico(proposta)}
                title="Ver histórico de alterações"
              />
              {proposta.pdf_gerado ? (
                <>
                  <IconButton
                    icon={Eye}
                    size="sm"
                    variant="outline"
                    onClick={() => handleVisualizarPDF(proposta)}
                    title="Visualizar PDF"
                  />
                  <IconButton
                    icon={Download}
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(proposta)}
                    title="Download PDF"
                  />
                </>
              ) : (
                <IconButton
                  icon={gerandoPDF === proposta.id ? Loader2 : FileText}
                  size="sm"
                  variant="outline"
                  onClick={() => handleGerarPDF(proposta)}
                  disabled={gerandoPDF === proposta.id}
                  title="Gerar PDF"
                  className={gerandoPDF === proposta.id ? 'animate-spin' : ''}
                />
              )}
              <IconButton
                icon={Trash2}
                size="sm"
                variant="danger"
                onClick={() => handleExcluirProposta(proposta)}
                title="Excluir proposta"
              />
            </div>
          )}
        />

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 rounded-b-lg">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </StateHandler>

      <ModalEdicaoCompleta
        proposta={propostaSelecionada as PropostaResponse}
        isOpen={modalEdicaoCompletaOpen}
        onClose={() => setModalEdicaoCompletaOpen(false)}
        onSaved={handleSalvarEdicaoCompleta}
      />

      <ModalExclusaoProposta
        proposta={propostaSelecionada}
        funcionarioAtual={user ? { id: user.id, nome: user.nome } : null}
        isOpen={modalExclusaoOpen}
        onClose={() => setModalExclusaoOpen(false)}
        onDelete={handleConfirmarExclusao}
      />

      {/* Modal de Histórico */}
      <HistoricoLogs
        propostaId={modalHistorico.propostaId}
        isOpen={modalHistorico.isOpen}
        onClose={() => setModalHistorico({ isOpen: false, propostaId: 0 })}
      />

      {/* Modal de PDF */}
      <PropostaPDFViewer
        propostaId={modalPDF.propostaId}
        isOpen={modalPDF.isOpen}
        onClose={() => setModalPDF({ isOpen: false, propostaId: 0 })}
      />
    </PageLayout>
  );
};