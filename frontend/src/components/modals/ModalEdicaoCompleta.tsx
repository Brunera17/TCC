import { useState, useEffect } from 'react';
import {
  Settings, List, CheckCircle, User, Plus, Trash2, Save,
  DollarSign
} from 'lucide-react';
import { apiService } from '../../lib/api';
import type {
  PropostaResponse,
  Servico,
  FaixaFaturamento,
  TipoAtividade,
  RegimeTributario
} from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { STATUS_COLORS, normalizeStatus } from '../../utils/statusColors';
import { useToast } from '../../context/ToastContext';
import { Modal } from './Modal';
import { Button } from '../forms/Button';

interface ModalEdicaoCompletaProps {
  proposta: PropostaResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface DadosProposta {
  // Configurações Tributárias
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id: number | null;

  // Serviços (corrigido para buscar da proposta)
  servicosSelecionados: Array<{
    servico_id: number;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
    extras?: {
      descricao_personalizada?: string;
    };
    servico?: Servico | null;
  }>;

  // Finalização
  percentual_desconto: number;
  observacoes: string;
  status: string;
  data_validade: string;
  valor_total: number;
  valor_servicos: number; // NOVO: Soma dos serviços
  valor_desconto: number; // NOVO: Valor do desconto
  valor_mensalidade: number; // NOVO: Valor da mensalidade automática

  // ⚠️ NOVOS CAMPOS: Taxa de abertura e dados financeiros
  taxa_abertura: number;
  valor_base: number;
  desconto_valor: number;
  desconto_percentual: number;
  desconto_tipo: string;
  taxa_abertura_aplicavel: boolean;
  taxa_abertura_motivo: string;
}

export const ModalEdicaoCompleta: React.FC<ModalEdicaoCompletaProps> = ({
  proposta,
  isOpen,
  onClose,
  onSaved
}) => {
  const { showSuccess, showError } = useToast();
  const [abaSelecionada, setAbaSelecionada] = useState('configuracoes');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [regenerandoPDF, setRegenerandoPDF] = useState(false);

  // Estados dos dados corrigidos
  const [dados, setDados] = useState<DadosProposta>({
    tipo_atividade_id: 0,
    regime_tributario_id: 0,
    faixa_faturamento_id: null,
    servicosSelecionados: [],
    percentual_desconto: 0,
    observacoes: '',
    status: '',
    data_validade: '',
    valor_total: 0,
    valor_servicos: 0,
    valor_desconto: 0,
    valor_mensalidade: 0, // NOVO: Valor da mensalidade automática
    // ⚠️ NOVOS CAMPOS: Taxa de abertura e dados financeiros
    taxa_abertura: 0,
    valor_base: 0,
    desconto_valor: 0,
    desconto_percentual: 0,
    desconto_tipo: 'sem_desconto',
    taxa_abertura_aplicavel: false,
    taxa_abertura_motivo: ''
  });

  // Dados auxiliares
  const [clienteCompleto, setClienteCompleto] = useState<any>(null);
  const [tiposAtividade, setTiposAtividade] = useState<TipoAtividade[]>([]);
  const [regimesTributarios, setRegimesTributarios] = useState<RegimeTributario[]>([]);
  const [faixasFaturamento, setFaixasFaturamento] = useState<FaixaFaturamento[]>([]);
  const [todosServicos, setTodosServicos] = useState<Servico[]>([]);

  const extractCollection = <T,>(raw: unknown): T[] => {
    if (Array.isArray(raw)) {
      return raw as T[];
    }

    if (raw && typeof raw === 'object') {
      const container = raw as Record<string, unknown>;
      const candidateKeys = ['data', 'results', 'items', 'values', 'servicos'];
      for (const key of candidateKeys) {
        const value = container[key];
        if (Array.isArray(value)) {
          return value as T[];
        }
      }
    }

    return [];
  };

  // Carregar dados corrigido
  useEffect(() => {
    if (isOpen && proposta) {
      carregarDadosCompletos();
    }
  }, [isOpen, proposta]);

  const carregarDadosCompletos = async () => {
    setLoading(true);
    try {
      console.log('🔍 Carregando dados da proposta:', proposta!.id);
      console.log('📋 Dados completos da proposta:', proposta);

      // ✅ VALIDAÇÃO: Verificar se a proposta tem cliente_id
      if (!proposta!.cliente_id || proposta!.cliente_id === undefined || proposta!.cliente_id === null) {
        console.error('❌ Proposta sem cliente_id:', proposta);
        throw new Error(`Proposta #${proposta!.numero || proposta!.id} não possui cliente_id válido. Valor atual: ${proposta!.cliente_id}`);
      }

      // ✅ VALIDAÇÃO: Verificar se a proposta tem tipo_atividade_id
      if (!proposta!.tipo_atividade_id) {
        throw new Error('Proposta não possui tipo de atividade definido. Não é possível carregar regimes tributários.');
      }

      console.log('✅ Validações OK - cliente_id:', proposta!.cliente_id, 'tipo_atividade_id:', proposta!.tipo_atividade_id);

      const [propostaCompleta, cliente, tipos, regimes, servicosResponse] = await Promise.all([
        apiService.getProposta(proposta!.id),
        apiService.getCliente(proposta!.cliente_id),
        apiService.getTiposAtividade(),
        // ✅ CORREÇÃO: Passar parâmetros corretos para regimes tributários
        apiService.getRegimesTributarios({
          ativo: true,
          tipo_atividade_id: proposta!.tipo_atividade_id
        }),
        apiService.getServicos({ ativo: true, per_page: 1000 }) // Carregar todos os serviços ativos
      ]);

      console.log('📄 Proposta completa:', propostaCompleta);
      console.log('💰 Resumo financeiro:', propostaCompleta.resumo_financeiro);
      console.log('🏢 Taxa abertura:', propostaCompleta.taxa_abertura);
      console.log('🎯 CAMPOS DE DESCONTO:');
      console.log('   percentual_desconto:', propostaCompleta.percentual_desconto);
      console.log('   porcentagem_desconto:', propostaCompleta.porcentagem_desconto);
      console.log('   valor_total:', propostaCompleta.valor_total);
      console.log('💰 CAMPO MENSALIDADE:');
      console.log('   propostaCompleta.valor_mensalidade:', propostaCompleta.valor_mensalidade);
      console.log('   typeof:', typeof propostaCompleta.valor_mensalidade);

      const servicos = extractCollection<Servico>(servicosResponse);

      setClienteCompleto(cliente);
      setTiposAtividade(Array.isArray(tipos) ? tipos : extractCollection<TipoAtividade>(tipos));
      setRegimesTributarios(Array.isArray(regimes) ? regimes : extractCollection<RegimeTributario>(regimes));
      setTodosServicos(servicos);

      // ⚠️ CONVERTER: Itens para servicosSelecionados
      const servicosSelecionados = (propostaCompleta.itens || []).map((item: any) => {
        const quantidade = Number(item.quantidade) || 0;
        const valorUnitario = Number(item.valor_unitario ?? item.valorUnitario ?? item.preco_unitario) || 0;
        const subtotal = Number(item.valor_total ?? quantidade * valorUnitario) || 0;
        const servicoRelacionado = item.servico || servicos.find((servico) => servico.id === Number(item.servico_id)) || null;

        return {
          servico_id: Number(item.servico_id) || 0,
          quantidade,
          valor_unitario: valorUnitario,
          subtotal,
          extras: {
            descricao_personalizada: typeof item.descricao_personalizada === 'string' ? item.descricao_personalizada : ''
          },
          servico: servicoRelacionado
        };
      });

      // ⚠️ DADOS FINANCEIROS: Do backend (valores corretos)
      const resumo = propostaCompleta.resumo_financeiro || {};
      const valorServicos = resumo.valor_servicos || 0;
      const taxaAbertura = resumo.taxa_abertura || 0;
      const valorMensalidade = resumo.valor_mensalidade || propostaCompleta.valor_mensalidade || 0;

      console.log('💰 DEBUG MENSALIDADE:');
      console.log('   resumo.valor_mensalidade:', resumo.valor_mensalidade);
      console.log('   propostaCompleta.valor_mensalidade:', propostaCompleta.valor_mensalidade);
      console.log('   valorMensalidade final:', valorMensalidade);
      const valorBase = resumo.valor_base || (valorServicos + taxaAbertura + valorMensalidade);
      const valorFinal = resumo.valor_final || propostaCompleta.valor_total;
      // ⚠️ CORRIGIDO: Usar o percentual salvo diretamente na proposta
      const descontoPercentual = propostaCompleta.percentual_desconto || propostaCompleta.porcentagem_desconto || 0;
      // ⚠️ CALCULAR: Valor do desconto baseado no percentual real
      const descontoValor = (valorBase * descontoPercentual) / 100;
      const descontoTipo = descontoPercentual > 0 ? 'percentual' : 'sem_desconto';

      console.log('💰 Valores financeiros corretos:', {
        valorServicos,
        taxaAbertura,
        valorMensalidade,
        valorBase,
        valorFinal,
        descontoValor,
        descontoPercentual,
        descontoTipo
      });

      // ⚠️ DEFINIR: Dados do estado
      setDados({
        tipo_atividade_id: propostaCompleta.tipo_atividade_id,
        regime_tributario_id: propostaCompleta.regime_tributario_id,
        faixa_faturamento_id: propostaCompleta.faixa_faturamento_id,
        servicosSelecionados: servicosSelecionados,

        // ⚠️ VALORES CORRETOS DO BACKEND
        valor_servicos: valorServicos,
        taxa_abertura: taxaAbertura,
        valor_mensalidade: valorMensalidade,
        valor_base: valorBase,
        valor_total: valorFinal,

        // ⚠️ DESCONTO REAL
        desconto_valor: descontoValor,
        desconto_percentual: descontoPercentual,
        desconto_tipo: descontoTipo,

        // Outros campos
        observacoes: limparObservacoes(propostaCompleta.observacoes || ''),
        status: normalizeStatus(propostaCompleta.status),
        data_validade: propostaCompleta.data_validade || '',

        // Campos obrigatórios da interface
        percentual_desconto: descontoPercentual,
        valor_desconto: Math.abs(descontoValor),

        // Flags da taxa de abertura
        taxa_abertura_aplicavel: propostaCompleta.taxa_abertura?.aplicavel || false,
        taxa_abertura_motivo: propostaCompleta.taxa_abertura?.motivo || ''
      });

      // Carregar faixas se necessário
      if (propostaCompleta.regime_tributario_id) {
        const faixas = await apiService.getFaixasFaturamento({
          regime_tributario_id: propostaCompleta.regime_tributario_id
        });
        setFaixasFaturamento(extractCollection<FaixaFaturamento>(faixas));
      }

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);

      // ✅ CORREÇÃO: Tratamento de erro mais específico
      let errorMessage = 'Erro ao carregar dados da proposta.';

      if (error instanceof Error) {
        if (error.message.includes('tipo_atividade_id é obrigatório')) {
          errorMessage = 'Erro: Tipo de atividade é obrigatório para carregar regimes tributários.';
        } else if (error.message.includes('regimes-tributarios')) {
          errorMessage = 'Erro ao carregar regimes tributários. Verifique a conexão.';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }

      showError('Erro na Validação', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ⚠️ CORRIGIDO: useEffect para recálculo automático
  useEffect(() => {
    // ⚠️ CALCULAR: Valor atual dos serviços
    const valorServicosAtual = dados.servicosSelecionados.reduce((sum, item) => sum + item.subtotal, 0);

    // ⚠️ RECALCULAR: Taxa de abertura se regime mudou  
    let taxaAberturaAtual = 0;
    if (dados.taxa_abertura_aplicavel && clienteCompleto?.abertura_empresa) {
      const regimeSelecionado = regimesTributarios.find(r => r.id === dados.regime_tributario_id);
      const codigoRegime = regimeSelecionado?.codigo || '';

      // ⚠️ REGRA: MEI = R$ 300, outros = R$ 1.000
      taxaAberturaAtual = codigoRegime.toUpperCase() === 'MEI' ? 300 : 1000;
    }

    // ⚠️ VALOR BASE: Serviços + Taxa + Mensalidade
    const valorBaseAtual = valorServicosAtual + taxaAberturaAtual + dados.valor_mensalidade;

    console.log('🧮 Cálculo do valor base:', {
      valorServicosAtual,
      taxaAberturaAtual,
      valor_mensalidade: dados.valor_mensalidade,
      valorBaseAtual
    });

    // ⚠️ APLICAR: Desconto ao valor base
    const descontoValor = (valorBaseAtual * dados.percentual_desconto) / 100;
    const valorTotalFinal = valorBaseAtual - descontoValor;

    // ⚠️ TIPO DE DESCONTO
    let tipoDesconto = 'sem_desconto';
    if (descontoValor > 0) {
      tipoDesconto = 'desconto';
    } else if (descontoValor < 0) {
      tipoDesconto = 'acrescimo';
    }

    // ⚠️ ATUALIZAR: Estado com valores recalculados
    setDados((prev: DadosProposta) => ({
      ...prev,
      valor_servicos: valorServicosAtual,
      taxa_abertura: taxaAberturaAtual,
      valor_base: valorBaseAtual,
      valor_total: valorTotalFinal, // ⚠️ VALOR TOTAL ATUALIZADO
      desconto_valor: descontoValor,
      desconto_percentual: dados.percentual_desconto, // ⚠️ USAR DESCONTO INFORMADO
      desconto_tipo: tipoDesconto,
      valor_desconto: Math.abs(descontoValor) // ⚠️ VALOR DO DESCONTO
    }));

    console.log('💰 Valores recalculados:', {
      valorServicosAtual,
      taxaAberturaAtual,
      valorMensalidade: dados.valor_mensalidade,
      valorBaseAtual,
      percentualDesconto: dados.percentual_desconto,
      descontoValor,
      valorTotalFinal,
      tipoDesconto
    });

  }, [dados.servicosSelecionados, dados.regime_tributario_id, dados.percentual_desconto, dados.valor_mensalidade, clienteCompleto, regimesTributarios, dados.taxa_abertura_aplicavel]);

  // Alterar regime tributário
  const handleRegimeChange = async (regimeId: number) => {
    setDados((prev: DadosProposta) => ({
      ...prev,
      regime_tributario_id: regimeId,
      faixa_faturamento_id: null
    }));

    if (regimeId > 0) {
      try {
        const faixas = await apiService.getFaixasFaturamento({
          regime_tributario_id: regimeId
        });
        setFaixasFaturamento(faixas || []);
      } catch (error) {
        console.error('Erro ao carregar faixas:', error);
      }
    } else {
      setFaixasFaturamento([]);
    }
  };

  // Função para lidar com mensalidade encontrada
  const handleMensalidadeEncontrada = (mensalidade: any) => {
    console.log('💰 Mensalidade encontrada no callback:', mensalidade);
    console.log('💰 Estado atual dos dados:', dados);
    // Aqui podemos adicionar lógica adicional se necessário
  };

  // Salvar alterações corrigido
  const handleSalvar = async () => {
    setSalvando(true);
    setRegenerandoPDF(true);
    try {
      // ⚠️ CALCULAR: Valor total baseado no desconto
      const valorServicos = dados.servicosSelecionados.reduce((sum, item) => sum + item.subtotal, 0);
      const taxaAbertura = dados.taxa_abertura || 0;
      const valorMensalidade = dados.valor_mensalidade || 0;
      const valorBase = valorServicos + taxaAbertura + valorMensalidade;

      // ⚠️ APLICAR: Desconto ao valor base
      const descontoValor = (valorBase * dados.percentual_desconto) / 100;
      const valorTotalFinal = valorBase - descontoValor;

      // Preparar dados para API
      const dadosUpdate = {
        tipo_atividade_id: dados.tipo_atividade_id,
        regime_tributario_id: dados.regime_tributario_id,
        faixa_faturamento_id: dados.faixa_faturamento_id,
        status: dados.status,
        valor_total: valorTotalFinal, // ⚠️ VALOR RECALCULADO
        valor_mensalidade: valorMensalidade, // ⚠️ VALOR DA MENSALIDADE
        percentual_desconto: dados.percentual_desconto, // ⚠️ DESCONTO INCLUÍDO
        data_validade: dados.data_validade,
        observacoes: montarObservacoesCompletas(),
        // Flag para indicar que deve regenerar PDF
        regenerar_pdf: true,
        // Incluir itens atualizados
        itens: dados.servicosSelecionados.map(servico => ({
          servico_id: servico.servico_id,
          quantidade: servico.quantidade,
          valor_unitario: servico.valor_unitario,
          valor_total: servico.subtotal,
          descricao_personalizada: servico.extras?.descricao_personalizada || null
        }))
      };

      console.log('💾 Salvando dados:', dadosUpdate);

      await apiService.updateProposta(proposta!.id, dadosUpdate);

      console.log(`✅ Proposta #${proposta!.numero} atualizada completamente`);

      // Mostrar feedback sobre regeneração de PDF
      if (valorMensalidade > 0) {
        showSuccess('Proposta Atualizada', 'Proposta atualizada com sucesso! O PDF será regenerado automaticamente com a nova mensalidade.');
      } else {
        showSuccess('Proposta Atualizada', 'Proposta atualizada com sucesso!');
      }

      onSaved();
      onClose();

    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      showError('Erro ao Salvar', 'Erro ao salvar alterações. Tente novamente.');
    } finally {
      setSalvando(false);
      setRegenerandoPDF(false);
    }
  };

  // Funções auxiliares corrigidas
  const limparObservacoes = (observacoes: string): string => {
    return observacoes?.replace(/--- INFORMAÇÕES DE DESCONTO ---[\s\S]*?--- FIM INFORMAÇÕES DESCONTO ---/g, '').trim() || '';
  };

  const montarObservacoesCompletas = (): string => {
    let observacoesCompletas = dados.observacoes;

    if (dados.percentual_desconto > 0) {
      const infoDesconto = [
        '--- INFORMAÇÕES DE DESCONTO ---',
        `Percentual de desconto: ${dados.percentual_desconto.toFixed(1)}%`,
        `Valor do desconto: R$ ${dados.valor_desconto.toFixed(2)}`,
        `Valor dos serviços: R$ ${dados.valor_servicos.toFixed(2)}`,
        `Valor da mensalidade: R$ ${dados.valor_mensalidade.toFixed(2)}`,
        `Valor final: R$ ${dados.valor_total.toFixed(2)}`,
        `Requer aprovação: ${dados.percentual_desconto > 20 ? 'Sim' : 'Não'}`,
        '--- FIM INFORMAÇÕES DESCONTO ---'
      ].join('\n');

      observacoesCompletas = observacoesCompletas
        ? `${observacoesCompletas}\n\n${infoDesconto}`
        : infoDesconto;
    }

    return observacoesCompletas;
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (!isOpen || !proposta) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Proposta Completa - #${proposta.numero}${clienteCompleto ? ` - ${clienteCompleto.nome}` : ''}`}
      size="xl"
      className="w-full max-w-6xl h-[85vh] max-h-[700px]"
    >
      <div className="flex flex-col h-full">

        {loading ? (
          <div className="p-12 text-center flex-1">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados da proposta...</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Navegação lateral */}
            <div className="w-80 bg-gray-50 border-r flex-shrink-0 overflow-y-auto">
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-4">Seções Editáveis</h4>

                {/* Abas de navegação */}
                <div className="space-y-2 mb-6">
                  {[
                    {
                      id: 'configuracoes',
                      nome: 'Configurações Tributárias',
                      icone: <Settings className="w-4 h-4" />,
                      descricao: 'Tipo de atividade, regime tributário, faixa de faturamento'
                    },
                    {
                      id: 'servicos',
                      nome: 'Serviços',
                      icone: <List className="w-4 h-4" />,
                      descricao: 'Serviços selecionados, quantidades e valores'
                    },
                    {
                      id: 'finalizacao',
                      nome: 'Finalização',
                      icone: <CheckCircle className="w-4 h-4" />,
                      descricao: 'Status, desconto, observações e validade'
                    }
                  ].map((aba) => (
                    <button
                      key={aba.id}
                      onClick={() => setAbaSelecionada(aba.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors border ${abaSelecionada === aba.id
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 ${abaSelecionada === aba.id ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                          {aba.icone}
                        </div>
                        <div>
                          <h5 className="font-medium text-sm">{aba.nome}</h5>
                          <p className="text-xs text-gray-500 mt-1">{aba.descricao}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Dados do cliente (corrigido) */}
                {clienteCompleto && (
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      Cliente (não editável)
                    </h5>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div>
                        <span className="font-medium text-gray-900 block">{clienteCompleto.nome}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">CPF:</span> {clienteCompleto.cpf}
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span> {clienteCompleto.email}
                      </div>
                      <div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${clienteCompleto.abertura_empresa
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {clienteCompleto.abertura_empresa ? 'Abertura de Empresa' : 'Cliente Existente'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumo de valores */}
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    Resumo Financeiro
                  </h5>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor dos serviços:</span>
                      <span className="font-medium">{formatarMoeda(dados.valor_servicos)}</span>
                    </div>

                    {/* ⚠️ TAXA DE ABERTURA CORRIGIDA */}
                    {dados.taxa_abertura > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxa de abertura:</span>
                        <span className="font-medium text-orange-600">{formatarMoeda(dados.taxa_abertura)}</span>
                      </div>
                    )}

                    {/* ⚠️ MENSALIDADE AUTOMÁTICA */}
                    {dados.valor_mensalidade > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mensalidade:</span>
                        <span className="font-medium text-green-600">{formatarMoeda(dados.valor_mensalidade)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Subtotal geral:</span>
                      <span className="font-medium">{formatarMoeda(dados.valor_servicos + dados.taxa_abertura + dados.valor_mensalidade)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor final:</span>
                      <span className="font-medium text-blue-600">{formatarMoeda(dados.valor_servicos + dados.taxa_abertura + dados.valor_mensalidade - dados.valor_desconto)}</span>
                    </div>

                    {/* ⚠️ DESCONTO REAL */}
                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {dados.desconto_tipo === 'desconto' ? 'Desconto aplicado:' :
                            dados.desconto_tipo === 'acrescimo' ? 'Acréscimo aplicado:' : 'Diferença:'}
                        </span>
                        <span className={`font-medium ${dados.desconto_tipo === 'desconto' ? 'text-green-600' :
                          dados.desconto_tipo === 'acrescimo' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                          {formatarMoeda(Math.abs(dados.desconto_valor))} ({dados.desconto_percentual.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* ⚠️ EXPLICAÇÃO DA FÓRMULA */}
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600-dark">
                      <p className="font-medium">Fórmula do desconto:</p>
                      <p>Base ({formatarMoeda(dados.valor_base)}) - Final ({formatarMoeda(dados.valor_total)}) = {formatarMoeda(dados.desconto_valor)}</p>
                      {dados.taxa_abertura > 0 && (
                        <p className="text-orange-700 mt-1">
                          💡 {dados.taxa_abertura_motivo}
                        </p>
                      )}
                      {dados.valor_mensalidade > 0 && (
                        <p className="text-green-700 mt-1">
                          💡 Mensalidade automática: {formatarMoeda(dados.valor_mensalidade)}
                        </p>
                      )}
                    </div>

                    {/* ⚠️ AVISO PARA DESCONTO ALTO */}
                    {dados.desconto_percentual > 20 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        ⚠️ {dados.desconto_tipo === 'desconto' ? 'Desconto' : 'Acréscimo'} acima de 20% requer aprovação administrativa
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo principal */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-6 h-full">
                {abaSelecionada === 'configuracoes' && (
                  <ConfiguracoesTributariasEdit
                    dados={dados}
                    setDados={setDados}
                    tiposAtividade={tiposAtividade}
                    regimesTributarios={regimesTributarios}
                    faixasFaturamento={faixasFaturamento}
                    onRegimeChange={handleRegimeChange}
                    onMensalidadeEncontrada={handleMensalidadeEncontrada}
                  />
                )}

                {abaSelecionada === 'servicos' && (
                  <ServicosEditCorrigido
                    dados={dados}
                    setDados={setDados}
                    todosServicos={todosServicos}
                    formatarMoeda={formatarMoeda}
                  />
                )}

                {abaSelecionada === 'finalizacao' && (
                  <FinalizacaoEditCorrigida
                    dados={dados}
                    setDados={setDados}
                    formatarMoeda={formatarMoeda}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer fixo */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Editando:</span> {
              abaSelecionada === 'configuracoes' ? 'Configurações Tributárias' :
                abaSelecionada === 'servicos' ? 'Serviços' : 'Finalização'
            }
          </div>

          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSalvar}
              disabled={salvando || loading}
              loading={salvando}
              leftIcon={!salvando ? <Save className="w-4 h-4" /> : undefined}
            >
              {salvando && regenerandoPDF ? 'Regenerando PDF...' :
                salvando ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Componente de Configurações Tributárias
const ConfiguracoesTributariasEdit: React.FC<{
  dados: DadosProposta;
  setDados: (dados: DadosProposta) => void;
  tiposAtividade: TipoAtividade[];
  regimesTributarios: RegimeTributario[];
  faixasFaturamento: FaixaFaturamento[];
  onRegimeChange: (regimeId: number) => void;
  onMensalidadeEncontrada?: (mensalidade: any) => void;
}> = ({ dados, setDados, tiposAtividade, regimesTributarios, faixasFaturamento, onRegimeChange, onMensalidadeEncontrada }) => {

  const [buscandoMensalidade, setBuscandoMensalidade] = useState(false);
  const [mensalidadeEncontrada, setMensalidadeEncontrada] = useState<any>(null);

  // Função para buscar mensalidade automática
  const buscarMensalidadeAutomatica = async () => {
    if (!dados.tipo_atividade_id || !dados.regime_tributario_id) {
      console.log('❌ Configurações incompletas para buscar mensalidade:', {
        tipo_atividade_id: dados.tipo_atividade_id,
        regime_tributario_id: dados.regime_tributario_id,
        faixa_faturamento_id: dados.faixa_faturamento_id
      });
      return;
    }

    // Se estamos editando uma proposta e ela já tem mensalidade, não sobrescrever
    if (proposta && dados.valor_mensalidade && dados.valor_mensalidade > 0) {
      console.log('📝 Modo edição - mantendo mensalidade existente:', dados.valor_mensalidade);
      return;
    }

    console.log('🔍 Buscando mensalidade automática com configuração:', {
      tipo_atividade_id: dados.tipo_atividade_id,
      regime_tributario_id: dados.regime_tributario_id,
      faixa_faturamento_id: dados.faixa_faturamento_id
    });

    setBuscandoMensalidade(true);
    try {
      const configuracao = {
        tipo_atividade_id: dados.tipo_atividade_id,
        regime_tributario_id: dados.regime_tributario_id,
        faixa_faturamento_id: dados.faixa_faturamento_id || undefined
      };

      const response = await apiService.buscarMensalidadeAutomatica(configuracao);

      console.log('📊 Resposta da API de mensalidade:', response);

      // O backend retorna { mensalidadeSugerida: ... } ou { mensalidade_sugerida: ... }
      const mensalidadeEncontrada = response?.mensalidadeSugerida || response?.mensalidade_sugerida || response?.data?.valor_mensalidade;

      if (mensalidadeEncontrada) {
        console.log('✅ Mensalidade encontrada:', mensalidadeEncontrada);
        setMensalidadeEncontrada(response);
        const dadosAtualizados = { ...dados, valor_mensalidade: Number(mensalidadeEncontrada) };
        setDados(dadosAtualizados);
        onMensalidadeEncontrada?.(response);
      } else {
        console.log('❌ Nenhuma mensalidade encontrada para esta configuração');
        setMensalidadeEncontrada(null);
        const dadosAtualizados = { ...dados, valor_mensalidade: 0 };
        setDados(dadosAtualizados);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar mensalidade automática:', error);
      setMensalidadeEncontrada(null);
      setDados(prev => ({ ...prev, valor_mensalidade: 0 }));
    } finally {
      setBuscandoMensalidade(false);
    }
  };

  // Buscar mensalidade quando configurações mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarMensalidadeAutomatica();
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timer);
  }, [dados.tipo_atividade_id, dados.regime_tributario_id, dados.faixa_faturamento_id]);

  const handleTipoAtividadeChange = (tipoId: number) => {
    setDados(prev => ({ ...prev, tipo_atividade_id: tipoId }));
  };

  const handleFaixaFaturamentoChange = (faixaId: number | null) => {
    setDados(prev => ({ ...prev, faixa_faturamento_id: faixaId }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Tributárias</h3>
        <p className="text-gray-600 text-sm mb-6">
          Altere o tipo de atividade, regime tributário e faixa de faturamento da proposta.
        </p>
      </div>

      {/* Tipo de Atividade */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Atividade
        </label>
        <select
          value={dados.tipo_atividade_id}
          onChange={(e) => handleTipoAtividadeChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={0}>Selecione um tipo de atividade</option>
          {tiposAtividade.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome} ({tipo.codigo})
            </option>
          ))}
        </select>
      </div>

      {/* Regime Tributário */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Regime Tributário
        </label>
        <select
          value={dados.regime_tributario_id}
          onChange={(e) => onRegimeChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={0}>Selecione um regime tributário</option>
          {regimesTributarios.map((regime) => (
            <option key={regime.id} value={regime.id}>
              {regime.nome} ({regime.codigo})
            </option>
          ))}
        </select>
      </div>

      {/* Faixa de Faturamento */}
      {faixasFaturamento.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faixa de Faturamento
          </label>
          <select
            value={dados.faixa_faturamento_id || ''}
            onChange={(e) => handleFaixaFaturamentoChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Nenhuma faixa específica</option>
            {faixasFaturamento.map((faixa) => (
              <option key={faixa.id} value={faixa.id}>
                R$ {faixa.valor_inicial.toFixed(2)} até {faixa.valor_final ? `R$ ${faixa.valor_final.toFixed(2)}` : 'ilimitado'} ({faixa.aliquota}%)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Card de Mensalidade Automática */}
      {(buscandoMensalidade || mensalidadeEncontrada) && (
        <div className={`border rounded-lg p-4 ${mensalidadeEncontrada
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className={`w-5 h-5 mr-2 ${mensalidadeEncontrada ? 'text-green-600' : 'text-blue-600'
                }`} />
              <div>
                <h4 className={`font-medium ${mensalidadeEncontrada ? 'text-green-900' : 'text-blue-900'
                  }`}>
                  Mensalidade Automática
                </h4>
                {buscandoMensalidade ? (
                  <p className="text-sm text-blue-700">Buscando mensalidade...</p>
                ) : mensalidadeEncontrada ? (
                  <div className="text-sm">
                    <p className={`${mensalidadeEncontrada ? 'text-green-700' : 'text-blue-700'
                      }`}>
                      ✅ Valor encontrado: <span className="font-semibold text-lg">
                        R$ {mensalidadeEncontrada.valor_mensalidade.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Este valor será incluído automaticamente na proposta
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700">Nenhuma mensalidade encontrada para esta configuração</p>
                )}
              </div>
            </div>
            {buscandoMensalidade && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Serviços corrigido
const ServicosEditCorrigido: React.FC<{
  dados: DadosProposta;
  setDados: (dados: DadosProposta) => void;
  todosServicos: Servico[];
  formatarMoeda: (valor: number) => string;
}> = ({ dados, setDados, todosServicos, formatarMoeda }) => {

  const adicionarServico = () => {
    const novoServico: DadosProposta['servicosSelecionados'][number] = {
      servico_id: 0,
      quantidade: 1,
      valor_unitario: 0,
      subtotal: 0,
      extras: {
        descricao_personalizada: ''
      },
      servico: null
    };

    setDados((prev) => ({
      ...prev,
      servicosSelecionados: [...prev.servicosSelecionados, novoServico]
    }));
  };

  const removerServico = (index: number) => {
    setDados((prev) => ({
      ...prev,
      servicosSelecionados: prev.servicosSelecionados.filter((_, i) => i !== index)
    }));
  };

  const atualizarServico = (index: number, campo: string, valor: any) => {
    setDados((prev) => ({
      ...prev,
      servicosSelecionados: prev.servicosSelecionados.map((servico, i) => {
        if (i === index) {
          const servicoAtualizado = { ...servico };

          if (campo === 'servico_id') {
            const servicoId = Number(valor) || 0;
            const servicoCompleto = todosServicos.find((s) => s.id === servicoId);
            servicoAtualizado.servico_id = servicoId;
            servicoAtualizado.servico = servicoCompleto;
            if (servicoCompleto) {
              const valorUnitario = Number(servicoCompleto.valor_base ?? servicoCompleto.valor_unitario ?? 0) || 0;
              servicoAtualizado.valor_unitario = valorUnitario;
              servicoAtualizado.subtotal = servicoAtualizado.quantidade * valorUnitario;
            }
          } else {
            servicoAtualizado[campo as 'quantidade' | 'valor_unitario'] = valor;

            // Recalcular subtotal
            if (campo === 'quantidade' || campo === 'valor_unitario') {
              servicoAtualizado.subtotal = servicoAtualizado.quantidade * servicoAtualizado.valor_unitario;
            }
          }

          return servicoAtualizado;
        }
        return servico;
      })
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Serviços Selecionados</h3>
          <p className="text-gray-600 text-sm mt-1">
            Adicione, remova ou altere os serviços da proposta.
          </p>
        </div>

        <button
          onClick={adicionarServico}
          className="bg-custom-blue text-white px-4 py-2 rounded-lg hover:bg-custom-blue-light transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Serviço</span>
        </button>
      </div>

      <div className="space-y-4">
        {dados.servicosSelecionados.map((servico, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Serviço - 5 colunas */}
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serviço
                </label>
                <select
                  value={servico.servico_id}
                  onChange={(e) => atualizarServico(index, 'servico_id', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value={0}>Selecione um serviço</option>
                  {todosServicos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} - {formatarMoeda(s.valor_base)}
                    </option>
                  ))}
                </select>
                {servico.servico && (
                  <p className="text-xs text-gray-500 mt-1">
                    Categoria: {servico.servico.categoria}
                  </p>
                )}
              </div>

              {/* Quantidade - 2 colunas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={servico.quantidade}
                  onChange={(e) => atualizarServico(index, 'quantidade', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Valor Unitário - 2 colunas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Unit.
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={servico.valor_unitario}
                    onChange={(e) => atualizarServico(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Subtotal - 2 colunas */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtotal
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900">
                  {formatarMoeda(servico.subtotal)}
                </div>
              </div>

              {/* Ações - 1 coluna */}
              <div className="md:col-span-1 flex items-end">
                <button
                  onClick={() => removerServico(index)}
                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center justify-center"
                  title="Remover serviço"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Descrição personalizada */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Personalizada (Opcional)
              </label>
              <input
                type="text"
                value={servico.extras?.descricao_personalizada || ''}
                onChange={(e) => atualizarServico(index, 'extras', {
                  ...servico.extras,
                  descricao_personalizada: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Ex: Órgão de Classe: CRC-DF"
              />
            </div>
          </div>
        ))}

        {dados.servicosSelecionados.length === 0 && (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <List className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="font-medium">Nenhum serviço adicionado</p>
            <p className="text-sm">Clique em "Adicionar Serviço" para começar</p>
          </div>
        )}
      </div>

      {/* Resumo dos serviços */}
      {dados.servicosSelecionados.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-600-dark mb-2">Resumo dos Serviços</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-600-dark">Total de serviços:</span>
              <span className="font-medium text-blue-600-dark">{dados.servicosSelecionados.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600-dark">Valor total dos serviços:</span>
              <span className="font-medium text-blue-600-dark">{formatarMoeda(dados.valor_servicos)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de Finalização corrigido
const FinalizacaoEditCorrigida: React.FC<{
  dados: DadosProposta;
  setDados: (dados: DadosProposta) => void;
  formatarMoeda: (valor: number) => string;
}> = ({ dados, setDados, formatarMoeda }) => {

  // ✅ CORREÇÃO: Usar sistema unificado de status
  const statusOptions = Object.entries(STATUS_COLORS).map(([value, config]) => ({
    value,
    label: config.label,
    config
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Finalização da Proposta</h3>
        <p className="text-gray-600 text-sm">
          Configure o status, desconto, observações e validade da proposta.
        </p>
      </div>

      {/* Cálculo de desconto corrigido */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-medium text-orange-900 mb-3">💡 Como funciona o desconto</h4>
        <div className="text-sm text-orange-800 space-y-1">
          <p><strong>Fórmula:</strong> Valor Total = Valor dos Serviços - Desconto (%)</p>
          <p><strong>Exemplo:</strong> Se os serviços custam R$ 1.000 e você aplicar 10% de desconto, o valor total será R$ 900</p>
          <p className="text-orange-600 mt-2">⚠️ Desconto acima de 20% requer aprovação administrativa</p>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Status da Proposta
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              onClick={() => setDados((prev: any) => ({ ...prev, status: status.value }))}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${dados.status === status.value
                ? 'border-blue-500 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <StatusBadge
                status={status.value}
                size="sm"
                showIcon={true}
                showTooltip={false}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Desconto corrigido */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Desconto (%)
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={dados.percentual_desconto}
            onChange={(e) => setDados((prev: any) => ({
              ...prev,
              percentual_desconto: parseFloat(e.target.value) || 0
            }))}
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="0.0"
          />
          <span className="absolute right-3 top-2 text-gray-500">%</span>
        </div>

        <div className="mt-2 text-sm text-gray-600 space-y-1">
          <p>Valor dos serviços: <span className="font-medium">{formatarMoeda(dados.valor_servicos)}</span></p>
          <p>Valor do desconto: <span className="font-medium text-green-600">+{formatarMoeda(dados.valor_desconto)}</span></p>
          <p>Valor total final: <span className="font-bold text-blue-600">{formatarMoeda(dados.valor_total)}</span></p>
        </div>

        {dados.percentual_desconto > 20 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            ⚠️ Desconto acima de 20% requer aprovação administrativa
          </div>
        )}
      </div>

      {/* Data de Validade */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data de Validade
        </label>
        <input
          type="date"
          value={dados.data_validade ? new Date(dados.data_validade).toISOString().split('T')[0] : ''}
          onChange={(e) => setDados((prev: any) => ({ ...prev, data_validade: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          value={dados.observacoes}
          onChange={(e) => setDados((prev: any) => ({ ...prev, observacoes: e.target.value }))}
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Adicione observações específicas sobre a proposta..."
        />
        <p className="text-xs text-gray-500 mt-1">
          {dados.observacoes?.length || 0}/1000 caracteres
        </p>
      </div>
    </div>
  );
};
