import { StatusBadge } from './StatusBadge';

interface StatusFilterProps {
    selectedStatus: string | null;
    onStatusChange: (status: string | null) => void;
    className?: string;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
    selectedStatus,
    onStatusChange,
    className = ''
}) => {
    const statusOptions = [
        { value: 'RASCUNHO', label: 'Rascunho' },
        { value: 'PENDENTE', label: 'Pendente' },
        { value: 'ENVIADA', label: 'Enviada' },
        { value: 'APROVADA', label: 'Aprovada' },
        { value: 'REJEITADA', label: 'Rejeitada' },
        { value: 'REALIZADA', label: 'Realizada' },
        { value: 'CANCELADA', label: 'Cancelada' }
    ];

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-gray-700">
                Filtrar por Status
            </label>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => onStatusChange(null)}
                    className={`
            px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200
            ${selectedStatus === null
                            ? 'bg-custom-blue-light text-custom-blue-dark border-custom-blue'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }
          `}
                >
                    Todos
                </button>
                {statusOptions.map((status) => (
                    <button
                        key={status.value}
                        onClick={() => onStatusChange(status.value)}
                        className={`
              px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200
              ${selectedStatus === status.value
                                ? 'bg-custom-blue-light text-custom-blue-dark border-custom-blue'
                                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                            }
            `}
                    >
                        <StatusBadge status={status.value} />
                    </button>
                ))}
            </div>
        </div>
    );
};
