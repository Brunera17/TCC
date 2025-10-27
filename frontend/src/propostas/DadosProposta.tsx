import { User, Settings, CheckCircle, Building } from 'lucide-react';
import type { DadosPropostaCompleta } from '../types/propostas';
import { formatarMoeda } from '../utils/formatters';
import { InfoCard } from '../components/common/InfoCard';

interface DadosPropostaProps {
  dadosProposta: DadosPropostaCompleta;
}

export const DadosProposta: React.FC<DadosPropostaProps> = ({ dadosProposta }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <User className="w-5 h-5 mr-2 text-custom-blue" />
        Dados da Proposta
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cliente */}
        <InfoCard title="Cliente" icon={<User className="w-4 h-4" />} variant="info">
          <div className="bg-gradient-to-r from-custom-blue-light to-indigo-50 rounded-lg p-4 border border-custom-blue">
            <p className="font-semibold text-gray-900 text-lg">{dadosProposta.cliente.nome}</p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600 flex items-center">
                <span className="font-medium">CPF:</span>
                <span className="ml-2">{dadosProposta.cliente.cpf}</span>
              </p>
              <p className="text-sm text-gray-600 flex items-center">
                <span className="font-medium">Email:</span>
                <span className="ml-2">{dadosProposta.cliente.email}</span>
              </p>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${dadosProposta.cliente.abertura_empresa
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                {dadosProposta.cliente.abertura_empresa ? (
                  <>
                    <Building className="w-3 h-3 mr-1" />
                    Abertura de Empresa
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Cliente Existente
                  </>
                )}
              </span>
            </div>
          </div>
        </InfoCard>

        {/* Configurações Tributárias */}
        <InfoCard title="Configurações Tributárias" icon={<Settings className="w-4 h-4" />} variant="success">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Atividade</span>
                <p className="font-semibold text-gray-900">{dadosProposta.tipoAtividade.nome}</p>
                <p className="text-xs text-gray-600">Código: {dadosProposta.tipoAtividade.codigo}</p>
              </div>

              <div className="border-t border-green-100 pt-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Regime Tributário</span>
                <p className="font-medium text-gray-900">{dadosProposta.regimeTributario.nome}</p>
                <p className="text-xs text-gray-600">Código: {dadosProposta.regimeTributario.codigo}</p>
              </div>

              {dadosProposta.faixaFaturamento ? (
                <div className="border-t border-green-100 pt-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Faixa de Faturamento</span>
                  <p className="text-sm text-gray-900">
                    {formatarMoeda(dadosProposta.faixaFaturamento.valor_inicial)} até{' '}
                    {dadosProposta.faixaFaturamento.valor_final
                      ? formatarMoeda(dadosProposta.faixaFaturamento.valor_final)
                      : 'ilimitado'
                    }
                  </p>
                  <p className="text-xs text-gray-600">
                    Alíquota: {dadosProposta.faixaFaturamento.aliquota}%
                  </p>
                </div>
              ) : (
                <div className="border-t border-green-100 pt-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Faixa de Faturamento</span>
                  <p className="text-sm text-gray-500 italic">Não aplicável para este regime</p>
                </div>
              )}
            </div>
          </div>
        </InfoCard>
      </div>
    </div>
  );
};
