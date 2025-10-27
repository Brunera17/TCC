import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Clock,
  Eye,
  Download
} from 'lucide-react';
import { apiService } from '../lib/api'; // ✅ CORRIGIDO
import { LoadingSpinner, StatusBadge } from '../components/common';
import { 
  Passo1SelecionarCliente, 
  Passo2ConfiguracoesTributarias, 
  Passo3SelecaoServicos, 
  Passo4RevisaoProposta, 
  Passo5FinalizacaoProposta 
} from '../propostas/passos'; // ✅ Corrigido - é na pasta propostas, não components
import { ModalEdicaoProposta } from '../components/modals/ModalEdicaoProposta';
import { ModalExclusaoProposta } from '../components/modals/ModalExclusaoProposta';
import { ModalEdicaoCompleta } from '../components/modals/ModalEdicaoCompleta';
import { HistoricoLogs } from '../propostas/HistoricoLogs'; // ✅ Corrigido
import { PropostaPDFViewer } from '../propostas/PropostaPDFViewer'; // ✅ Corrigido
import { useToast } from '../context/ToastContext';
import type { Proposta, PropostaResponse, TipoAtividade } from '../types';
import { usePropostaDataReset } from '../hooks/usePropostaDataReset';
import { useAuth } from '../context/AuthContext';

// Interfaces removidas para evitar warnings de unused vars
// As interfaces estão definidas nos componentes específicos

interface ConfiguracoesTributarias {
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id: number | null; // ⚠️ Pode ser null se não houver faixas
  valor_mensalidade?: number; // ⚠️ NOVO: Valor da mensalidade automática
}

interface ServicoSelecionado {
  servico_id: number;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  extras?: Record<string, any>;
}

// ⚠️ ESTADO PRINCIPAL CORRIGIDO
interface PropostaCompleta {
  // Dados do Cliente (Passo 1)
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

  // Configurações Tributárias (Passo 2)
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
  valor_mensalidade?: number; // ⚠️ NOVO: Valor da mensalidade automática
  mensalidade_encontrada?: boolean; // ✅ CORREÇÃO: Status da mensalidade

  // Serviços (Passo 3)
  servicosSelecionados: ServicoSelecionado[];

  // Desconto e valores (Passo 4)
  percentualDesconto?: number;
  valorDesconto?: number;
  totalFinal?: number;
  requerAprovacao?: boolean;
  observacoes?: string;

  // ⚠️ NOVO: ID da proposta criada no Passo 3
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
  // ✅ CORREÇÃO: Adicionar campos de mensalidade
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

export const PropostasPage: React.FC<PropostasPageProps> = ({ openModalOnLoad = false, propostaId }) => {
  // ✅ NOVO: Hook para reset automático de dados
  const { limparTodosDadosProposta, verificarDadosExistentes } = usePropostaDataReset();

  // ✅ NOVO: Hook para autenticação
  const { user } = useAuth();

  // ✅ NOVO: Hook para notificações toast
  const { showSuccess, showError } = useToast();

  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [filteredPropostas, setFilteredPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  // ⚠️ ESTADO PRINCIPAL CORRIGIDO
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

  // Estados para controle de passos
  const [currentStep, setCurrentStep] = useState(0); // 0: Lista, 1: Passo1, 2: Passo2, 3: Passo3, 4: Passo4
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [tipoAtividade, setTipoAtividade] = useState<TipoAtividade | null>(null);
  const [configTributarias, setConfigTributarias] = useState<ConfiguracoesTributarias | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);
  const [dadosPropostaCompleta, setDadosPropostaCompleta] = useState<DadosPropostaCompleta | null>(null);

  // Estados para modais de edição e exclusão
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false);
  const [modalExclusaoOpen, setModalExclusaoOpen] = useState(false);
  const [modalEdicaoCompletaOpen, setModalEdicaoCompletaOpen] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState<Proposta | null>(null);

  // Estado para modal de histórico
  const [modalHistorico, setModalHistorico] = useState({
    isOpen: false,
    propostaId: 0
  });

