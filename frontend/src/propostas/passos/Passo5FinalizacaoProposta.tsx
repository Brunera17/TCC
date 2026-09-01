import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ArrowLeft,
  AlertTriangle,
  FileDown,
  FileText,
  Loader2 // 1. Usar Loader2
} from 'lucide-react';
import { apiService } from '../../lib/api';
// 2. Importar componentes de UI
import { Card, ErrorMessage } from '../../components/ui';
import { Button } from '../../components/forms';
import { useToast } from '../../context/ToastContext';

// ... (Interfaces e formatarMoeda permanecem as mesmas) ...
interface TipoAtividade { id: number; codigo?: string; nome: string; }
interface RegimeTributario { id: number; codigo?: string; nome: string; }
interface FaixaFaturamento { id: number; nome: string; valor_inicial: number; valor_final?: number; aliquota?: number; }
interface ServicoSelecionado { servico_id: number; quantidade: number; valor_unitario: number; subtotal: number; }
interface Cliente { id: number; nome: string; abertura_empresa: boolean; }
interface PropostaCompleta {
  cliente: Cliente;
  tipoAtividade: TipoAtividade;
  regimeTributario: RegimeTributario;
  faixaFaturamento?: FaixaFaturamento;
  servicosSelecionados: ServicoSelecionado[];
}
interface PropostaComDesconto extends PropostaCompleta {
  id?: number;
  percentualDesconto: number;
  valorDesconto: number;
  totalFinal: number;
  requerAprovacao: boolean;
  observacoes?: string;
}
interface PropostaResponse {
  id: number;
  numero: string;
  cliente_id: number;
  funcionario_responsavel_id?: number;
  tipo_atividade_id: number;
  regime_tributario_id: number;
  faixa_faturamento_id?: number;
  valor_total: number;
  status: string;
  data_criacao: string;
  data_atualizacao: string;
  ativo: boolean;
  pdf_gerado?: boolean;
  pdf_caminho?: string;
  pdf_data_geracao?: string;
}
interface Passo5Props {
  dadosCompletos: PropostaComDesconto;
  proposta: PropostaResponse;
  onVoltar: () => void;
  onNovaProposta: () => void;
}
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const Passo5FinalizacaoProposta: React.FC<Passo5Props> = ({
  dadosCompletos,
  proposta,
  onVoltar,
  onNovaProposta
}) => {
  const { showSuccess, showError } = useToast();
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [error, setError] = useState('');

  // Carregar todos os serviços (removido, não é mais necessário aqui)

  const gerarPDFProposta = async () => {
    try {
      setGerandoPDF(true);
      setError('');
      const response = await apiService.gerarPDFProposta(proposta.id);
      showSuccess('PDF Gerado', 'PDF gerado com sucesso! O arquivo foi salvo no servidor.');
      
      // 3. Abrir PDF em nova aba (opcional, mas útil)
      const blob = await apiService.visualizarPDFProposta(proposta.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

    } catch (error) {
      const msg = (error instanceof Error ? error.message : 'Erro desconhecido');
      showError('Erro ao Gerar PDF', msg);
      setError(msg);
    } finally {
      setGerandoPDF(false);
    }
  };

  // 4. Renderização Padronizada
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="text-center p-6 md:p-10">
        <div className="mx-auto mb-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-200">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Proposta Finalizada com Sucesso!
        </h1>
        <p className="text-gray-600 mb-8">
          A proposta foi salva e está pronta para ser enviada ao cliente.
        </p>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} className="mb-6" />}

        {/* Resumo em um Card interno */}
        <Card variant="bordered" className="mb-8 text-left p-4 md:p-6 bg-gray-50">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Número da proposta:</span>
              <span className="font-medium text-gray-900">#{proposta.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium text-gray-900">{dadosCompletos.cliente.nome}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Valor total:</span>
              <span className="font-bold text-green-600 text-lg">{formatarMoeda(dadosCompletos.totalFinal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {proposta.status}
              </span>
            </div>
            {dadosCompletos.requerAprovacao && (
              <div className="flex items-start space-x-2 rounded-lg border border-orange-200 bg-orange-50 p-3 mt-4">
                <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-orange-800 text-sm">
                  Esta proposta requer aprovação administrativa devido ao desconto aplicado.
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Ações Padronizadas */}
        <div className="space-y-4">
          <Button
            variant="primary"
            size="lg"
            onClick={gerarPDFProposta}
            loading={gerandoPDF}
            leftIcon={gerandoPDF ? undefined : <FileDown className="w-5 h-5" />}
            className="w-full"
          >
            {gerandoPDF ? 'Gerando PDF...' : 'Gerar e Visualizar PDF'}
          </Button>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={onVoltar}
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              variant="success"
              size="lg"
              onClick={onNovaProposta}
              leftIcon={<FileText className="w-5 h-5" />}
              className="flex-1"
            >
              Nova Proposta
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};