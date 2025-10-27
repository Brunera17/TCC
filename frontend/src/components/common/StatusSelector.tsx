import { StatusBadge } from './StatusBadge';

interface StatusSelectorProps {
    selectedStatus: string;
    onStatusChange: (status: string) => void;
    className?: string;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
    selectedStatus,
    onStatusChange,
    className = ''
}) => {
    const statusOptions = [
        'RASCUNHO',
        'PENDENTE',
        'ENVIADA',
        'APROVADA',
        'REJEITADA',
        'REALIZADA',
        'CANCELADA'
    ];

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                Status da Proposta
            </label>
            <div className="grid grid-cols-3 gap-2">
                {statusOptions.map((status) => (
                    <button
                        key={status}
                        onClick={() => onStatusChange(status)}
                        className={`
              p-2 rounded-lg border-2 transition-all duration-200
              ${selectedStatus === status
                                ? 'border-custom-blue bg-custom-blue-light shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }
            `}
                    >
                        <StatusBadge status={status} />
                    </button>
                ))}
            </div>
        </div>
    );
};