  // Estados para PDF
  const [modalPDF, setModalPDF] = useState({
    isOpen: false,
    propostaId: 0
  });
  const [gerandoPDF, setGerandoPDF] = useState<number | null>(null);

  // Estado para todos os serviços
  const [todosServicos, setTodosServicos] = useState<any[]>([]);

  // ✅ CORREÇÃO: useEffect para lidar com propostaId da notificação com limpeza automática
  useEffect(() => {
    if (propostaId) {
      // Buscar a proposta específica e abrir modal de edição
      const proposta = propostas.find(p => p.id === propostaId);
      if (proposta) {
        setPropostaSelecionada(proposta);
        setModalEdicaoCompletaOpen(true);
      }
    } else {
      // ✅ NOVO: Limpeza automática quando propostaId é undefined
      setPropostaSelecionada(null);
      setModalEdicaoCompletaOpen(false);
    }
  }, [propostaId, propostas]);

  // ✅ NOVO: Cleanup quando componente é desmontado
  useEffect(() => {
    return () => {
      // Limpar estado quando componente é desmontado
      setPropostaSelecionada(null);
      setModalEdicaoCompletaOpen(false);
    };
  }, []);

  const fetchTodosServicos = async () => {
    try {
      const servicosResponse = await apiService.getServicos({ ativo: true, per_page: 1000 });
      const servicos = servicosResponse?.data || [];
      setTodosServicos(servicos);
      console.log('✅ Todos os serviços carregados:', servicos.length);
    } catch (error) {
      console.error('❌ Erro ao carregar todos os serviços:', error);
      setTodosServicos([]);
    }
  };

  const fetchPropostas = async (page = 1, search = '') => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Carregando propostas...', { page, search });

      const response = await apiService.getPropostas({
        page,
        per_page: 20,
        search: search.trim() || undefined
      });

      console.log('📊 Resposta da API:', response);

      // ⚠️ CORRIGIDO: Verificar estrutura da resposta
      const items = response.data || [];
      const pages = Math.ceil(response.total / response.per_page) || 1;
      const total = response.total || 0;

      console.log(`✅ Propostas carregadas: ${items.length} de ${total} (página ${page} de ${pages})`);

      setPropostas(items);
      setFilteredPropostas(items);
      setTotalPages(pages);

