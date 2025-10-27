import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building,
  Calculator,
  TrendingUp,
  Check,
  AlertCircle,
  Save,
  CheckCircle
} from 'lucide-react';
import { apiService } from '../../lib/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

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
  descricao: string;
  aplicavel_pf: boolean;
  aplicavel_pj: boolean;
  ativo: boolean;
}

interface FaixaFaturamento {
  id: number;
  regime_tributario_id: number;
  valor_inicial: number;
  valor_final: number | null;
  aliquota: number;
  ativo: boolean;
}

interface ConfiguracoesTributarias {
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id: number | null; // ⚠️ Pode ser null se não houver faixas
  valor_mensalidade?: number; // ⚠️ NOVO: Valor da mensalidade automática
}

interface Passo2Props {
  clienteId: number;
  onVoltar: () => void;
  onProximo: (dados: ConfiguracoesTributarias) => void;
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

export const Passo2ConfiguracoesTributarias: React.FC<Passo2Props> = ({
  clienteId,
  onVoltar,
  onProximo,
  dadosSalvos,
  onSalvarProgresso
}) => {
  const [abaAtiva, setAbaAtiva] = useState(0);
  const [selectedTipoAtividade, setSelectedTipoAtividade] = useState<number | null>(null);
  const [selectedRegimeTributario, setSelectedRegimeTributario] = useState<number | null>(null);
  const [selectedFaixaFaturamento, setSelectedFaixaFaturamento] = useState<number | null>(null);

  // ⚠️ NOVO: Estados para mensalidade automática
  const [valorMensalidade, setValorMensalidade] = useState<number>(0);
  const [loadingMensalidade, setLoadingMensalidade] = useState(false);
  const [mensalidadeEncontrada, setMensalidadeEncontrada] = useState(false);
  const [erroMensalidade, setErroMensalidade] = useState<string | null>(null);

  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [regimesCompativeis, setRegimesCompativeis] = useState<RegimeTributario[]>([]);
  const [faixasFaturamento, setFaixasFaturamento] = useState<FaixaFaturamento[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingRegimes, setLoadingRegimes] = useState(false);
  const [loadingFaixas, setLoadingFaixas] = useState(false);
  const [error, setError] = useState('');

  // ⚠️ NOVO: Estados para salvamento automático
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);

  // ⚠️ NOVA LÓGICA: Verificar se há faixas disponíveis
  const hasFaixasFaturamento = faixasFaturamento.length > 0;

  // ⚠️ NOVA LÓGICA: Condições para prosseguir
  const podeProximo = React.useMemo(() => {
    const temTipoAtividade = !!selectedTipoAtividade;
    const temRegimeTributario = !!selectedRegimeTributario;

    // Se não há faixas disponíveis, não precisa selecionar
    if (!hasFaixasFaturamento) {
      return temTipoAtividade && temRegimeTributario;
    }

    // Se há faixas disponíveis, precisa selecionar uma
    const temFaixaFaturamento = !!selectedFaixaFaturamento;
    return temTipoAtividade && temRegimeTributario && temFaixaFaturamento;
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, hasFaixasFaturamento]);

