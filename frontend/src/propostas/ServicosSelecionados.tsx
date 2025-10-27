import { List, User, Building } from 'lucide-react';
import type { DadosPropostaCompleta, ResumoFinanceiro } from '../types/propostas';
import { formatarMoeda } from '../utils/formatters';

interface ServicosSelecionadosProps {
  dadosProposta: DadosPropostaCompleta;
  resumoFinanceiro: ResumoFinanceiro;
  todosServicos?: any[];
}

export const ServicosSelecionados: React.FC<ServicosSelecionadosProps> = ({
  dadosProposta,
  resumoFinanceiro,
  todosServicos = []
}) => {

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <List className="w-5 h-5 mr-2 text-custom-blue" />
        Serviços Selecionados
      </h2>

      <div className="space-y-6">
        {Array.from(resumoFinanceiro.subtotalPorCategoria.entries()).map(([categoria, totalCategoria]) => {
          const servicosCategoria = dadosProposta.servicosSelecionados.filter(item => {
            const servico = todosServicos.find(s => s.id === item.servico_id);
            return servico?.categoria === categoria;
          });

          if (servicosCategoria.length === 0) return null;

          return (
            <div key={categoria} className="border-l-4 border-custom-blue pl-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-medium text-gray-900 capitalize flex items-center">
                  <span className="w-3 h-3 bg-custom-blue rounded-full mr-2"></span>
                  {categoria.toLowerCase()}
                </h3>
                <span className="text-lg font-semibold text-custom-blue">
                  {formatarMoeda(totalCategoria)}
                </span>
              </div>

              <div className="space-y-2 ml-5">
                {servicosCategoria.map(item => {
                  const servico = todosServicos.find(s => s.id === item.servico_id);
                  if (!servico) return null;

                  return (
                    <div key={item.servico_id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-3">
                      <div className="flex-1">
                        <span className="text-gray-700 font-medium">• {servico.nome}</span>
                        {item.quantidade > 1 && (
                          <span className="text-gray-500">
                            : {item.quantidade} × {formatarMoeda(item.valor_unitario)}
                          </span>
                        )}
                        {item.extras?.nomeOrgao && (
                          <span className="text-custom-blue"> ({item.extras.nomeOrgao})</span>
                        )}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatarMoeda(item.subtotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Taxa de Abertura */}
        {dadosProposta.cliente?.abertura_empresa && (
          <div className={`border-l-4 pl-4 ${resumoFinanceiro.ehMEI ? 'border-orange-500' : 'border-green-500'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-medium text-gray-900 capitalize flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${resumoFinanceiro.ehMEI ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                Abertura de {resumoFinanceiro.tipoAbertura}
              </h3>
              <span className={`text-lg font-semibold ${resumoFinanceiro.ehMEI ? 'text-orange-600' : 'text-green-600'}`}>
                {formatarMoeda(resumoFinanceiro.taxaAberturaEmpresa)}
              </span>
            </div>

            <div className="ml-5">
              <div className={`flex justify-between items-center text-sm rounded-lg p-3 ${resumoFinanceiro.ehMEI ? 'bg-orange-50' : 'bg-green-50'
                }`}>
                <div className="flex-1">
                  <span className="text-gray-700 font-medium flex items-center">
                    {resumoFinanceiro.ehMEI ? (
                      <>
                        <User className="w-4 h-4 mr-1 text-orange-600" />
                        • Taxa de Abertura MEI
                      </>
                    ) : (
                      <>
                        <Building className="w-4 h-4 mr-1 text-green-600" />
                        • Taxa de Abertura de Empresa
                      </>
                    )}
                  </span>
                  <span className="text-gray-500 block text-xs mt-1">
                    {resumoFinanceiro.ehMEI
                      ? 'Inclui registro como Microempreendedor Individual'
                      : 'Inclui todo o processo de abertura e documentação necessária'
                    }
                  </span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatarMoeda(resumoFinanceiro.taxaAberturaEmpresa)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
