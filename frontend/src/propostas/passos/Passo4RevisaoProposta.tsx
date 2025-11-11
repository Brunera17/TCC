import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, User, Settings, List, Calculator, Percent, AlertTriangle } from 'lucide-react';
// 1. Importar componentes de UI
import { PageHeader, Card, ErrorMessage } from '../../components/ui';
import { Button, Input, Textarea } from '../../components/forms';
import { ClienteDisplay } from '../../components/common/ClienteDisplay';
import { apiService } from '../../lib/api';
import type { PropostaComDesconto, DadosPropostaCompleta } from '../../types/propostas';
import type { Servico } from '../../types';
import { usePropostaCalculations } from '../../hooks/usePropostaCalculations';

interface Passo4Props {
  dadosProposta: DadosPropostaCompleta;
  propostaId?: number;
  propostaNumero?: string;
  onVoltar: () => void;
  onProximo: (dadosComDesconto: PropostaComDesconto) => void;
  todosServicos: Servico[];
}

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const Passo4RevisaoProposta: React.FC<Passo4Props> = ({
  dadosProposta,
  propostaId,
  propostaNumero,
  onVoltar,
  onProximo,
  todosServicos
}) => {
  const [percentualDesconto, setPercentualDesconto] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const valorMensalidade = dadosProposta.valor_mensalidade || 0;
  const mensalidadeEncontrada = dadosProposta.mensalidade_encontrada || false;

  const resumoFinanceiro = usePropostaCalculations(
    dadosProposta,
    percentualDesconto,
    todosServicos,
    valorMensalidade
  );

  const requerAprovacao = percentualDesconto > 20;

  const handleAvancar = async () => {
    if (requerAprovacao && !observacoes.trim()) {
      setError('Observações são obrigatórias para descontos acima de 20%');
      return;
    }
    if (!propostaId) {
      setError('ID da proposta não encontrado');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dadosAtualizacao = {
        valor_total: resumoFinanceiro.totalFinal,
        percentual_desconto: percentualDesconto,
        valor_desconto: resumoFinanceiro.valorDesconto,
        valor_mensalidade: valorMensalidade,
        requer_aprovacao: requerAprovacao,
        observacoes: observacoes.trim() || null,
        status: requerAprovacao ? 'enviada' : 'aceita'
      };

      await apiService.updateProposta(propostaId, dadosAtualizacao);

      const dadosComDesconto: PropostaComDesconto = {
        ...dadosProposta,
        percentualDesconto,
        valorDesconto: resumoFinanceiro.valorDesconto,
        totalFinal: resumoFinanceiro.totalFinal,
        requerAprovacao,
        observacoes: observacoes.trim() || undefined,
        propostaId,
        propostaNumero
      };

      onProximo(dadosComDesconto);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 2. Renderização Padronizada
  return (
    <div className="pb-32">
      <PageHeader
        title="Nova Proposta - Passo 4"
        subtitle="Revise todos os dados antes de finalizar a proposta"
      >
        <Button variant="ghost" onClick={onVoltar} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
      </PageHeader>

      {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-4" />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card do Cliente */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Cliente
          </h3>
          <ClienteDisplay
            cliente={dadosProposta.cliente}
            showDetails={true}
            className="!p-0 !border-0 !shadow-none" // Resetar estilos do Card interno
          />
        </Card>

        {/* Card das Configurações */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-gray-600" />
            Configurações Tributárias
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-700">Atividade</p>
              <p className="text-gray-900">{dadosProposta.tipoAtividade.nome}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Regime Tributário</p>
              <p className="text-gray-900">{dadosProposta.regimeTributario.nome}</p>
            </div>
            {dadosProposta.faixaFaturamento && (
              <div>
                <p className="font-medium text-gray-700">Faixa de Faturamento</p>
                <p className="text-gray-900">{dadosProposta.faixaFaturamento.nome}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Card da Mensalidade */}
        {(valorMensalidade > 0 || mensalidadeEncontrada) && (
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-green-600" />
              Mensalidade Automática
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-gray-700">Valor Mensal:</span>
              <span className="text-2xl font-bold text-green-700">
                {valorMensalidade === 0 ? 'A Combinar' : formatarMoeda(valorMensalidade)}
              </span>
            </div>
            {valorMensalidade === 0 && (
              <p className="text-sm text-yellow-800 mt-2 p-2 bg-yellow-100 rounded">
                Valor será definido manualmente (Pessoa Física ou faturamento não coberto).
              </p>
            )}
          </Card>
        )}

        {/* Card dos Serviços */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <List className="w-5 h-5 mr-2 text-purple-600" />
            Serviços Selecionados
          </h3>
          <div className="space-y-3">
            {dadosProposta.servicosSelecionados.map((servico, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {todosServicos.find(s => s.id === servico.servico_id)?.nome || `Serviço ID: ${servico.servico_id}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {servico.quantidade} × {formatarMoeda(servico.valor_unitario)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatarMoeda(servico.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Card de Desconto */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Percent className="w-5 h-5 mr-2 text-orange-600" />
            Aplicar Desconto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percentualDesconto}
                onChange={(e) => setPercentualDesconto(Math.max(0, Math.min(100, Number(e.target.value))))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Desconto</label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-900 font-medium">
                -{formatarMoeda(resumoFinanceiro.valorDesconto)}
              </div>
            </div>
            {requerAprovacao && (
              <div className="flex items-center space-x-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <p className="text-sm text-orange-800 font-medium">Requer Aprovação</p>
              </div>
            )}
          </div>
        </Card>

        {/* Card de Resumo Final */}
        <Card className="lg:col-span-2 bg-gray-800 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-300">Total da Proposta</p>
              <p className="text-3xl font-bold">{formatarMoeda(resumoFinanceiro.totalFinal)}</p>
              {resumoFinanceiro.valorDesconto > 0 && (
                <p className="text-sm text-gray-300">
                  Subtotal: {formatarMoeda(resumoFinanceiro.subtotalGeral)} (-{percentualDesconto}%)
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Serviços</p>
              <p className="text-xl font-semibold">{dadosProposta.servicosSelecionados.length}</p>
            </div>
          </div>
        </Card>

        {/* Card de Observações */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-600" />
            Observações Adicionais
          </h3>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder={requerAprovacao ? "Observações são obrigatórias..." : "Adicione condições especiais..."}
            rows={4}
            error={requerAprovacao && !observacoes.trim() ? "Campo obrigatório" : undefined}
          />
        </Card>
      </div>

      {/* 3. Rodapé Fixo Padronizado */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center">
          <div className="text-right">
            <p className="text-sm text-gray-600">Total da Proposta</p>
            <p className="text-xl font-bold text-gray-900">
              {formatarMoeda(resumoFinanceiro.totalFinal)}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onVoltar}
              disabled={loading}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Voltar
            </Button>
            <Button
              variant="primary"
              onClick={handleAvancar}
              disabled={loading || (requerAprovacao && !observacoes.trim())}
              loading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Finalizar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};