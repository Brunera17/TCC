// 🎨 Sistema Unificado de Cores para Status das Propostas
// =====================================================

import {
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    CheckSquare,
    XSquare,
    Circle,
    AlertTriangle
} from 'lucide-react';

// ✅ Tipos de Status das Propostas
export type StatusProposta =
    | 'RASCUNHO'
    | 'APROVADA'
    | 'REJEITADA'
    | 'CANCELADA'
    | 'REALIZADA'
    | 'PENDENTE';

// ✅ Configuração de Cores por Status
export interface StatusConfig {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: React.ComponentType<any>;
    description: string;
    priority: number; // Para ordenação
}

// ✅ Sistema Unificado de Cores
export const STATUS_COLORS: Record<StatusProposta, StatusConfig> = {
    RASCUNHO: {
        label: 'Rascunho',
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: FileText,
        description: 'Proposta em elaboração, ainda não finalizada',
        priority: 1
    },

    PENDENTE: {
        label: 'Pendente',
        color: 'blue',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        icon: Clock,
        description: 'Proposta aguardando aprovação ou processamento',
        priority: 2
    },

    APROVADA: {
        label: 'Aprovada',
        color: 'green',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        description: 'Proposta aprovada e pronta para execução',
        priority: 3
    },

    REALIZADA: {
        label: 'Realizada',
        color: 'emerald',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-800',
        borderColor: 'border-emerald-200',
        icon: CheckSquare,
        description: 'Proposta executada e concluída com sucesso',
        priority: 4
    },

    REJEITADA: {
        label: 'Rejeitada',
        color: 'red',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        icon: XCircle,
        description: 'Proposta rejeitada e não será executada',
        priority: 5
    },

    CANCELADA: {
        label: 'Cancelada',
        color: 'gray',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: XSquare,
        description: 'Proposta cancelada pelo cliente ou sistema',
        priority: 6
    }
};

// ✅ Função para obter configuração de status
export const getStatusConfig = (status: StatusProposta): StatusConfig => {
    return STATUS_COLORS[status] || STATUS_COLORS.RASCUNHO;
};

// ✅ Função para obter classes CSS de status
export const getStatusClasses = (status: StatusProposta, size: 'sm' | 'md' | 'lg' = 'md') => {
    const config = getStatusConfig(status);

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    return {
        base: `${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} rounded-full border font-medium`,
        icon: `${config.textColor} w-4 h-4`,
        text: `${config.textColor} font-medium`
    };
};

// ✅ Função para obter ícone de status
export const getStatusIcon = (status: StatusProposta) => {
    const config = getStatusConfig(status);
    return config.icon;
};

// ✅ Função para obter descrição de status
export const getStatusDescription = (status: StatusProposta) => {
    const config = getStatusConfig(status);
    return config.description;
};

// ✅ Função para obter prioridade de status (para ordenação)
export const getStatusPriority = (status: StatusProposta) => {
    const config = getStatusConfig(status);
    return config.priority;
};

// ✅ Lista de status ordenados por prioridade
export const STATUS_ORDERED = Object.keys(STATUS_COLORS) as StatusProposta[];

// ✅ Função para ordenar propostas por status
export const sortPropostasByStatus = (propostas: any[]) => {
    return propostas.sort((a, b) => {
        const priorityA = getStatusPriority(a.status);
        const priorityB = getStatusPriority(b.status);
        return priorityA - priorityB;
    });
};

// ✅ Função para obter contadores de status
export const getStatusCounters = (propostas: any[]) => {
    const counters: Record<StatusProposta, number> = {
        RASCUNHO: 0,
        PENDENTE: 0,
        APROVADA: 0,
        REALIZADA: 0,
        REJEITADA: 0,
        CANCELADA: 0
    };

    propostas.forEach(proposta => {
        if (proposta.status in counters) {
            counters[proposta.status as StatusProposta]++;
        }
    });

    return counters;
};

// ✅ Função para obter status mais comum
export const getMostCommonStatus = (propostas: any[]): StatusProposta | null => {
    const counters = getStatusCounters(propostas);
    const maxCount = Math.max(...Object.values(counters));

    if (maxCount === 0) return null;

    const mostCommon = Object.entries(counters).find(([_, count]) => count === maxCount);
    return mostCommon ? mostCommon[0] as StatusProposta : null;
};

// ✅ Função para obter resumo de status
export const getStatusSummary = (propostas: any[]) => {
    const counters = getStatusCounters(propostas);
    const total = propostas.length;
    const mostCommon = getMostCommonStatus(propostas);

    return {
        total,
        counters,
        mostCommon,
        percentages: Object.entries(counters).reduce((acc, [status, count]) => {
            acc[status as StatusProposta] = total > 0 ? Math.round((count / total) * 100) : 0;
            return acc;
        }, {} as Record<StatusProposta, number>)
    };
};

// ✅ Validação de status
export const isValidStatus = (status: string): status is StatusProposta => {
    return status in STATUS_COLORS;
};

// ✅ Função para normalizar status (converter para maiúsculo)
export const normalizeStatus = (status: string): StatusProposta => {
    const normalized = status.toUpperCase() as StatusProposta;
    return isValidStatus(normalized) ? normalized : 'RASCUNHO';
};