      // ⚠️ NOVO: Log detalhado se não houver propostas
      if (items.length === 0) {
        console.log('⚠️  Nenhuma proposta encontrada no banco de dados');
        console.log('💡 Verifique se há propostas cadastradas ou se o banco está acessível');
      }

    } catch (err: unknown) {
      console.error('❌ Erro ao carregar propostas:', err);

      const errorMessage = (err as Error)?.message || '';

      // ⚠️ MELHORADO: Tratamento de erros mais específico
      if (errorMessage.includes('401') || errorMessage.includes('UNAUTHORIZED')) {
        setError('Erro de autenticação. Faça login novamente.');
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Servidor não disponível. Verifique se o backend está rodando.');
      } else if (errorMessage.includes('404')) {
        setError('Endpoint não encontrado. Verifique a configuração da API.');
      } else {
        setError(`Erro ao carregar propostas: ${errorMessage}`);
      }

      // Sem propostas disponíveis
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

  // ✅ NOVO: Reset automático quando volta para lista principal
  useEffect(() => {
    if (currentStep === 0) {
      console.log('🔄 [PropostasPage] Voltou para lista principal - verificando dados salvos...');

      const temDadosSalvos = verificarDadosExistentes();
      if (temDadosSalvos) {
        console.log('🧹 [PropostasPage] Dados encontrados - iniciando limpeza automática...');
        const itensRemovidos = limparTodosDadosProposta();

        if (itensRemovidos > 0) {
          console.log(`✅ [PropostasPage] Reset automático concluído! ${itensRemovidos} itens removidos.`);
        } else {
          console.log('ℹ️ [PropostasPage] Nenhum dado para limpar.');
        }
      } else {
        console.log('ℹ️ [PropostasPage] Nenhum dado salvo encontrado.');
      }
    }
  }, [currentStep, limparTodosDadosProposta, verificarDadosExistentes]);

  // Carregar todos os serviços quando o componente montar
  useEffect(() => {
    fetchTodosServicos();
  }, []);

  // Filtrar propostas baseado no termo de busca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPropostas(propostas);
    } else {
      const filtered = propostas.filter(proposta =>
        proposta.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposta.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposta.observacoes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposta.cliente?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proposta.funcionario_responsavel?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPropostas(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, propostas]);

  // Abrir modal de nova proposta automaticamente se openModalOnLoad for true
  useEffect(() => {
    if (openModalOnLoad) {
      handleNovaPropostaClick();
    }
  }, [openModalOnLoad]);

  const handleNovaPropostaClick = () => {
    console.log('🔄 [PropostasPage] Iniciando nova proposta - limpando dados anteriores...');

    // ✅ NOVO: Limpar dados salvos antes de iniciar nova proposta
    const itensRemovidos = limparTodosDadosProposta();
    if (itensRemovidos > 0) {
      console.log(`🧹 [PropostasPage] Dados anteriores limpos: ${itensRemovidos} itens removidos`);
    }

    setCurrentStep(1);
    // ⚠️ RESETAR: Estado principal da proposta
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

    console.log('✅ [PropostasPage] Nova proposta iniciada com estado limpo');
  };

  const handleVoltarPasso1 = () => {
    setCurrentStep(0);
    setSelectedClienteId(null);
    setConfigTributarias(null);
    setTipoAtividade(null);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
  };

  // ⚠️ CORRIGIDO: Função onProximo do Passo 1 com tratamento robusto de erros
  const handleProximoPasso1 = (clienteId: number) => {
    // ⚠️ CAPTURAR: Dados completos do cliente, não apenas ID
    const buscarClienteCompleto = async () => {
      try {
        console.log(`🔍 Buscando cliente ID: ${clienteId}`);

        // Validação básica do ID
        if (!clienteId || clienteId <= 0) {
          throw new Error('ID do cliente inválido');
        }

        console.log('🧪 Testando conexão com API antes de buscar cliente...');
        
        // ✅ CORREÇÃO: Tentar buscar cliente com tratamento específico para 404
        let cliente;
        try {
          cliente = await apiService.getCliente(clienteId);
        } catch (apiError: unknown) {
          console.error('🔍 Erro específico da API:', apiError);
          
          const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
          
          // Se for 404, o cliente não existe
          if (errorMessage?.includes('404') || errorMessage?.includes('NOT FOUND')) {
            throw new Error(`Cliente com ID ${clienteId} não existe no sistema`);
          }
          
          // Para outros erros, repassar
          throw apiError;
        }

        // Validação dos dados retornados
        if (!cliente || !cliente.id) {
          throw new Error('Cliente não encontrado na resposta da API');
        }

        // Validação de campos obrigatórios
        if (!cliente.nome || !cliente.cpf) {
          console.warn('⚠️ Cliente com dados incompletos:', cliente);
        }

        console.log('✅ Cliente encontrado:', cliente);

        setDadosProposta(prev => ({
          ...prev,
          cliente: cliente,
          clienteId: clienteId
        }));
        setSelectedClienteId(clienteId);
        setCurrentStep(2);

      } catch (error: any) {
        console.error('❌ Erro ao buscar cliente:', error);

        // Determinar tipo de erro e mensagem apropriada
        let errorMessage = 'Erro desconhecido ao carregar cliente';
        let shouldProceed = false;

        if (error.message?.includes('404') || error.message?.includes('não encontrado')) {
          errorMessage = `Cliente ID ${clienteId} não encontrado`;
        } else if (error.message?.includes('401') || error.message?.includes('UNAUTHORIZED')) {
          errorMessage = 'Erro de autenticação. Faça login novamente.';
        } else if (error.message?.includes('403') || error.message?.includes('FORBIDDEN')) {
          errorMessage = 'Sem permissão para acessar este cliente';
        } else if (error.message?.includes('500') || error.message?.includes('INTERNAL')) {
          errorMessage = 'Erro interno do servidor. Tente novamente.';
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
          shouldProceed = true; // Permitir continuar com dados mockados
        } else if (error.message?.includes('ID do cliente inválido')) {
          errorMessage = 'ID do cliente inválido';
        }

        // Mostrar erro para o usuário
        showError('Erro ao Carregar Dados', errorMessage);

        // Se for erro de rede, permitir continuar com dados básicos
        if (shouldProceed) {
          console.log('🔄 Continuando com dados básicos devido a erro de rede');
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

  const handleVoltarPasso3 = () => {
    setCurrentStep(2);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
  };

  // ⚠️ CORRIGIDO: Função onProximo do Passo 3 - Criar proposta como RASCUNHO
  const handleProximoPasso3 = async (dadosCompletos: any) => {
    // ✅ CORREÇÃO: Extrair serviços do objeto dadosCompletos
    const servicos = dadosCompletos.servicos || [];

    console.log('🔄 Passo 3 - Dados recebidos:', {
      dadosCompletos,
      servicos,
      tipoServicos: typeof servicos,
      isArray: Array.isArray(servicos)
    });

    setServicosSelecionados(servicos);

    // ⚠️ ATUALIZAR: Estado principal com serviços selecionados
    setDadosProposta(prev => ({
      ...prev,
      servicosSelecionados: servicos
    }));

    // Preparar dados completos para o Passo 4 usando dados reais
    if (dadosProposta.cliente && dadosProposta.tipoAtividade && dadosProposta.regimeTributario) {
      // ✅ CORREÇÃO: Calcular valores ANTES de usar nas interfaces
      const valorServicos = Array.isArray(servicos) ? servicos.reduce((total, servico) => total + servico.subtotal, 0) : 0;
      const valorMensalidade = dadosProposta.valor_mensalidade || 0;
      const valorTotal = valorServicos + valorMensalidade;

      console.log('💰 Preparação dos dados - Cálculo do total:', {
        valorServicos,
        valorMensalidade,
        valorTotal
      });

      const dadosCompletos: DadosPropostaCompleta = {
        cliente: {
          // ✅ CORREÇÃO: Incluir TODOS os dados do cliente, incluindo entidades jurídicas e detecção do backend
          ...dadosProposta.cliente,
          // Garantir que os campos essenciais existam
          id: dadosProposta.cliente.id,
          nome: dadosProposta.cliente.nome,
          cpf: dadosProposta.cliente.cpf,
          email: dadosProposta.cliente.email,
          abertura_empresa: dadosProposta.cliente.abertura_empresa,
          // ✅ NOVO: Incluir campos de detecção do backend
          tipo_cliente: dadosProposta.cliente.tipo_cliente,
          is_pessoa_juridica: dadosProposta.cliente.is_pessoa_juridica,
          // ✅ NOVO: Incluir entidades jurídicas
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
        // ✅ CORREÇÃO: Incluir dados de mensalidade
        valor_mensalidade: valorMensalidade,
        mensalidade_encontrada: dadosProposta.mensalidade_encontrada || false, // ✅ CORREÇÃO: Usar status real da mensalidade
        total_servicos: valorServicos,
        total_geral: valorTotal
      };

      // ⚠️ NOVO: Criar proposta como RASCUNHO no Passo 3
      try {
        console.log('🔄 Criando proposta como RASCUNHO no Passo 3...');

        console.log('💰 Criação da proposta - Cálculo do total:', {
          valorServicos,
          valorMensalidade,
          valorTotal
        });

        const dadosPropostaAPI = {
          cliente_id: dadosProposta.cliente.id,
          tipo_atividade_id: dadosProposta.tipoAtividade.id,
          regime_tributario_id: dadosProposta.regimeTributario.id,
          faixa_faturamento_id: dadosProposta.faixaFaturamento?.id,
          valor_total: valorTotal,
          valor_mensalidade: valorMensalidade, // ✅ CORREÇÃO: Incluir mensalidade
          percentual_desconto: 0, // Sem desconto no rascunho
          valor_desconto: 0,
          requer_aprovacao: false,
          observacoes: null,
          status: 'RASCUNHO', // ⚠️ Status explícito como RASCUNHO
          itens: servicos.map(servico => ({
            servico_id: servico.servico_id,
            quantidade: servico.quantidade,
            valor_unitario: servico.valor_unitario,
            valor_total: servico.subtotal,
            descricao_personalizada: undefined
          }))
        };

        const propostaCriada = await apiService.createProposta(dadosPropostaAPI);
        console.log('✅ Proposta criada como RASCUNHO:', propostaCriada);

        // ⚠️ NOVO: Armazenar ID da proposta criada para atualização no Passo 4
        setDadosProposta(prev => ({
          ...prev,
          propostaId: propostaCriada.id,
          propostaNumero: propostaCriada.numero
        }));

        setDadosPropostaCompleta(dadosCompletos);
        setCurrentStep(4);
        console.log('Indo para Passo 4 - Revisão da Proposta com dados reais');
      } catch (error) {
        console.error('❌ Erro ao criar proposta como rascunho:', error);
        showError('Erro ao Criar Proposta', 'Erro ao criar proposta: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    } else {
      console.error('Dados incompletos para Passo 4:', dadosProposta);
      showError('Dados Incompletos', 'Erro: Dados incompletos para prosseguir');
    }
  };

  // ⚠️ CORRIGIDO: Função onProximo do Passo 2
  const handleProximoPasso2 = (dados: ConfiguracoesTributarias) => {
    setConfigTributarias(dados);

    // ⚠️ BUSCAR: Dados completos dos objetos selecionados
    const buscarDadosCompletos = async () => {
      try {
        // ✅ CORREÇÃO: Buscar tipo de atividade com tratamento de erro 403
        let tipos: TipoAtividade[] = [];
        let tipoEncontrado: TipoAtividade | null = null;
        
        try {
          console.log('🔍 Buscando tipos de atividade...');
          const responseTipos = await apiService.getTiposAtividade({ ativo: true });
          tipos = responseTipos.data || [];
          tipoEncontrado = tipos.find((t: TipoAtividade) => t.id === dados.tipo_atividade_id) || null;
          console.log('✅ Tipos de atividade carregados:', tipos.length);
        } catch (error: any) {
          console.warn('⚠️ Erro ao buscar tipos de atividade:', error.message);
          
          // Se for 403, usar dados básicos do tipo
          if (error.message.includes('403')) {
            console.log('💡 Usando dados básicos do tipo de atividade devido a permissões');
            tipoEncontrado = {
              id: dados.tipo_atividade_id,
              codigo: `TIPO_${dados.tipo_atividade_id}`,
              nome: `Tipo de Atividade ${dados.tipo_atividade_id}`,
              aplicavel_pf: true,
              aplicavel_pj: true,
              ativo: true
            };
          } else {
            throw error; // Re-throw se não for erro de permissão
          }
        }

        // Buscar regime tributário completo
        const responseRegimes = await apiService.getRegimesTributarios({ ativo: true });
        const regimes = responseRegimes.data || [];
        const regimeEncontrado = regimes.find((r: any) => r.id === dados.regime_tributario_id);

        // Buscar faixa de faturamento se houver
        let faixaEncontrada = null;
        if (dados.faixa_faturamento_id) {
          const responseFaixas = await apiService.getFaixasFaturamento({ regime_tributario_id: dados.regime_tributario_id });
          const faixas = responseFaixas.items || responseFaixas || [];
          faixaEncontrada = faixas.find((f: any) => f.id === dados.faixa_faturamento_id);
        }

        if (tipoEncontrado && regimeEncontrado) {
          // ⚠️ ATUALIZAR: Estado principal com dados completos
          setDadosProposta(prev => ({
            ...prev,
            tipoAtividade: tipoEncontrado,
            regimeTributario: regimeEncontrado,
            faixaFaturamento: faixaEncontrada,
            tipo_atividade_id: dados.tipo_atividade_id,
            regime_tributario_id: dados.regime_tributario_id,
            faixa_faturamento_id: dados.faixa_faturamento_id || undefined,
            valor_mensalidade: dados.valor_mensalidade || 0, // ⚠️ NOVO: Incluir mensalidade
            mensalidade_encontrada: dados.mensalidade_encontrada || false // ✅ CORREÇÃO: Incluir status da mensalidade
          }));

          // ⚠️ CORREÇÃO: Todos os tipos de atividade vão para Passo 3 (seleção de serviços)
          setTipoAtividade(tipoEncontrado);
          setCurrentStep(3);
          console.log('Indo para Passo 3 - Seleção de Serviços');
        } else {
          console.error('Dados não encontrados');
          showError('Dados Não Encontrados', 'Erro: Dados não encontrados');
        }
      } catch (error) {
        console.error('Erro ao buscar dados completos:', error);
        // Em caso de erro, assumir que é aplicável para PJ e ir para Passo 3
        setCurrentStep(3);
      }
    };

    buscarDadosCompletos();
  };

  const handleVoltarPasso4 = () => {
    console.log('🔄 handleVoltarPasso4 chamado - voltando para Passo 3');
    setCurrentStep(3); // ✅ DEVE voltar para Passo 3 (seleção de serviços)

    // ✅ NÃO limpar dados para manter a navegação suave
    // setDadosPropostaCompleta(null); // ❌ NÃO fazer isso
  };

  const handleProximoPasso4 = async (dadosComDesconto: PropostaComDesconto) => {
    console.log('Dados da proposta com desconto:', dadosComDesconto);

    // ⚠️ ATUALIZAR: Estado principal com dados completos incluindo desconto
    setDadosProposta(prev => ({
      ...prev,
      percentualDesconto: dadosComDesconto.percentualDesconto,
      valorDesconto: dadosComDesconto.valorDesconto,
      totalFinal: dadosComDesconto.totalFinal,
      requerAprovacao: dadosComDesconto.requerAprovacao,
      observacoes: dadosComDesconto.observacoes
    }));

    // ⚠️ SIMPLIFICADO: A atualização da proposta já foi feita no Passo4RevisaoProposta
    console.log('✅ Proposta já foi atualizada no Passo 4, indo para Passo 5');
    setCurrentStep(5);
  };

  const handleVoltarPasso5 = () => {
    setCurrentStep(4);
  };

  const handleFinalizadoPasso5 = (propostaFinalizada: any) => {
    console.log('Proposta finalizada:', propostaFinalizada);
    setCurrentStep(0);
    setSelectedClienteId(null);
    setConfigTributarias(null);
    setTipoAtividade(null);
    setServicosSelecionados([]);
    setDadosPropostaCompleta(null);
    // ⚠️ RESETAR: Estado principal da proposta
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

  // Funções para manipulação de edição e exclusão
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditarProposta = (proposta: Proposta) => {
    setPropostaSelecionada(proposta);
    setModalEdicaoOpen(true);
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

  // Funções para manipulação de PDF
  const handleGerarPDF = async (proposta: Proposta) => {
    setGerandoPDF(proposta.id);

    try {
      await apiService.gerarPDFProposta(proposta.id);
      // Recarregar propostas para atualizar status
      await fetchPropostas(currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
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
      console.error('Erro ao baixar PDF:', error);
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

      // Mostrar mensagem de sucesso com informações adicionais
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

  // RENDERIZAÇÃO CONDICIONAL BASEADA NO PASSO ATUAL
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
        valorMensalidade={dadosProposta.valor_mensalidade || 0} // ⚠️ NOVO: Passar mensalidade
        onVoltar={handleVoltarPasso3}
        onProximo={handleProximoPasso3}
      />
    );
  }

  if (currentStep === 4 && dadosPropostaCompleta) {
    return (
      <Passo4RevisaoProposta
        dadosProposta={dadosPropostaCompleta as any}
        propostaId={dadosProposta.propostaId} // ⚠️ NOVO: Passar o ID da proposta criada no Passo 3
        propostaNumero={dadosProposta.propostaNumero} // ⚠️ NOVO: Passar o número da proposta
        onVoltar={handleVoltarPasso4}
        onProximo={handleProximoPasso4 as any}
        todosServicos={todosServicos}
      />
    );
  }

  if (currentStep === 5 && dadosProposta.cliente && dadosProposta.tipoAtividade) {
    // ⚠️ PREPARAR: Dados completos para o Passo 5
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

    console.log('Dados completos para Passo 5:', dadosCompletosPasso5);

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
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString(),
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

  // PÁGINA NORMAL DE PROPOSTAS
  return (
    <div>
      {/* Header da Página */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Propostas</h1>
        <p className="text-sm text-gray-500">Crie e gerencie propostas contábeis para seus clientes</p>
      </div>

      {/* Erro */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Barra de Ações */}
      <div className="mb-6 flex items-center justify-between">
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
        <div className="flex items-center space-x-3">
          <button
            onClick={handleNovaPropostaClick}
            className="bg-custom-blue text-white px-4 py-2 rounded-lg hover:bg-custom-blue-light transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      {/* Tabela de Propostas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-gray-500">Carregando propostas...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPropostas.map((proposta) => (
                    <tr key={proposta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {proposta.numero || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {proposta.cliente?.nome || `Cliente ID: ${proposta.cliente_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        R$ {proposta.valor_total ? proposta.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={proposta.status}
                          size="sm"
                          showIcon={true}
                          showTooltip={true}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {proposta.created_at ? new Date(proposta.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {proposta.funcionario_responsavel?.nome || (proposta.funcionario_responsavel_id ? `Funcionário ID: ${proposta.funcionario_responsavel_id}` : 'Não atribuído')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditarPropostaCompleta(proposta)}
                            className="text-custom-blue hover:text-custom-blue-light transition-colors"
                            title="Editar proposta completa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Botão de histórico */}
                          <button
                            onClick={() => handleVerHistorico(proposta)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Ver histórico de alterações"
                          >
                            <Clock className="w-4 h-4" />
                          </button>

                          {/* Botões de PDF */}
                          {proposta.pdf_gerado ? (
                            <>
                              <button
                                onClick={() => handleVisualizarPDF(proposta)}
                                className="text-green-600 hover:text-green-900 transition-colors"
                                title="Visualizar PDF"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(proposta)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGerarPDF(proposta)}
                              disabled={gerandoPDF === proposta.id}
                              className={`transition-colors ${gerandoPDF === proposta.id
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-orange-600 hover:text-orange-900'
                                }`}
                              title="Gerar PDF"
                            >
                              {gerandoPDF === proposta.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleExcluirProposta(proposta)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Excluir proposta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Estado Vazio */}
            {filteredPropostas.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {searchTerm ? (
                  <>
                    <p className="text-gray-500">Nenhuma proposta encontrada para "{searchTerm}"</p>
                    <p className="text-sm text-gray-400 mt-1">Tente buscar por número, cliente, funcionário, status ou observações</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500">Nenhuma proposta encontrada</p>
                    <p className="text-sm text-gray-400 mt-1">Comece criando sua primeira proposta</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="px-3 py-1">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modais de Edição e Exclusão */}
      <ModalEdicaoProposta
        proposta={propostaSelecionada}
        isOpen={modalEdicaoOpen}
        onClose={() => setModalEdicaoOpen(false)}
        onSave={handleSalvarEdicao}
      />

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
    </div>
  );
};
