import { useState } from 'react';
import type { Proposta } from '../../types';
import { Modal } from './Modal';
import { Button } from '../forms/Button';
import { Input } from '../forms/Input';
import { Textarea } from '../forms/Textarea';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';

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
        } catch {
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

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'RASCUNHO':
                return 'secondary' as const;
            case 'EM_ANDAMENTO':
                return 'info' as const;
            case 'APROVADA':
                return 'success' as const;
            case 'REPROVADA':
                return 'danger' as const;
            case 'CANCELADA':
                return 'warning' as const;
            default:
                return 'secondary' as const;
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
        <Modal
            isOpen={isOpen}
            onClose={handleFechar}
            title="Excluir Proposta"
            size="lg"
        >
            <div className="space-y-6">
                {/* Aviso diferenciado para proposta própria vs. de outro funcionário */}
                {isPropriaProposta ? (
                    <Alert variant="warning" title="Exclusão da sua própria proposta" className="mb-4">
                        Esta proposta será marcada como inativa e mantida no sistema para fins de auditoria.
                    </Alert>
                ) : (
                    <Alert variant="error" title="Exclusão de proposta de outro funcionário" className="mb-4">
                        Esta proposta pertence a <strong>{proposta.funcionario_responsavel?.nome || 'N/A'}</strong>.
                        Uma notificação será enviada ao funcionário responsável.
                    </Alert>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
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
                        <div className="flex items-center">
                            <span className="text-gray-600">Status:</span>
                            <Badge
                                variant={getStatusVariant(proposta.status)}
                                size="sm"
                                className="ml-2"
                            >
                                {getStatusLabel(proposta.status)}
                            </Badge>
                        </div>
                        <div>
                            <span className="text-gray-600">Valor:</span>
                            <span className="ml-2 font-medium">{formatarValor(proposta.valor_total)}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Criação:</span>
                            <span className="ml-2 font-medium">{formatarData(proposta.created_at || null)}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Validade:</span>
                            <span className="ml-2 font-medium">{formatarData(proposta.data_validade || null)}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Responsável:</span>
                            <span className="ml-2 font-medium">{proposta.funcionario_responsavel?.nome || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-gray-600">PDF:</span>
                            <Badge
                                variant={proposta.pdf_gerado ? 'success' : 'secondary'}
                                size="sm"
                                className="ml-2"
                            >
                                {proposta.pdf_gerado ? 'Gerado' : 'Não gerado'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Campo de observação obrigatório para propostas de outros funcionários */}
                {observacaoObrigatoria && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Observação <span className="text-red-500">*</span>
                        </label>
                        <p className="text-sm text-gray-600">
                            Explique o motivo da exclusão desta proposta de outro funcionário:
                        </p>
                        <Textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Digite o motivo da exclusão..."
                            rows={3}
                            error={erro && observacaoObrigatoria && !observacao.trim() ? "Observação é obrigatória" : undefined}
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Confirmação de Segurança
                    </label>
                    <p className="text-sm text-gray-600">
                        Para confirmar a exclusão, digite o número da proposta: <strong>{proposta.id}</strong>
                    </p>
                    <Input
                        type="text"
                        value={confirmacao}
                        onChange={(e) => setConfirmacao(e.target.value)}
                        placeholder={`Digite ${proposta.id}`}
                        error={erro && confirmacao !== proposta.id.toString() ? "Número de confirmação incorreto" : undefined}
                    />
                </div>

                {erro && (
                    <Alert variant="error" className="mt-4">
                        {erro}
                    </Alert>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button
                        variant="ghost"
                        onClick={handleFechar}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleExcluir}
                        disabled={!podeExcluir}
                        loading={loading}
                    >
                        Excluir Proposta
                    </Button>
                </div>
            </div>
        </Modal>
    );
};