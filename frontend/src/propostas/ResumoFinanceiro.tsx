import { Calculator, Percent, AlertTriangle, CheckCircle, Info, Building, User } from 'lucide-react';
import type { ResumoFinanceiro as ResumoFinanceiroType } from '../types/propostas';
import { formatarMoeda } from '../utils/formatters';
import { validarDesconto } from '../utils/calculations';

interface ResumoFinanceiroProps {
  resumo: ResumoFinanceiroType;
  percentualDesconto: number;
  onDescontoChange: (valor: number) => void;
}

export const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({
  resumo,
  percentualDesconto,
  onDescontoChange
}) => {
  const validacaoDesconto = validarDesconto(percentualDesconto);

  const handleDescontoChange = (novoDesconto: number) => {
    const descontoLimitado = Math.max(0, Math.min(100, novoDesconto));
    onDescontoChange(descontoLimitado);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Calculator className="w-5 h-5 mr-2 text-custom-blue" />
        Valores e Desconto
      </h2>

      <div className="space-y-6">
        {/* Breakdown dos valores */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-3">Composição do Valor:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Serviços selecionados:</span>
              <span className="font-medium">{formatarMoeda(resumo.subtotalServicos)}</span>
            </div>

            {resumo.taxaAberturaEmpresa > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 flex items-center">
                  {resumo.ehMEI ? (
                    <User className="w-4 h-4 mr-1 text-orange-500" />
                  ) : (
                    <Building className="w-4 h-4 mr-1 text-green-500" />
                  )}
                  Taxa abertura {resumo.tipoAbertura}:
                </span>
                <span className={`font-medium ${resumo.ehMEI ? 'text-orange-600' : 'text-green-600'}`}>
                  + {formatarMoeda(resumo.taxaAberturaEmpresa)}
                </span>
              </div>
            )}

            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800">Subtotal:</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatarMoeda(resumo.subtotalGeral)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controle de Desconto */}
        <div className="bg-gradient-to-r from-custom-blue-light to-indigo-50 rounded-xl p-6 border border-custom-blue">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Percent className="w-5 h-5 mr-2 text-custom-blue" />
              Aplicar Desconto
            </h3>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentualDesconto || ''}
                  onChange={(e) => handleDescontoChange(parseFloat(e.target.value) || 0)}
                  className="w-24 h-12 text-center text-lg font-bold border-2 border-custom-blue rounded-lg focus:ring-2 focus:ring-custom-blue focus:border-custom-blue transition-all"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-custom-blue font-bold">%</span>
              </div>

              <div className="bg-white rounded-lg px-4 py-3 border-2 border-red-200 min-w-[120px]">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Desconto</p>
                  <p className="text-lg font-bold text-red-600">
                    -{formatarMoeda(resumo.valorDesconto)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de progresso visual */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>0%</span>
              <span className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Limite 20%
              </span>
              <span>100%</span>
            </div>

            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-3">
                {/* Faixa permitida (0-20%) */}
                <div className="absolute left-0 top-0 h-3 bg-green-400 rounded-l-full" style={{ width: '20%' }}></div>
                {/* Faixa de atenção (20-100%) */}
                <div className="absolute left-[20%] top-0 h-3 bg-orange-200 rounded-r-full" style={{ width: '80%' }}></div>
                {/* Indicador atual */}
                <div
                  className={`absolute top-0 h-3 rounded-full transition-all duration-300 ${percentualDesconto <= 20 ? 'bg-green-600' : 'bg-orange-600'
                    }`}
                  style={{ width: `${Math.min(percentualDesconto, 100)}%` }}
                ></div>
              </div>

              {/* Marcador de 20% */}
              <div className="absolute top-0 left-[20%] transform -translate-x-1/2">
                <div className="w-1 h-3 bg-yellow-500"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full -mt-1 transform -translate-x-1/2"></div>
              </div>
            </div>

            {/* Indicador atual com posição dinâmica */}
            {percentualDesconto > 0 && (
              <div
                className="absolute transform -translate-x-1/2 mt-1"
                style={{ left: `${Math.min(percentualDesconto, 100)}%` }}
              >
                <div className="bg-white border-2 border-custom-blue rounded-lg px-2 py-1 shadow-lg">
                  <span className="text-xs font-bold text-custom-blue">{percentualDesconto.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Status visual */}
          <div className="mt-4">
            {percentualDesconto === 0 && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Info className="w-4 h-4" />
                <span className="text-sm">Nenhum desconto aplicado</span>
              </div>
            )}

            {percentualDesconto > 0 && percentualDesconto <= 20 && (
              <div className="flex items-center space-x-2 text-green-700 bg-green-100 rounded-lg px-3 py-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Desconto aprovado automaticamente</span>
              </div>
            )}

            {percentualDesconto > 20 && (
              <div className="flex items-center space-x-2 text-orange-700 bg-orange-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Requer aprovação do administrador</span>
              </div>
            )}
          </div>
        </div>

        {/* Aviso para desconto alto */}
        {validacaoDesconto.requerAprovacao && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-5">
            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 rounded-full p-2">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-orange-800 mb-2">
                  Atenção: Desconto Excepcional Aplicado
                </h4>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• Este desconto de <strong>{percentualDesconto}%</strong> excede o limite padrão de 20%</p>
                  <p>• A proposta será enviada para análise e aprovação do administrador</p>
                  <p>• O cliente receberá a proposta somente após aprovação administrativa</p>
                  <p>• Tempo estimado de aprovação: 1-2 dias úteis</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Final */}
        <div className="bg-gradient-to-r from-custom-blue to-custom-blue-dark rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-custom-blue-light text-sm font-medium">VALOR TOTAL DA PROPOSTA</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-bold">
                  {formatarMoeda(resumo.totalFinal)}
                </span>
                {percentualDesconto > 0 && (
                  <span className="text-custom-blue-light text-sm">
                    (economia de {formatarMoeda(resumo.valorDesconto)})
                  </span>
                )}
              </div>

              {/* Breakdown no total */}
              <div className="text-custom-blue-light text-xs mt-2 space-y-1">
                <div>Serviços: {formatarMoeda(resumo.subtotalServicos)}</div>
                {resumo.taxaAberturaEmpresa > 0 && (
                  <div>
                    {resumo.ehMEI ? 'Abertura MEI' : 'Abertura Empresa'}: {formatarMoeda(resumo.taxaAberturaEmpresa)}
                  </div>
                )}
                {percentualDesconto > 0 && (
                  <div>Desconto: -{formatarMoeda(resumo.valorDesconto)}</div>
                )}
              </div>
            </div>

            {percentualDesconto > 0 && (
              <div className="text-right">
                <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
                  <span className="text-custom-blue-light text-xs">Desconto aplicado</span>
                  <p className="text-xl font-bold text-white">-{percentualDesconto}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
