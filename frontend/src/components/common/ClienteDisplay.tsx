import type { Cliente } from '../../types';
import {
    formatarCliente,
    getTipoCliente
} from '../../utils/formatters';

interface ClienteDisplayProps {
    cliente: Cliente;
    showDetails?: boolean;
    className?: string;
}

const ClienteDisplay: React.FC<ClienteDisplayProps> = ({
    cliente,
    showDetails = true,
    className = ''
}) => {
    // Formatar dados do cliente usando utilitários
    const dadosFormatados = formatarCliente(cliente);
    const tipo = getTipoCliente(cliente);
    const isPJ = tipo === 'PJ';

    return (
        <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
            {isPJ && dadosFormatados.empresa ? (
                // Exibição para Pessoa Jurídica
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{dadosFormatados.empresa.razaoSocial}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Pessoa Jurídica
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">CNPJ:</span>
                            <span className="text-sm text-gray-900">{dadosFormatados.empresa.cnpjFormatado}</span>
                        </div>

                        {dadosFormatados.empresa.nomeFantasia && (
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Nome Fantasia:</span>
                                <span className="text-sm text-gray-900">{dadosFormatados.empresa.nomeFantasia}</span>
                            </div>
                        )}

                        {dadosFormatados.empresa.inscricaoEstadual && (
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Inscrição Estadual:</span>
                                <span className="text-sm text-gray-900">{dadosFormatados.empresa.inscricaoEstadual}</span>
                            </div>
                        )}
                    </div>

                    {showDetails && dadosFormatados.responsavel && (
                        <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Responsável Legal</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">Nome:</span>
                                    <span className="text-sm text-gray-900">{dadosFormatados.responsavel.nome}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">CPF:</span>
                                    <span className="text-sm text-gray-900">{dadosFormatados.responsavel.cpfFormatado}</span>
                                </div>

                                {dadosFormatados.responsavel.email && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-700">Email:</span>
                                        <span className="text-sm text-gray-900">{dadosFormatados.responsavel.email}</span>
                                    </div>
                                )}

                                {dadosFormatados.responsavel.telefone && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-700">Telefone:</span>
                                        <span className="text-sm text-gray-900">{dadosFormatados.responsavel.telefone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Exibição para Pessoa Física
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{dadosFormatados.nome}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Pessoa Física
                        </span>
                    </div>

                    <div className="space-y-2">
                        {dadosFormatados.documentoFormatado && dadosFormatados.documentoFormatado !== '-' && (
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">CPF:</span>
                                <span className="text-sm text-gray-900">{dadosFormatados.documentoFormatado}</span>
                            </div>
                        )}

                        {dadosFormatados.email && (
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Email:</span>
                                <span className="text-sm text-gray-900">{dadosFormatados.email}</span>
                            </div>
                        )}

                        {dadosFormatados.telefone && (
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-gray-700">Telefone:</span>
                                <span className="text-sm text-gray-900">{dadosFormatados.telefone}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export { ClienteDisplay };
export default ClienteDisplay;
