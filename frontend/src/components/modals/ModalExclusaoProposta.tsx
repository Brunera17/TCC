import { useState } from 'react';
import type { Proposta } from '../../types';
import { Modal } from './Modal';

interface ModalExclusaoPropostaProps {
    proposta: Proposta | null;
    funcionarioAtual: { id: number; nome: string } | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete: (propostaId: number, observacao?: string) => Promise<void>;
}

export const ModalExclusaoProposta: React.FC<ModalExclusaoPropostaProps> = ({
    proposta,
    funcionarioAtual,
    isOpen,
    onClose,
    onDelete
}) => {
    const [loading, setLoading] = useState(false);
    const [confirmacao, setConfirmacao] = useState('');
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState<string>('');

    if (!isOpen || !proposta) return null;

    // Verificar se é proposta própria ou de outro funcionário
    const isPropriaProposta = funcionarioAtual && proposta.funcionario_responsavel_id === funcionarioAtual.id;
    const observacaoObrigatoria = !isPropriaProposta;

    const handleExcluir = async () => {
        if (confirmacao !== proposta.id.toString()) {
            setErro('Número de confirmação incorreto');
            return;
        }

        if (observacaoObrigatoria && !observacao.trim()) {
            setErro('Observação é obrigatória para exclusão de proposta de outro funcionário');
            return;
        }

        setLoading(true);
        setErro('');

        try {
            await onDelete(proposta.id, observacao.trim() || undefined);
            handleFechar();
        } catch (error) {
            setErro('Erro ao excluir proposta. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleFechar = () => {
        setConfirmacao('');
        setObservacao('');
        setErro('');
        onClose();
    };

    const podeExcluir = confirmacao === proposta.id.toString() &&
        (!observacaoObrigatoria || observacao.trim()) &&
        !loading;

    const formatarData = (data: string | null) => {
        if (!data) return 'Não definida';
        return new Date(data).toLocaleDateString('pt-BR');
    };

    const formatarValor = (valor: number | null) => {
        if (!valor) return 'R$ 0,00';
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RASCUNHO':
                return 'bg-gray-100 text-gray-800';
            case 'EM_ANDAMENTO':
                return 'bg-blue-50 text-blue-800';
            case 'APROVADA':
                return 'bg-green-100 text-green-800';
            case 'REPROVADA':
                return 'bg-red-100 text-red-800';
            case 'CANCELADA':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'RASCUNHO':
                return 'Rascunho';
            case 'EM_ANDAMENTO':
                return 'Em Andamento';
            case 'APROVADA':
                return 'Aprovada';
            case 'REPROVADA':
                return 'Reprovada';
            case 'CANCELADA':
                return 'Cancelada';
            default:
                return status;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="overflow-hidden shadow-xl max-w-2xl w-full mx-4">
                <div className="bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            Excluir Proposta
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

                    <div className="mb-6">
                        {/* Aviso diferenciado para proposta própria vs. de outro funcionário */}
                        {isPropriaProposta ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-orange-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-orange-800 font-medium">
                                        Exclusão da sua própria proposta
                                    </span>
                                </div>
                                <p className="text-orange-700 text-sm mt-2">
                                    Esta proposta será marcada como inativa e mantida no sistema para fins de auditoria.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-red-800 font-medium">
                                        Exclusão de proposta de outro funcionário
                                    </span>
                                </div>
                                <p className="text-red-700 text-sm mt-2">
                                    Esta proposta pertence a <strong>{proposta.funcionario_responsavel?.nome || 'N/A'}</strong>.
                                    Uma notificação será enviada ao funcionário responsável.
                                </p>
                            </div>
                        )}

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-gray-900 mb-3">Informações da Proposta</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">ID:</span>
                                    <span className="ml-2 font-medium">#{proposta.id}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Cliente:</span>
                                    <span className="ml-2 font-medium">{proposta.cliente?.nome || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposta.status)}`}>
                                        {getStatusLabel(proposta.status)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Valor:</span>
                                    <span className="ml-2 font-medium">{formatarValor(proposta.valor_total)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Criação:</span>
                                    <span className="ml-2 font-medium">{formatarData(proposta.created_at)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Validade:</span>
                                    <span className="ml-2 font-medium">{formatarData(proposta.data_validade)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Responsável:</span>
                                    <span className="ml-2 font-medium">{proposta.funcionario_responsavel?.nome || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">PDF:</span>
                                    <span className="ml-2 font-medium">
                                        {proposta.pdf_gerado ? 'Gerado' : 'Não gerado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Campo de observação obrigatório para propostas de outros funcionários */}
                        {observacaoObrigatoria && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Observação <span className="text-red-500">*</span>
                                </label>
                                <p className="text-sm text-gray-600 mb-3">
                                    Explique o motivo da exclusão desta proposta de outro funcionário:
                                </p>
                                <textarea
                                    value={observacao}
                                    onChange={(e) => setObservacao(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    placeholder="Digite o motivo da exclusão..."
                                    rows={3}
                                />
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirmação de Segurança
                            </label>
                            <p className="text-sm text-gray-600 mb-3">
                                Para confirmar a exclusão, digite o número da proposta: <strong>{proposta.id}</strong>
                            </p>
                            <input
                                type="text"
                                value={confirmacao}
                                onChange={(e) => setConfirmacao(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder={`Digite ${proposta.id}`}
                            />
                        </div>

                        {erro && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {erro}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={handleFechar}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleExcluir}
                            disabled={!podeExcluir}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${podeExcluir
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Excluindo...' : 'Excluir Proposta'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};