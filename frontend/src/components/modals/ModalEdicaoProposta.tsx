import { useState } from 'react';
import type { Proposta } from '../../types';
import { StatusSelector } from '../common/StatusSelector';

interface ModalEdicaoPropostaProps {
    proposta: Proposta | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (propostaId: number, dados: Partial<Proposta>) => Promise<void>;
}

type TelaEdicao = 'selecao' | 'status' | 'observacoes' | 'valor' | 'validade';



export const ModalEdicaoProposta: React.FC<ModalEdicaoPropostaProps> = ({
    proposta,
    isOpen,
    onClose,
    onSave
}) => {
    const [telaAtual, setTelaAtual] = useState<TelaEdicao>('selecao');
    const [loading, setLoading] = useState(false);
    const [dadosEditados, setDadosEditados] = useState<Partial<Proposta>>({});
    const [erro, setErro] = useState<string>('');

    if (!isOpen || !proposta) return null;

    const handleSalvar = async () => {
        if (Object.keys(dadosEditados).length === 0) {
            setErro('Nenhuma alteração foi feita');
            return;
        }

        setLoading(true);
        setErro('');

        try {
            await onSave(proposta.id, dadosEditados);
            handleFechar();
        } catch (error) {
            setErro('Erro ao salvar alterações. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleFechar = () => {
        setTelaAtual('selecao');
        setDadosEditados({});
        setErro('');
        onClose();
    };

    const handleVoltar = () => {
        if (telaAtual === 'selecao') {
            handleFechar();
        } else {
            setTelaAtual('selecao');
        }
    };

    const renderTelaSelecao = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                O que você deseja alterar?
            </h3>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setTelaAtual('status')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="font-medium text-gray-900">Status</div>
                    <div className="text-sm text-gray-500">Alterar situação da proposta</div>
                </button>

                <button
                    onClick={() => setTelaAtual('observacoes')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="font-medium text-gray-900">Observações</div>
                    <div className="text-sm text-gray-500">Editar comentários</div>
                </button>

                <button
                    onClick={() => setTelaAtual('valor')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="font-medium text-gray-900">Valor</div>
                    <div className="text-sm text-gray-500">Ajustar valor total</div>
                </button>

                <button
                    onClick={() => setTelaAtual('validade')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="font-medium text-gray-900">Validade</div>
                    <div className="text-sm text-gray-500">Definir data de validade</div>
                </button>
            </div>
        </div>
    );

    const renderTelaStatus = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Alterar Status da Proposta
            </h3>

            <StatusSelector
                selectedStatus={dadosEditados.status || proposta.status}
                onStatusChange={(status) => setDadosEditados({ ...dadosEditados, status })}
                className="mb-4"
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                    <strong>Status atual:</strong> {proposta.status}
                </div>
                {dadosEditados.status && dadosEditados.status !== proposta.status && (
                    <div className="text-sm text-blue-800 mt-1">
                        <strong>Novo status:</strong> {dadosEditados.status}
                    </div>
                )}
            </div>
        </div>
    );

    const renderTelaObservacoes = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Editar Observações
            </h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                </label>
                <textarea
                    value={dadosEditados.observacoes || proposta.observacoes || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, observacoes: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Digite as observações da proposta..."
                />
                <div className="text-sm text-gray-500 mt-1">
                    {(dadosEditados.observacoes || proposta.observacoes || '').length}/500 caracteres
                </div>
            </div>
        </div>
    );

    const renderTelaValor = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Alterar Valor Total
            </h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Total (R$)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dadosEditados.valor_total || proposta.valor_total || ''}
                    onChange={(e) => {
                        const valor = parseFloat(e.target.value);
                        setDadosEditados({
                            ...dadosEditados,
                            valor_total: isNaN(valor) ? undefined : valor
                        });
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0,00"
                />
                <div className="text-sm text-gray-500 mt-1">
                    Valor atual: R$ {(proposta.valor_total || 0).toFixed(2).replace('.', ',')}
                </div>
            </div>
        </div>
    );

    const renderTelaValidade = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Definir Data de Validade
            </h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Validade
                </label>
                <input
                    type="date"
                    value={dadosEditados.data_validade || proposta.data_validade || ''}
                    onChange={(e) => setDadosEditados({ ...dadosEditados, data_validade: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="text-sm text-gray-500 mt-1">
                    Deixe em branco para remover a data de validade
                </div>
            </div>
        </div>
    );

    const renderTelaAtual = () => {
        switch (telaAtual) {
            case 'selecao':
                return renderTelaSelecao();
            case 'status':
                return renderTelaStatus();
            case 'observacoes':
                return renderTelaObservacoes();
            case 'valor':
                return renderTelaValor();
            case 'validade':
                return renderTelaValidade();
            default:
                return renderTelaSelecao();
        }
    };

    const podeSalvar = Object.keys(dadosEditados).length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="overflow-hidden shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto bg-white">
                <div className="bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            Editar Proposta #{proposta.id}
                        </h2>
                        <button
                            onClick={handleFechar}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {erro && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {erro}
                        </div>
                    )}

                    {renderTelaAtual()}

                    <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                        <button
                            onClick={handleVoltar}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            {telaAtual === 'selecao' ? 'Cancelar' : 'Voltar'}
                        </button>

                        {telaAtual !== 'selecao' && (
                            <button
                                onClick={handleSalvar}
                                disabled={!podeSalvar || loading}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${podeSalvar && !loading
                                    ? 'bg-custom-blue text-white hover:bg-custom-blue-light'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {loading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
