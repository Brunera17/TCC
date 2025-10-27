import { AlertTriangle, Clock, Shield } from 'lucide-react';

interface ModalConfirmacaoDescontoProps {
  isOpen: boolean;
  percentualDesconto: number;
  valorDesconto: number;
  totalOriginal: number;
  totalFinal: number;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Função para formatar moeda
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const ModalConfirmacaoDesconto: React.FC<ModalConfirmacaoDescontoProps> = ({
  isOpen,
  percentualDesconto,
  valorDesconto,
  totalOriginal,
  totalFinal,
  onConfirmar,
  onCancelar
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="overflow-hidden shadow-xl max-w-md w-full mx-4">
        {/* Header - CORREÇÃO: SEM rounded-t-xl */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold">Confirmação de Desconto Excepcional</h3>
              <p className="text-orange-100 text-sm">Desconto acima do limite padrão</p>
            </div>
          </div>
        </div>

        {/* Content - CORREÇÃO: COM bg-white */}
        <div className="bg-white p-6">
          <div className="space-y-4">
            {/* Resumo do desconto */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800 mb-2">Resumo do Desconto:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor original:</span>
                  <span className="font-medium">{formatarMoeda(totalOriginal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Desconto ({percentualDesconto}%):</span>
                  <span className="font-medium text-red-600">-{formatarMoeda(valorDesconto)}</span>
                </div>
                <div className="border-t border-orange-200 pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-800">Valor final:</span>
                    <span className="font-bold text-green-600 text-lg">{formatarMoeda(totalFinal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Avisos importantes */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-orange-800">Este desconto requer aprovação administrativa</p>
                  <p>A proposta será enviada para análise antes de ser apresentada ao cliente.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-blue-800">Tempo de aprovação</p>
                  <p>Estimativa: 1-2 dias úteis para análise administrativa.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-green-800">Processo seguro</p>
                  <p>Você poderá acompanhar o status da aprovação no painel de propostas.</p>
                </div>
              </div>
            </div>

            {/* Pergunta de confirmação */}
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="font-medium text-gray-800">
                Deseja prosseguir com este desconto de {percentualDesconto}%?
              </p>
              <p className="text-sm text-gray-600 mt-1">
                A proposta será encaminhada para aprovação administrativa.
              </p>
            </div>
          </div>
        </div>

        {/* Actions - CORREÇÃO: COM bg-white */}
        <div className="bg-white px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-lg hover:from-orange-600 hover:to-red-600 transition-colors"
          >
            Confirmar e Prosseguir
          </button>
        </div>
      </div>
    </div>
  );
};
