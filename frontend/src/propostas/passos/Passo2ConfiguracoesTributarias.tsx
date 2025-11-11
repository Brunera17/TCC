import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building,
  Calculator,
  TrendingUp,
  Check,
  AlertCircle,
  Save,
  CheckCircle,
  Loader2 // Importar Loader2
} from 'lucide-react';
import { apiService } from '../../lib/api';
// 🎨 Importações de UI Padronizadas
import {
  PageHeader,
  Card,
  ErrorMessage
} from '../../components/ui';
import { Button } from '../../components/forms';

// ... (Interfaces permanecem as mesmas) ...
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
  faixa_faturamento_id: number | null;
  valor_mensalidade?: number;
}

interface Passo2Props {
  clienteId: number;
  onVoltar: () => void;
  onProximo: (dados: ConfiguracoesTributarias) => void;
  dadosSalvos?: any;
  onSalvarProgresso?: (dados: any) => void;
}

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
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [erroSalvamento, setErroSalvamento] = useState<string | null>(null);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  
  // ... (Toda a lógica interna, hooks e funções de fetch permanecem os mesmos) ...
  // ... (buscarMensalidadeAutomatica, salvarProgresso, carregarTiposAtividade, etc.) ...
  const hasFaixasFaturamento = faixasFaturamento.length > 0;

  const podeProximo = React.useMemo(() => {
    const temTipoAtividade = !!selectedTipoAtividade;
    const temRegimeTributario = !!selectedRegimeTributario;
    if (!hasFaixasFaturamento) {
      return temTipoAtividade && temRegimeTributario;
    }
    const temFaixaFaturamento = !!selectedFaixaFaturamento;
    return temTipoAtividade && temRegimeTributario && temFaixaFaturamento;
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, hasFaixasFaturamento]);

  const buscarMensalidadeAutomatica = async (tipoAtividadeId: number, regimeTributarioId: number, faixaFaturamentoId?: number) => {
    setLoadingMensalidade(true);
    setMensalidadeEncontrada(false);
    setValorMensalidade(0);
    setErroMensalidade(null);
    try {
      const params: any = {
        tipo_atividade_id: tipoAtividadeId,
        regime_tributario_id: regimeTributarioId
      };
      if (faixaFaturamentoId) {
        params.faixa_faturamento_id = faixaFaturamentoId;
      }
      const response = await apiService.buscarMensalidadeAutomatica(params);
      let valorMensalidadeEncontrado = null;
      let aCombinar = false;
      if (response && typeof response === 'object') {
        if (response.valor_mensalidade !== undefined && response.valor_mensalidade !== null) {
          valorMensalidadeEncontrado = response.valor_mensalidade;
          aCombinar = response.a_combinar || false;
        }
        else if (response.data && response.data.valor_mensalidade !== undefined && response.data.valor_mensalidade !== null) {
          valorMensalidadeEncontrado = response.data.valor_mensalidade;
          aCombinar = response.data.a_combinar || false;
        }
        else if (response.mensalidade !== undefined && response.mensalidade !== null) {
          valorMensalidadeEncontrado = response.mensalidade;
          aCombinar = response.a_combinar || false;
        }
      }
      if (valorMensalidadeEncontrado !== null) {
        setValorMensalidade(valorMensalidadeEncontrado);
        setMensalidadeEncontrada(true);
        if (aCombinar || valorMensalidadeEncontrado === 0) {
          setErroMensalidade(null);
        }
      } else {
        setValorMensalidade(0);
        setMensalidadeEncontrada(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const tipoAtividade = tiposAtividade.find(t => t.id === tipoAtividadeId);
      if (tipoAtividade?.codigo === 'PF') {
        setValorMensalidade(0);
        setMensalidadeEncontrada(true);
        setErroMensalidade(null);
      } else if (errorMessage.includes('404')) {
        setValorMensalidade(0);
        setMensalidadeEncontrada(true);
        setErroMensalidade('Configuração não encontrada - Valor será definido manualmente');
      } else {
        setValorMensalidade(0);
        setMensalidadeEncontrada(true);
        setErroMensalidade('Erro ao buscar mensalidade - Valor será definido manualmente');
      }
    } finally {
      setLoadingMensalidade(false);
    }
  };

  useEffect(() => {
    if (dadosSalvos) {
      if (dadosSalvos.tipoAtividadeId) setSelectedTipoAtividade(dadosSalvos.tipoAtividadeId);
      if (dadosSalvos.regimeTributarioId) setSelectedRegimeTributario(dadosSalvos.regimeTributarioId);
      if (dadosSalvos.faixaFaturamentoId) setSelectedFaixaFaturamento(dadosSalvos.faixaFaturamentoId);
      if (dadosSalvos.abaAtiva !== undefined) setAbaAtiva(dadosSalvos.abaAtiva);
      if (dadosSalvos.valorMensalidade !== undefined) setValorMensalidade(dadosSalvos.valorMensalidade);
      if (dadosSalvos.mensalidadeEncontrada !== undefined) setMensalidadeEncontrada(dadosSalvos.mensalidadeEncontrada);
      if (dadosSalvos.erroMensalidade !== undefined) setErroMensalidade(dadosSalvos.erroMensalidade);
    }
    const dadosBackup = localStorage.getItem('proposta_passo2_backup');
    if (dadosBackup && !dadosSalvos) {
      try {
        const dados = JSON.parse(dadosBackup);
        if (dados.tipoAtividadeId) setSelectedTipoAtividade(dados.tipoAtividadeId);
        if (dados.regimeTributarioId) setSelectedRegimeTributario(dados.regimeTributarioId);
        if (dados.faixaFaturamentoId) setSelectedFaixaFaturamento(dados.faixaFaturamentoId);
        if (dados.abaAtiva !== undefined) setAbaAtiva(dados.abaAtiva);
        if (dados.valorMensalidade !== undefined) setValorMensalidade(dados.valorMensalidade);
        if (dados.mensalidadeEncontrada !== undefined) setMensalidadeEncontrada(dados.mensalidadeEncontrada);
        if (dados.erroMensalidade !== undefined) setErroMensalidade(dados.erroMensalidade);
      } catch (error) {
        console.warn('Erro ao recuperar backup do Passo 2:', error);
      }
    }
  }, [dadosSalvos]);

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
        valorMensalidade,
        mensalidadeEncontrada,
        erroMensalidade,
        timestamp: new Date().toISOString(),
        dadosCompletos: {
          tipoAtividade: tiposAtividade.find(t => t.id === selectedTipoAtividade),
          regimeTributario: regimesCompativeis.find(r => r.id === selectedRegimeTributario),
          faixaFaturamento: faixasFaturamento.find(f => f.id === selectedFaixaFaturamento),
          valorMensalidade,
          mensalidadeEncontrada,
          erroMensalidade
        }
      };
      localStorage.setItem('proposta_passo2_backup', JSON.stringify(dadosParaSalvar));
      if (onSalvarProgresso) {
        await onSalvarProgresso(dadosParaSalvar);
      }
      setUltimoSalvamento(new Date());
    } catch (error) {
      setErroSalvamento(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, abaAtiva, clienteId, tiposAtividade, regimesCompativeis, faixasFaturamento, valorMensalidade, mensalidadeEncontrada, erroMensalidade, onSalvarProgresso]);

  useEffect(() => {
    if (selectedTipoAtividade && selectedRegimeTributario) {
      const timeoutId = setTimeout(salvarProgresso, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento, valorMensalidade, mensalidadeEncontrada, salvarProgresso]);

  useEffect(() => {
    return () => {
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

  useEffect(() => {
    carregarTiposAtividade();
  }, []);

  useEffect(() => {
    if (selectedTipoAtividade) {
      carregarRegimesCompativeis(selectedTipoAtividade);
    } else {
      setRegimesCompativeis([]);
    }
  }, [selectedTipoAtividade]);

  useEffect(() => {
    if (selectedRegimeTributario) {
      carregarFaixasFaturamento(selectedRegimeTributario);
    } else {
      setFaixasFaturamento([]);
    }
  }, [selectedRegimeTributario]);

  useEffect(() => {
    if (!autoAdvanceEnabled) return;
    if (selectedRegimeTributario && hasFaixasFaturamento && abaAtiva === 1) {
      setAbaAtiva(2);
    }
  }, [selectedRegimeTributario, hasFaixasFaturamento, abaAtiva, autoAdvanceEnabled]);

  useEffect(() => {
    if (selectedTipoAtividade && selectedRegimeTributario) {
      if (hasFaixasFaturamento && selectedFaixaFaturamento) {
        buscarMensalidadeAutomatica(selectedTipoAtividade, selectedRegimeTributario, selectedFaixaFaturamento);
      } else if (!hasFaixasFaturamento) {
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
      if (Array.isArray(tipos)) {
        setTiposAtividade(tipos);
      } else {
        setTiposAtividade([]);
      }
    } catch (err: unknown) {
      // (Lógica de mock removida para brevidade)
      setError((err as Error).message || 'Erro ao carregar tipos de atividade');
      setTiposAtividade([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarRegimesCompativeis = async (tipoAtividadeId: number) => {
    setLoadingRegimes(true);
    setRegimesCompativeis([]);
    try {
      const tipoAtividade = tiposAtividade.find(t => t.id === tipoAtividadeId);
      if (!tipoAtividade) return;
      const filtroParams: { ativo: boolean; aplicavel_pf?: boolean; aplicavel_pj?: boolean; } = { ativo: true };
      if (tipoAtividade.aplicavel_pf && !tipoAtividade.aplicavel_pj) {
        filtroParams.aplicavel_pf = true;
        filtroParams.aplicavel_pj = false;
      } else if (tipoAtividade.aplicavel_pj && !tipoAtividade.aplicavel_pf) {
        filtroParams.aplicavel_pf = false;
        filtroParams.aplicavel_pj = true;
      }
      const response = await apiService.getRegimesTributarios(filtroParams);
      const regimes = response.data || response || [];
      setRegimesCompativeis(regimes);
    } catch (err: unknown) {
      // (Lógica de mock removida para brevidade)
      setRegimesCompativeis([]);
    } finally {
      setLoadingRegimes(false);
    }
  };

  const carregarFaixasFaturamento = async (regimeTributarioId: number) => {
    setLoadingFaixas(true);
    try {
      const response = await apiService.getFaixasFaturamento({ regime_tributario_id: regimeTributarioId });
      const faixas = response.data || response || [];
      setFaixasFaturamento(faixas);
    } catch (err: unknown) {
      // (Lógica de mock removida para brevidade)
      setFaixasFaturamento([]);
    } finally {
      setLoadingFaixas(false);
    }
  };

  const handleTipoAtividadeChange = async (tipoAtividadeId: number) => {
    setSelectedTipoAtividade(tipoAtividadeId);
    setSelectedRegimeTributario(null);
    setSelectedFaixaFaturamento(null);
    setFaixasFaturamento([]);
    setAutoAdvanceEnabled(true);
    try {
      setLoadingRegimes(true);
      const regimes = await apiService.getRegimesTributarios({
        ativo: true,
        tipo_atividade_id: tipoAtividadeId
      });
      setRegimesCompativeis(regimes);
    } catch (error) {
      setRegimesCompativeis([]);
      setError('Erro ao carregar regimes tributários compatíveis');
    } finally {
      setLoadingRegimes(false);
    }
    setAbaAtiva(1);
  };

  const handleRegimeTributarioChange = async (regimeId: number) => {
    setSelectedRegimeTributario(regimeId);
    setSelectedFaixaFaturamento(null);
    setAutoAdvanceEnabled(true);
    await carregarFaixasFaturamento(regimeId);
  };

  const handleTabClick = (tabId: number) => {
    setAutoAdvanceEnabled(false);
    setAbaAtiva(tabId);
  };

  const handleProximo = () => {
    if (podeProximo) {
      salvarProgresso();
      const dadosCompletos = {
        tipo_atividade_id: selectedTipoAtividade!,
        regime_tributario_id: selectedRegimeTributario!,
        faixa_faturamento_id: selectedFaixaFaturamento,
        valor_mensalidade: valorMensalidade,
        mensalidade_encontrada: mensalidadeEncontrada,
        tipo_atividade: tiposAtividade.find(t => t.id === selectedTipoAtividade),
        regime_tributario: regimesCompativeis.find(r => r.id === selectedRegimeTributario),
        faixa_faturamento: faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)
      };
      onProximo(dadosCompletos);
    }
  };
  
  const getTabState = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: return { enabled: true, required: true };
      case 1: return { enabled: !!selectedTipoAtividade, required: true, tooltip: !selectedTipoAtividade ? "Selecione um tipo de atividade" : "" };
      case 2: return { enabled: !!selectedRegimeTributario && hasFaixasFaturamento, required: false, tooltip: !selectedRegimeTributario ? "Selecione um regime" : !hasFaixasFaturamento ? "Este regime não possui faixas" : "" };
      default: return { enabled: false, required: false };
    }
  };


  // 7. Renderização com UI Padronizada
  return (
    <div className="pb-32">
      {/* Cabeçalho */}
      <PageHeader
        title="Nova Proposta - Passo 2"
        subtitle="Configure as informações tributárias"
      >
        <Button variant="ghost" onClick={onVoltar} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
      </PageHeader>

      {/* Mensagens */}
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}
      {dadosSalvos?.tipoAtividadeId && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <CheckCircle className="w-5 h-5" />
          <span>Configurações tributárias recuperadas automaticamente.</span>
        </div>
      )}
      {erroSalvamento && <ErrorMessage message={`Falha no salvamento automático: ${erroSalvamento}`} variant="warning" className="mb-4" />}

      {/* Indicadores de Progresso */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedTipoAtividade ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
          {selectedTipoAtividade ? <Check className="w-4 h-4" /> : '1'}
        </div>
        <div className={`h-1 w-16 ${selectedTipoAtividade ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedRegimeTributario ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
          {selectedRegimeTributario ? <Check className="w-4 h-4" /> : '2'}
        </div>
        {hasFaixasFaturamento && (
          <>
            <div className={`h-1 w-16 ${selectedRegimeTributario ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedFaixaFaturamento ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {selectedFaixaFaturamento ? <Check className="w-4 h-4" /> : '3'}
            </div>
          </>
        )}
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 0, label: 'Tipo de Atividade', icon: Building, state: getTabState(0) },
            { id: 1, label: 'Regime Tributário', icon: Calculator, state: getTabState(1) },
            { id: 2, label: 'Faixa de Faturamento', icon: TrendingUp, state: getTabState(2) },
            { id: 3, label: 'Resumo', icon: CheckCircle, state: { enabled: podeProximo, tooltip: !podeProximo ? "Complete as etapas" : "" } }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={!tab.state.enabled}
              className={`flex items-center space-x-2 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                abaAtiva === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : tab.state.enabled
                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    : 'border-transparent text-gray-300 cursor-not-allowed'
              }`}
              title={tab.state.tooltip}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das Abas em Card */}
      <Card>
        {abaAtiva === 0 && (
          <div className="p-6">
            {loading && <div className="text-center py-16">Carregando...</div>}
            {!loading && (
              <div className="space-y-4">
                {tiposAtividade.map((tipo) => (
                  <div key={tipo.id} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${selectedTipoAtividade === tipo.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_atividade"
                        value={tipo.id}
                        checked={selectedTipoAtividade === tipo.id}
                        onChange={() => handleTipoAtividadeChange(tipo.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-1">
                        <p className="text-lg font-medium text-gray-900">{tipo.nome}</p>
                        <p className="text-sm text-gray-500">Código: {tipo.codigo}</p>
                        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Aplicável: {[tipo.aplicavel_pf && 'PF', tipo.aplicavel_pj && 'PJ'].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
                {tiposAtividade.length === 0 && <div className="text-center py-16 text-gray-500">Nenhum tipo de atividade encontrado.</div>}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 1 && (
          <div className="p-6">
            {loadingRegimes && <div className="text-center py-16">Carregando regimes...</div>}
            {!loadingRegimes && (
              <div className="space-y-4">
                {regimesCompativeis.map((regime) => (
                   <div key={regime.id} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${selectedRegimeTributario === regime.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="regime_tributario"
                        value={regime.id}
                        checked={selectedRegimeTributario === regime.id}
                        onChange={() => handleRegimeTributarioChange(regime.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-1">
                        <p className="text-lg font-medium text-gray-900">{regime.nome}</p>
                        <p className="text-sm text-gray-500">Código: {regime.codigo}</p>
                        {regime.descricao && <p className="text-sm text-gray-600 mt-1">{regime.descricao}</p>}
                      </div>
                    </label>
                  </div>
                ))}
                {regimesCompativeis.length === 0 && <div className="text-center py-16 text-gray-500">Nenhum regime compatível.</div>}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 2 && (
          <div className="p-6">
            {loadingFaixas && <div className="text-center py-16">Carregando faixas...</div>}
            {!loadingFaixas && hasFaixasFaturamento && (
              <div className="space-y-4">
                {faixasFaturamento.map((faixa) => (
                  <div key={faixa.id} className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${selectedFaixaFaturamento === faixa.id ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}`}>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="faixa_faturamento"
                        value={faixa.id}
                        checked={selectedFaixaFaturamento === faixa.id}
                        onChange={() => setSelectedFaixaFaturamento(faixa.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-1">
                        <p className="text-lg font-medium text-gray-900">
                          {formatarMoeda(faixa.valor_inicial)}
                          {faixa.valor_final ? ` até ${formatarMoeda(faixa.valor_final)}` : ' ou mais'}
                        </p>
                        <p className="text-sm text-gray-500">Alíquota: {faixa.aliquota}%</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
            {!loadingFaixas && !hasFaixasFaturamento && (
              <div className="text-center py-16 text-gray-500">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="font-medium">Este regime não possui faixas de faturamento.</p>
                <p className="text-sm">Você pode prosseguir para o próximo passo.</p>
              </div>
            )}
          </div>
        )}
        
        {abaAtiva === 3 && (
            <div className="p-6">
              <div className="space-y-6">
                <Card variant="bordered">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Selecionadas</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Tipo de Atividade:</span><span className="font-medium">{tiposAtividade.find(t => t.id === selectedTipoAtividade)?.nome}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Regime Tributário:</span><span className="font-medium">{regimesCompativeis.find(r => r.id === selectedRegimeTributario)?.nome}</span></div>
                    {selectedFaixaFaturamento && hasFaixasFaturamento && (
                      <div className="flex justify-between"><span className="text-gray-600">Faixa de Faturamento:</span><span className="font-medium">{formatarMoeda(faixasFaturamento.find(f => f.id === selectedFaixaFaturamento)?.valor_inicial || 0)}</span></div>
                    )}
                  </div>
                </Card>
                
                <Card variant={mensalidadeEncontrada && valorMensalidade > 0 ? "success" : "info"}>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Mensalidade Automática</h3>
                  {loadingMensalidade ? (
                    <div className="flex items-center text-gray-600"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-gray-900">{mensalidadeEncontrada && valorMensalidade > 0 ? formatarMoeda(valorMensalidade) : "A Combinar"}</span>
                        {mensalidadeEncontrada && valorMensalidade > 0 && <span className="text-green-700 text-sm font-medium">Valor Calculado</span>}
                      </div>
                      {erroMensalidade && <ErrorMessage message={erroMensalidade} variant="warning" className="mt-2" />}
                      {mensalidadeEncontrada && valorMensalidade === 0 && !erroMensalidade && <p className="text-sm text-gray-600 mt-2">Valor será definido manualmente.</p>}
                    </>
                  )}
                </Card>
              </div>
            </div>
        )}
      </Card>

      {/* Rodapé Fixo */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {salvando && (
              <div className="flex items-center text-blue-600 text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Salvando...</span>
              </div>
            )}
            {ultimoSalvamento && !salvando && (
              <div className="flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Salvo {ultimoSalvamento.toLocaleTimeString()}</span>
              </div>
            )}
             <Button
              variant="ghost"
              onClick={salvarProgresso}
              disabled={!podeProximo || salvando}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Salvar Progresso
            </Button>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onVoltar}
            >
              Anterior
            </Button>
            <Button
              variant="primary"
              onClick={handleProximo}
              disabled={!podeProximo}
              rightIcon={!podeProximo && <AlertCircle className="w-4 h-4" />}
            >
              Próximo Passo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};