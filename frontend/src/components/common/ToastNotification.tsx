import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastProps {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastProps> = ({
    id,
    type,
    title,
    message,
    duration = 4000,
    onClose
}) => {
    const [isLeaving, setIsLeaving] = useState(false);

    const handleClose = useCallback(() => {
        setIsLeaving(true);
        setTimeout(() => {
            onClose(id);
        }, 300); // Aumentado para 300ms para a animação de saída
    }, [id, onClose]);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, handleClose]);

    // --- ESTILOS ATUALIZADOS ---
    const typeStyles = {
        success: {
            bg: "bg-green-50",
            border: "border-green-200",
            iconColor: "text-green-500",
            titleColor: "text-green-900", // Título mais escuro
            messageColor: "text-green-700", // Mensagem mais clara
            progressColor: "#10B981" // Cor #hex para a barra
        },
        error: {
            bg: "bg-red-50",
            border: "border-red-200",
            iconColor: "text-red-500",
            titleColor: "text-red-900",
            messageColor: "text-red-700",
            progressColor: "#EF4444"
        },
        warning: {
            bg: "bg-yellow-50",
            border: "border-yellow-200",
            iconColor: "text-yellow-500",
            titleColor: "text-yellow-900",
            messageColor: "text-yellow-700",
            progressColor: "#F59E0B"
        },
        info: {
            bg: "bg-blue-50",
            border: "border-blue-200",
            iconColor: "text-blue-500",
            titleColor: "text-blue-900",
            messageColor: "text-blue-700",
            progressColor: "#3B82F6"
        }
    };

    const config = typeStyles[type];

    const getToastStyles = () => {
        // Adiciona overflow-hidden para conter a barra de progresso
        const baseStyles = "relative flex items-start p-4 rounded-lg shadow-lg border transition-all duration-300 transform w-full max-w-sm overflow-hidden";
        
        if (isLeaving) {
            return `${baseStyles} ${config.bg} ${config.border} translate-x-full opacity-0`;
        }

        // Adiciona animação de entrada
        return `${baseStyles} ${config.bg} ${config.border} translate-x-0 opacity-100`;
    };

    const getIcon = () => {
        const iconProps = { className: `w-6 h-6 flex-shrink-0 ${config.iconColor}` };
        
        switch (type) {
            case 'success': return <CheckCircle {...iconProps} />;
            case 'error': return <XCircle {...iconProps} />;
            case 'warning': return <AlertTriangle {...iconProps} />;
            case 'info': return <Info {...iconProps} />;
            default: return <Info {...iconProps} />;
        }
    };

    return (
        <div className={getToastStyles()}>
            {/* Ícone */}
            <div className="mr-3">
                {getIcon()}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold ${config.titleColor}`}>
                    {title}
                </h4>
                <p className={`text-sm mt-1 ${config.messageColor}`}>
                    {message}
                </p>
            </div>

            {/* Botão de fechar ATUALIZADO */}
            <button
                onClick={handleClose}
                className={`ml-3 -mr-1 -mt-1 flex-shrink-0 p-1 rounded-full ${config.messageColor} opacity-70 hover:opacity-100 hover:bg-black/10 transition-all`}
                title="Fechar notificação"
                aria-label="Fechar notificação"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Barra de progresso ANIMADA */}
            {duration > 0 && (
                <div 
                    className="absolute bottom-0 left-0 h-1"
                    style={{
                        width: '100%',
                        backgroundColor: config.progressColor,
                        // Aplica a animação CSS que definimos no index.css
                        animation: `toast-progress ${duration}ms linear forwards`,
                        opacity: 0.7
                    }}
                />
            )}
        </div>
    );
};

export default ToastNotification;