  // ⚠️ NOVO: Função para buscar mensalidade automática
  const buscarMensalidadeAutomatica = async (tipoAtividadeId: number, regimeTributarioId: number, faixaFaturamentoId?: number) => {
    setLoadingMensalidade(true);
    setMensalidadeEncontrada(false);
    setValorMensalidade(0);
    setErroMensalidade(null); // ✅ Limpar erros anteriores

    try {
      const params: any = {
        tipo_atividade_id: tipoAtividadeId,
        regime_tributario_id: regimeTributarioId
      };

      if (faixaFaturamentoId) {
        params.faixa_faturamento_id = faixaFaturamentoId;
      }

      console.log('🔍 Buscando mensalidade com parâmetros:', params);
      const response = await apiService.buscarMensalidadeAutomatica(params);

      // ✅ CORREÇÃO: Debug detalhado da estrutura da resposta
      console.log('📊 Resposta completa da API:', response);
      console.log('📊 Tipo da resposta:', typeof response);
      console.log('📊 response.data:', response?.data);
      console.log('📊 response.valor_mensalidade:', response?.valor_mensalidade);
      console.log('📊 response.data?.valor_mensalidade:', response?.data?.valor_mensalidade);

      // ✅ CORREÇÃO: Verificar estrutura correta da resposta
      let valorMensalidadeEncontrado = null;
      let aCombinar = false;

      if (response && typeof response === 'object') {
        // Verificar se o valor está diretamente na resposta
        if (response.valor_mensalidade !== undefined && response.valor_mensalidade !== null) {
          valorMensalidadeEncontrado = response.valor_mensalidade;
          aCombinar = response.a_combinar || false;
          console.log('✅ Valor encontrado diretamente na resposta:', valorMensalidadeEncontrado, 'a_combinar:', aCombinar);
        }
        // Verificar se o valor está em response.data
        else if (response.data && response.data.valor_mensalidade !== undefined && response.data.valor_mensalidade !== null) {
          valorMensalidadeEncontrado = response.data.valor_mensalidade;
          aCombinar = response.data.a_combinar || false;
          console.log('✅ Valor encontrado em response.data:', valorMensalidadeEncontrado, 'a_combinar:', aCombinar);
        }
        // Verificar se o valor está em response.mensalidade
        else if (response.mensalidade !== undefined && response.mensalidade !== null) {
          valorMensalidadeEncontrado = response.mensalidade;
          aCombinar = response.a_combinar || false;
          console.log('✅ Valor encontrado em response.mensalidade:', valorMensalidadeEncontrado, 'a_combinar:', aCombinar);
        }
      }

      // ✅ CORREÇÃO: Tratar "A Combinar" corretamente
      if (valorMensalidadeEncontrado !== null) {
        setValorMensalidade(valorMensalidadeEncontrado);
        setMensalidadeEncontrada(true); // Sempre true quando recebe resposta válida
        if (aCombinar || valorMensalidadeEncontrado === 0) {
          console.log('✅ Mensalidade "A Combinar" definida:', valorMensalidadeEncontrado);
          setErroMensalidade(null); // Limpar erro para "A Combinar"
        } else {
          console.log('✅ Mensalidade automática encontrada:', valorMensalidadeEncontrado);
        }
      } else {
        console.log('ℹ️ Nenhuma mensalidade encontrada para esta configuração');
        // Se não encontrou, pode ser "A Combinar" (valor 0)
        setValorMensalidade(0);
        setMensalidadeEncontrada(false);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar mensalidade automática:', error);

      // ✅ CORREÇÃO: Tratamento de erro melhorado
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Detalhes do erro:', {
        message: errorMessage,
        tipoAtividadeId,
        regimeTributarioId,
        faixaFaturamentoId,
        error
      });

      // ✅ CORREÇÃO: Para todos os casos de erro, tratar como "A Combinar" com mensalidadeEncontrada = true
      const tipoAtividade = tiposAtividade.find(t => t.id === tipoAtividadeId);
      if (tipoAtividade?.codigo === 'PF') {
        console.log('ℹ️ Pessoa Física - Valor a combinar');
        setValorMensalidade(0);
        setMensalidadeEncontrada(true); // ✅ CORREÇÃO: true para mostrar card "A Combinar"
        setErroMensalidade(null); // Não é erro para PF
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        console.log('ℹ️ Configuração não encontrada na tabela - Valor a combinar');
        setValorMensalidade(0);
        setMensalidadeEncontrada(true); // ✅ CORREÇÃO: true para mostrar card "A Combinar"
        setErroMensalidade('Configuração não encontrada - Valor será definido manualmente');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        console.log('⚠️ Erro interno do servidor - Valor a combinar');
        setValorMensalidade(0);
        setMensalidadeEncontrada(true); // ✅ CORREÇÃO: true para mostrar card "A Combinar"
        setErroMensalidade('Erro interno do servidor - Valor será definido manualmente');
      } else {
        // Para outros casos, definir como "A Combinar"
        console.log('ℹ️ Erro genérico - Valor a combinar');
        setValorMensalidade(0);
        setMensalidadeEncontrada(true); // ✅ CORREÇÃO: true para mostrar card "A Combinar"
        setErroMensalidade('Erro ao buscar mensalidade - Valor será definido manualmente');
      }
    } finally {
      setLoadingMensalidade(false);
    }
  };

  // ⚠️ NOVO: Recuperar dados salvos ao montar componente
  useEffect(() => {
    if (dadosSalvos) {
      if (dadosSalvos.tipoAtividadeId) {
        setSelectedTipoAtividade(dadosSalvos.tipoAtividadeId);
      }
      if (dadosSalvos.regimeTributarioId) {
        setSelectedRegimeTributario(dadosSalvos.regimeTributarioId);
      }
      if (dadosSalvos.faixaFaturamentoId) {
        setSelectedFaixaFaturamento(dadosSalvos.faixaFaturamentoId);
      }
      if (dadosSalvos.abaAtiva !== undefined) {
        setAbaAtiva(dadosSalvos.abaAtiva);
      }
      // ✅ CORREÇÃO: Recuperar dados da mensalidade
      if (dadosSalvos.valorMensalidade !== undefined) {
        setValorMensalidade(dadosSalvos.valorMensalidade);
      }
      if (dadosSalvos.mensalidadeEncontrada !== undefined) {
        setMensalidadeEncontrada(dadosSalvos.mensalidadeEncontrada);
      }
      if (dadosSalvos.erroMensalidade !== undefined) {
        setErroMensalidade(dadosSalvos.erroMensalidade);
      }
    }

    // Recuperar do localStorage como fallback
    const dadosBackup = localStorage.getItem('proposta_passo2_backup');
    if (dadosBackup && !dadosSalvos) {
      try {
        const dados = JSON.parse(dadosBackup);
        if (dados.tipoAtividadeId) setSelectedTipoAtividade(dados.tipoAtividadeId);
        if (dados.regimeTributarioId) setSelectedRegimeTributario(dados.regimeTributarioId);
        if (dados.faixaFaturamentoId) setSelectedFaixaFaturamento(dados.faixaFaturamentoId);
        if (dados.abaAtiva !== undefined) setAbaAtiva(dados.abaAtiva);
        // ✅ CORREÇÃO: Recuperar dados da mensalidade do backup
        if (dados.valorMensalidade !== undefined) setValorMensalidade(dados.valorMensalidade);
        if (dados.mensalidadeEncontrada !== undefined) setMensalidadeEncontrada(dados.mensalidadeEncontrada);
        if (dados.erroMensalidade !== undefined) setErroMensalidade(dados.erroMensalidade);
      } catch (error) {
        console.warn('Erro ao recuperar backup do Passo 2:', error);
      }
    }
  }, [dadosSalvos]);

  // ⚠️ NOVO: Função de salvamento automático
  const salvarProgresso = useCallback(async () => {
    if (!selectedTipoAtividade || !selectedRegimeTributario) return;

    setSalvando(true);
    setErroSalvamento(null);

    try {
      const dadosParaSalvar = {
        passo: 2,
        clienteId,
        tipoAtividadeId: selectedTipoAtividade,
        regimeTributarioId: selectedRegimeTributario,
        faixaFaturamentoId: selectedFaixaFaturamento,
        abaAtiva,
        // ✅ CORREÇÃO: Incluir dados da mensalidade no salvamento
        valorMensalidade,
        mensalidadeEncontrada,
        erroMensalidade,
        timestamp: new Date().toISOString(),
        dadosCompletos: {
          tipoAtividade: tiposAtividade.find(t => t.id === selectedTipoAtividade),
          regimeTributario: regimesCompativeis.find(r => r.id === selectedRegimeTributario),
          faixaFaturamento: faixasFaturamento.find(f => f.id === selectedFaixaFaturamento),
          // ✅ CORREÇÃO: Incluir dados da mensalidade nos dados completos
          valorMensalidade,
          mensalidadeEncontrada,
          erroMensalidade
        }
      };

      // Salvar no localStorage como backup
      localStorage.setItem('proposta_passo2_backup', JSON.stringify(dadosParaSalvar));

      // Chamar callback de salvamento se fornecido
      if (onSalvarProgresso) {
        await onSalvarProgresso(dadosParaSalvar);
      }

      setUltimoSalvamento(new Date());
      console.log('Progresso do Passo 2 salvo com sucesso');

    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      setErroSalvamento(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, abaAtiva, clienteId, tiposAtividade, regimesCompativeis, faixasFaturamento, valorMensalidade, mensalidadeEncontrada, erroMensalidade, onSalvarProgresso]);

  // ⚠️ NOVO: Salvamento automático quando dados mudam
  useEffect(() => {
    if (selectedTipoAtividade && selectedRegimeTributario) {
      const timeoutId = setTimeout(salvarProgresso, 1500); // Debounce de 1.5 segundos
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, valorMensalidade, mensalidadeEncontrada, salvarProgresso]);

  // ⚠️ NOVO: Limpar backup ao sair
  useEffect(() => {
    return () => {
      // Manter backup por 24 horas para recuperação
      const dadosBackup = localStorage.getItem('proposta_passo2_backup');
      if (dadosBackup) {
        try {
          const dados = JSON.parse(dadosBackup);
          const timestamp = new Date(dados.timestamp);
          const agora = new Date();
          const diffHoras = (agora.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

          if (diffHoras > 24) {
            localStorage.removeItem('proposta_passo2_backup');
          }
        } catch (error) {
          localStorage.removeItem('proposta_passo2_backup');
        }
      }
    };
  }, []);

  // Carregar tipos de atividade ao montar o componente
  useEffect(() => {
    carregarTiposAtividade();
  }, []);

  // Carregar regimes compatíveis quando tipo de atividade for selecionado
  useEffect(() => {
    if (selectedTipoAtividade) {
      carregarRegimesCompativeis(selectedTipoAtividade);
    } else {
      setRegimesCompativeis([]);
    }
  }, [selectedTipoAtividade]);

  // Carregar faixas de faturamento quando regime tributário for selecionado
  useEffect(() => {
    if (selectedRegimeTributario) {
      carregarFaixasFaturamento(selectedRegimeTributario);
    } else {
      setFaixasFaturamento([]);
    }
  }, [selectedRegimeTributario]);

  // Navegar automaticamente para a aba de faixas se houver faixas disponíveis
  useEffect(() => {
    if (selectedRegimeTributario && hasFaixasFaturamento && abaAtiva === 1) {
      setAbaAtiva(2);
    }
  }, [selectedRegimeTributario, hasFaixasFaturamento, abaAtiva]);

  // ⚠️ NOVO: Buscar mensalidade quando configurações mudarem
  useEffect(() => {
    if (selectedTipoAtividade && selectedRegimeTributario) {
      // Se há faixas e uma foi selecionada, buscar com faixa
      if (hasFaixasFaturamento && selectedFaixaFaturamento) {
        buscarMensalidadeAutomatica(selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento);
      } else if (!hasFaixasFaturamento) {
        // Se não há faixas, buscar sem faixa
        buscarMensalidadeAutomatica(selectedTipoAtividade, selectedRegimeTributario);
      }
    }
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, hasFaixasFaturamento]);

  const carregarTiposAtividade = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiService.getTiposAtividade({ ativo: true });
      const tipos = response.data || response || [];
      
      // Garantir que é um array
      if (Array.isArray(tipos)) {
        setTiposAtividade(tipos);
      } else {
        console.error('Resposta da API não é um array:', tipos);
        setTiposAtividade([]);
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar tipos de atividade:', err);

      // Dados mockados para demonstração
      const errorMessage = (err as Error)?.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('UNAUTHORIZED') || errorMessage.includes('Failed to fetch')) {
        setError('API não disponível. Usando dados de demonstração.');

        const tiposMockados: TipoAtividade[] = [
          {
            id: 1,
            codigo: 'COM-VAR',
            nome: 'Comércio Varejista',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          },
          {
            id: 2,
            codigo: 'SERV-GER',
            nome: 'Prestação de Serviços',
            aplicavel_pf: true,
            aplicavel_pj: true,
            ativo: true
          },
          {
            id: 3,
            codigo: 'IND-GER',
            nome: 'Indústria',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          },
          {
            id: 4,
            codigo: 'CONS-GER',
            nome: 'Consultoria',
            aplicavel_pf: true,
            aplicavel_pj: true,
            ativo: true
          }
        ];

        setTiposAtividade(tiposMockados);
      } else {
        setError(errorMessage || 'Erro ao carregar tipos de atividade');
        setTiposAtividade([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarRegimesCompativeis = async (tipoAtividadeId: number) => {
    setLoadingRegimes(true);
    setRegimesCompativeis([]); // Limpar regimes antes de carregar novos

    try {
      // 1. Primeiro, buscar o tipo de atividade selecionado para saber se é PF ou PJ
      const tipoAtividade = tiposAtividade.find(t => t.id === tipoAtividadeId);

      if (!tipoAtividade) {
        console.error('Tipo de atividade não encontrado');
        setLoadingRegimes(false);
        return;
      }

      console.log('🔍 Tipo de atividade selecionado:', tipoAtividade);

      // 2. Definir parâmetros de filtro baseado no tipo
      const filtroParams: {
        ativo: boolean;
        aplicavel_pf?: boolean;
        aplicavel_pj?: boolean;
      } = {
        ativo: true
      };

      // ✅ CORREÇÃO CRÍTICA: Filtrar regimes baseado no tipo de atividade
      if (tipoAtividade.aplicavel_pf && !tipoAtividade.aplicavel_pj) {
        // Se é APENAS para PF, buscar regimes aplicáveis a PF
        filtroParams.aplicavel_pf = true;
        filtroParams.aplicavel_pj = false; // ✅ EXPLICITAMENTE false para PJ
        console.log('🔍 Filtrando regimes para PESSOA FÍSICA');
      } else if (tipoAtividade.aplicavel_pj && !tipoAtividade.aplicavel_pf) {
        // Se é APENAS para PJ, buscar regimes aplicáveis a PJ
        filtroParams.aplicavel_pf = false; // ✅ EXPLICITAMENTE false para PF
        filtroParams.aplicavel_pj = true;
        console.log('🔍 Filtrando regimes para PESSOA JURÍDICA');
      } else if (tipoAtividade.aplicavel_pf && tipoAtividade.aplicavel_pj) {
        // Se aplicável a ambos, mostrar todos os regimes ativos
        console.log('🔍 Tipo aplicável a PF e PJ, mostrando todos os regimes');
      }

      // 3. Buscar regimes tributários com filtro correto
      console.log('🔍 Parâmetros de filtro:', filtroParams);

      const response = await apiService.getRegimesTributarios(filtroParams);
      const regimes = response.data || response || [];

      console.log('🔍 Regimes retornados:', regimes);
      console.log('🔍 Quantidade de regimes:', regimes.length);

      // ✅ VALIDAÇÃO: Log detalhado dos regimes
      regimes.forEach((regime: RegimeTributario) => {
        console.log(`📋 Regime: ${regime.codigo} - PF: ${regime.aplicavel_pf}, PJ: ${regime.aplicavel_pj}`);
      });

      setRegimesCompativeis(regimes);

    } catch (err: unknown) {
      console.error('❌ Erro ao carregar regimes tributários:', err);

      // Dados mockados para demonstração com filtro correto
      const tipoAtividade = tiposAtividade.find(t => t.id === tipoAtividadeId);
      let regimesMockados: RegimeTributario[] = [];

      if (tipoAtividade?.aplicavel_pf && !tipoAtividade?.aplicavel_pj) {
        // Apenas PF
        regimesMockados = [
          {
            id: 1,
            codigo: 'AUT',
            nome: 'Autônomo',
            descricao: 'Regime tributário para pessoas físicas autônomas',
            aplicavel_pf: true,
            aplicavel_pj: false,
            ativo: true
          },
          {
            id: 2,
            codigo: 'IRPF',
            nome: 'Imposto de Renda Pessoa Física',
            descricao: 'Tributação padrão para pessoa física',
            aplicavel_pf: true,
            aplicavel_pj: false,
            ativo: true
          }
        ];
      } else if (tipoAtividade?.aplicavel_pj && !tipoAtividade?.aplicavel_pf) {
        // Apenas PJ
        regimesMockados = [
          {
            id: 3,
            codigo: 'SN',
            nome: 'Simples Nacional',
            descricao: 'Regime simplificado para pequenas empresas',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          },
          {
            id: 4,
            codigo: 'LP',
            nome: 'Lucro Presumido',
            descricao: 'Regime baseado em presunção de lucro',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          },
          {
            id: 5,
            codigo: 'LR',
            nome: 'Lucro Real',
            descricao: 'Regime baseado no lucro real da empresa',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          }
        ];
      } else {
        // Ambos PF e PJ
        regimesMockados = [
          {
            id: 1,
            codigo: 'AUT',
            nome: 'Autônomo',
            descricao: 'Regime tributário para pessoas físicas autônomas',
            aplicavel_pf: true,
            aplicavel_pj: false,
            ativo: true
          },
          {
            id: 3,
            codigo: 'SN',
            nome: 'Simples Nacional',
            descricao: 'Regime simplificado para pequenas empresas',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          },
          {
            id: 4,
            codigo: 'LP',
            nome: 'Lucro Presumido',
            descricao: 'Regime baseado em presunção de lucro',
            aplicavel_pf: false,
            aplicavel_pj: true,
            ativo: true
          }
        ];
      }

      setRegimesCompativeis(regimesMockados);
    } finally {
      setLoadingRegimes(false);
    }
  };

  // ⚠️ ATUALIZADA: Função para carregar faixas
  const carregarFaixasFaturamento = async (regimeTributarioId: number) => {
    setLoadingFaixas(true);

    try {
      const response = await apiService.getFaixasFaturamento({ regime_tributario_id: regimeTributarioId });
      const faixas = response.data || response || [];

      setFaixasFaturamento(faixas);

      // Log para debugging
      console.log(`Regime ${regimeTributarioId}: ${faixas.length} faixas encontradas`);

    } catch (err: unknown) {
      console.error('Erro ao carregar faixas:', err);

      // Dados mockados para demonstração
      const faixasMockadas: FaixaFaturamento[] = [
        {
          id: 1,
          regime_tributario_id: regimeTributarioId,
          valor_inicial: 0,
          valor_final: 180000,
          aliquota: 4.5,
          ativo: true
        },
        {
          id: 2,
          regime_tributario_id: regimeTributarioId,
          valor_inicial: 180000.01,
          valor_final: 360000,
          aliquota: 7.5,
          ativo: true
        },
        {
          id: 3,
          regime_tributario_id: regimeTributarioId,
          valor_inicial: 360000.01,
          valor_final: 720000,
          aliquota: 10.5,
          ativo: true
        },
        {
          id: 4,
          regime_tributario_id: regimeTributarioId,
          valor_inicial: 720000.01,
          valor_final: null,
          aliquota: 14.5,
          ativo: true
        }
      ];

      setFaixasFaturamento(faixasMockadas);
    } finally {
      setLoadingFaixas(false);
    }
  };

  const handleTipoAtividadeChange = async (tipoAtividadeId: number) => {
    setSelectedTipoAtividade(tipoAtividadeId);
    setSelectedRegimeTributario(null);
    setSelectedFaixaFaturamento(null);
    setFaixasFaturamento([]);

    // ✅ IMPLEMENTAR: Filtro automático de regimes baseado no tipo de atividade
    try {
      setLoadingRegimes(true);
      const regimes = await apiService.getRegimesTributarios({
        ativo: true,
        tipo_atividade_id: tipoAtividadeId
      });
      setRegimesCompativeis(regimes);
      console.log('✅ Regimes filtrados carregados:', regimes.length);
    } catch (error) {
      console.error('❌ Erro ao carregar regimes filtrados:', error);
      setRegimesCompativeis([]);
      setError('Erro ao carregar regimes tributários compatíveis');
    } finally {
      setLoadingRegimes(false);
    }

    // Navegar automaticamente para a próxima aba
    setAbaAtiva(1);
  };

  const handleRegimeTributarioChange = async (regimeId: number) => {
    setSelectedRegimeTributario(regimeId);
    setSelectedFaixaFaturamento(null);

    // Carregar faixas de faturamento
    await carregarFaixasFaturamento(regimeId);

    // Navegar para a aba 3 se houver faixas (será verificado no useEffect)
  };

  const handleProximo = () => {
    if (podeProximo) {
      // ⚠️ NOVO: Salvar antes de prosseguir
      salvarProgresso();

      // ✅ CORREÇÃO: Incluir mensalidade completa nos dados
      const dadosCompletos = {
        tipo_atividade_id: selectedTipoAtividade!,
        regime_tributario_id: selectedRegimeTributario!,
        faixa_faturamento_id: selectedFaixaFaturamento, // Pode ser null
        valor_mensalidade: valorMensalidade, // ✅ Mensalidade calculada
        mensalidade_encontrada: mensalidadeEncontrada, // ✅ Status da mensalidade
        tipo_atividade: tiposAtividade.find(t => t.id === selectedTipoAtividade),
        regime_tributario: regimesCompativeis.find(r => r.id === selectedRegimeTributario),
        faixa_faturamento: faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)
      };

      console.log('🚀 Passo 2 - Dados enviados para próximo passo:', dadosCompletos);
      console.log('🔍 Debug Faixa Faturamento:', {
        selectedFaixaFaturamento,
        faixasFaturamento: faixasFaturamento.length,
        faixaEncontrada: faixasFaturamento.find(f => f.id === selectedFaixaFaturamento),
        todasFaixas: faixasFaturamento
      });
      onProximo(dadosCompletos);
    }
  };

  const getTabState = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: // Tipo de Atividade
        return { enabled: true, required: true };

      case 1: // Regime Tributário
        return {
          enabled: !!selectedTipoAtividade,
          required: true,
          tooltip: !selectedTipoAtividade ? "Selecione um tipo de atividade primeiro" : ""
        };

      case 2: // Faixa de Faturamento
        return {
          enabled: !!selectedRegimeTributario && hasFaixasFaturamento,
          required: false, // ⚠️ NÃO é mais obrigatória
          tooltip: !selectedRegimeTributario
            ? "Selecione um regime tributário primeiro"
            : !hasFaixasFaturamento
              ? "Este regime não possui faixas de faturamento configuradas"
              : ""
        };

      default:
        return { enabled: false, required: false };
    }
  };

  return (
    <div>
      {/* Header da Página */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nova Proposta - Passo 2</h1>
            <p className="text-sm text-gray-500">Configure as informações tributárias</p>

            {/* ⚠️ NOVO: Indicador de salvamento */}
            <div className="flex items-center space-x-2 mt-2">
              {salvando && (
                <div className="flex items-center text-custom-blue text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-custom-blue border-t-transparent rounded-full mr-2"></div>
                  <span>Salvando configurações...</span>
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
            className="text-gray-600 hover:text-gray-800 flex items-center space-x-2 transition-colors"
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

      {/* ⚠️ NOVO: Aviso de recuperação se aplicável */}
      {dadosSalvos && (dadosSalvos.tipoAtividadeId || dadosSalvos.regimeTributarioId) && (
        <div className="mb-6 bg-custom-blue-light border border-custom-blue rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-custom-blue" />
            <span className="text-custom-blue-dark text-sm">
              Configurações tributárias recuperadas - Dados restaurados automaticamente
            </span>
          </div>
        </div>
      )}

      {/* ⚠️ NOVO: Indicadores de Progresso com Lógica Condicional */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        {/* Tipo de Atividade - Sempre obrigatório */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTipoAtividade ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
          {selectedTipoAtividade ? <Check className="w-4 h-4" /> : '1'}
        </div>
        <div className={`h-1 w-16 ${selectedTipoAtividade ? 'bg-green-500' : 'bg-gray-300'}`} />

        {/* Regime Tributário - Sempre obrigatório */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedRegimeTributario ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
          {selectedRegimeTributario ? <Check className="w-4 h-4" /> : '2'}
        </div>

        {/* Faixa de Faturamento - Condicional */}
        {hasFaixasFaturamento && (
          <>
            <div className={`h-1 w-16 ${selectedRegimeTributario ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedFaixaFaturamento ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
              {selectedFaixaFaturamento ? <Check className="w-4 h-4" /> : '3'}
            </div>
          </>
        )}

        {/* Indicador quando não há faixas */}
        {!hasFaixasFaturamento && selectedRegimeTributario && (
          <>
            <div className="h-1 w-16 bg-yellow-300" />
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-700">
              <span className="text-xs">N/A</span>
            </div>
          </>
        )}
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setAbaAtiva(0)}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${abaAtiva === 0
            ? 'text-custom-blue border-b-2 border-custom-blue'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Building className="w-4 h-4" />
          <span>Tipo de Atividade</span>
        </button>
        <button
          onClick={() => setAbaAtiva(1)}
          disabled={!getTabState(1).enabled}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${abaAtiva === 1
            ? 'text-custom-blue border-b-2 border-custom-blue'
            : getTabState(1).enabled
              ? 'text-gray-500 hover:text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
            }`}
          title={getTabState(1).tooltip}
        >
          <Calculator className="w-4 h-4" />
          <span>Regime Tributário</span>
        </button>
        <button
          onClick={() => setAbaAtiva(2)}
          disabled={!getTabState(2).enabled}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${abaAtiva === 2
            ? 'text-custom-blue border-b-2 border-custom-blue'
            : getTabState(2).enabled
              ? 'text-gray-500 hover:text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
            }`}
          title={getTabState(2).tooltip}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Faixa de Faturamento</span>
        </button>
        {/* ⚠️ NOVO: Aba de Resumo com Mensalidade */}
        <button
          onClick={() => setAbaAtiva(3)}
          disabled={!podeProximo}
          className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${abaAtiva === 3
            ? 'text-custom-blue border-b-2 border-custom-blue'
            : podeProximo
              ? 'text-gray-500 hover:text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
            }`}
          title={!podeProximo ? "Complete as configurações anteriores primeiro" : ""}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Resumo</span>
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        {/* Aba Tipo de Atividade */}
        {abaAtiva === 0 && (
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center">
                  <LoadingSpinner size="md" />
                  <span className="ml-3 text-gray-500">Carregando tipos de atividade...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {tiposAtividade.map((tipo) => (
                  <div key={tipo.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_atividade"
                        value={tipo.id}
                        checked={selectedTipoAtividade === tipo.id}
                        onChange={() => handleTipoAtividadeChange(tipo.id)}
                        className="h-5 w-5 text-custom-blue focus:ring-custom-blue"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-medium text-gray-900">{tipo.nome}</p>
                            <p className="text-sm text-gray-500">Código: {tipo.codigo}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-custom-blue-light text-custom-blue-dark">
                              Aplicável: {[tipo.aplicavel_pf && 'PF', tipo.aplicavel_pj && 'PJ'].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {tiposAtividade.length === 0 && !loading && (
              <div className="text-center py-16">
                <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-500 mb-2">Nenhum tipo de atividade encontrado</p>
                <p className="text-sm text-gray-400">Entre em contato com o suporte</p>
              </div>
            )}
          </div>
        )}

        {/* Aba Regime Tributário */}
        {abaAtiva === 1 && (
          <div className="p-6">
            {loadingRegimes ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center">
                  <LoadingSpinner size="md" />
                  <span className="ml-3 text-gray-500">Carregando regimes tributários...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {regimesCompativeis.map((regime) => (
                  <div key={regime.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="regime_tributario"
                        value={regime.id}
                        checked={selectedRegimeTributario === regime.id}
                        onChange={() => handleRegimeTributarioChange(regime.id)}
                        className="h-5 w-5 text-custom-blue focus:ring-custom-blue"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-medium text-gray-900">{regime.nome}</p>
                            <p className="text-sm text-gray-500">Código: {regime.codigo}</p>
                            {regime.descricao && (
                              <p className="text-sm text-gray-600 mt-1">{regime.descricao}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              {[regime.aplicavel_pf && 'PF', regime.aplicavel_pj && 'PJ'].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {regimesCompativeis.length === 0 && !loadingRegimes && (
              <div className="text-center py-16">
                <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-gray-500 mb-2">
                  {selectedTipoAtividade ? 'Nenhum regime tributário compatível encontrado' : 'Selecione um tipo de atividade primeiro'}
                </p>
                <p className="text-sm text-gray-400">
                  {selectedTipoAtividade ? 'Entre em contato com o suporte' : 'Volte para a aba anterior e selecione um tipo de atividade'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ⚠️ NOVA: Aba Faixa de Faturamento com Estado Vazio */}
        {abaAtiva === 2 && (
          <div className="p-6">
            {loadingFaixas ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center">
                  <LoadingSpinner size="md" />
                  <span className="ml-3 text-gray-500">Carregando faixas de faturamento...</span>
                </div>
              </div>
            ) : hasFaixasFaturamento ? (
              <div className="space-y-4">
                {faixasFaturamento.map((faixa) => (
                  <div key={faixa.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="faixa_faturamento"
                        value={faixa.id}
                        checked={selectedFaixaFaturamento === faixa.id}
                        onChange={() => setSelectedFaixaFaturamento(faixa.id)}
                        className="h-5 w-5 text-custom-blue focus:ring-custom-blue"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-medium text-gray-900">
                              {formatarMoeda(faixa.valor_inicial)}
                              {faixa.valor_final ? ` até ${formatarMoeda(faixa.valor_final)}` : ' ou mais'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Alíquota: {faixa.aliquota}%
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                              {faixa.aliquota}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              // Estado quando não há faixas de faturamento
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-400">📊</span>
                </div>
                <p className="text-lg text-gray-500 mb-2">
                  Nenhuma faixa de faturamento configurada
                </p>
                <p className="text-sm text-gray-400">
                  Este regime tributário não possui faixas de faturamento específicas.
                  Você pode continuar para o próximo passo.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ⚠️ NOVO: Aba de Resumo com Mensalidade */}
        {abaAtiva === 3 && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Resumo das Configurações */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Selecionadas</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Atividade:</span>
                    <span className="font-medium">
                      {tiposAtividade.find(t => t.id === selectedTipoAtividade)?.nome}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Regime Tributário:</span>
                    <span className="font-medium">
                      {regimesCompativeis.find(r => r.id === selectedRegimeTributario)?.nome}
                    </span>
                  </div>
                  {selectedFaixaFaturamento && hasFaixasFaturamento && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Faixa de Faturamento:</span>
                      <span className="font-medium">
                        {formatarMoeda(faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)?.valor_inicial || 0)}
                        {faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)?.valor_final
                          ? ` até ${formatarMoeda(faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)?.valor_final || 0)}`
                          : ' ou mais'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ CORREÇÃO: Mensalidade Automática Melhorada */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-green-900">Mensalidade Automática</h3>
                  {loadingMensalidade && (
                    <div className="flex items-center text-green-600">
                      <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full mr-2"></div>
                      <span className="text-sm">Buscando...</span>
                    </div>
                  )}
                </div>

                {mensalidadeEncontrada && valorMensalidade > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700">Valor da Mensalidade:</span>
                      <span className="text-2xl font-bold text-green-800">
                        {formatarMoeda(valorMensalidade)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span>Mensalidade calculada automaticamente baseada nas configurações selecionadas</span>
                    </div>
                    <div className="text-xs text-green-500 bg-green-100 rounded px-2 py-1">
                      💡 Este valor será incluído automaticamente no cálculo da proposta
                    </div>
                  </div>
                ) : mensalidadeEncontrada && valorMensalidade === 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-green-700">Valor da Mensalidade:</span>
                      <span className="text-2xl font-bold text-green-800">
                        A Combinar
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      <span>Valor será definido manualmente</span>
                    </div>

                    {/* ✅ NOVO: Exibição de erro se houver */}
                    {erroMensalidade && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center text-sm text-yellow-700">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span className="font-medium">Aviso:</span>
                        </div>
                        <p className="text-sm text-yellow-600 mt-1 ml-6">
                          {erroMensalidade}
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-green-500 bg-green-100 rounded px-2 py-1">
                      ℹ️ Aplicável para: Pessoa Física, valores acima de R$ 720.000 ou configurações não encontradas
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-green-600">
                      {loadingMensalidade ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full mr-2"></div>
                          <span>Calculando mensalidade...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-gray-500">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          <span>Configure as opções anteriores para ver a mensalidade</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Informações Adicionais */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">ℹ️ Informações Importantes</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A mensalidade é calculada automaticamente baseada na tabela de valores</li>
                  <li>• Para valores acima de R$ 720.000, será necessário definir manualmente</li>
                  <li>• Pessoa Física sempre terá valor "A Combinar"</li>
                  <li>• Este valor será incluído no cálculo total da proposta</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botões de Ação Fixos */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {selectedTipoAtividade && (
              <span className="text-sm text-gray-600">
                Tipo: {tiposAtividade.find(t => t.id === selectedTipoAtividade)?.nome}
              </span>
            )}
            {selectedRegimeTributario && (
              <span className="text-sm text-gray-600">
                Regime: {regimesCompativeis.find(r => r.id === selectedRegimeTributario)?.nome}
              </span>
            )}
            {selectedFaixaFaturamento && hasFaixasFaturamento && (
              <span className="text-sm text-gray-600">
                Faixa: {formatarMoeda(faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)?.valor_inicial || 0)}
              </span>
            )}
            {selectedRegimeTributario && !hasFaixasFaturamento && (
              <span className="text-sm text-yellow-600">
                Sem faixas específicas
              </span>
            )}
            {/* ⚠️ NOVO: Exibir mensalidade no rodapé */}
            {mensalidadeEncontrada && (
              <span className="text-sm text-green-600 font-medium">
                Mensalidade: {formatarMoeda(valorMensalidade)}
              </span>
            )}
            {valorMensalidade === 0 && !loadingMensalidade && podeProximo && (
              <span className="text-sm text-green-600 font-medium">
                Mensalidade: A Combinar
              </span>
            )}

            {/* ⚠️ NOVO: Botão de salvamento manual */}
            <button
              onClick={salvarProgresso}
              disabled={!podeProximo || salvando}
              className="flex items-center space-x-2 px-3 py-1 text-sm text-custom-blue bg-custom-blue-light rounded-lg hover:bg-custom-blue-light disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onVoltar}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={handleProximo}
              disabled={!podeProximo}
              className="px-6 py-2 text-sm font-medium text-white bg-custom-blue rounded-lg hover:bg-custom-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
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
