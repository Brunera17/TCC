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
        }, 200);
    }, [id, onClose]);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, handleClose]);

    const getToastStyles = () => {
        const baseStyles = "flex items-start p-4 rounded-lg shadow-lg border transition-all duration-300 transform";
        
        if (isLeaving) {
            return `${baseStyles} translate-x-full opacity-0`;
        }

        const typeStyles = {
            success: "bg-green-50 border-green-200 text-green-800",
            error: "bg-red-50 border-red-200 text-red-800",
            warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
            info: "bg-blue-50 border-blue-200 text-blue-800"
        };

        return `${baseStyles} ${typeStyles[type]} translate-x-0 opacity-100`;
    };

    const getIcon = () => {
        const iconProps = { className: "w-5 h-5 mt-0.5 flex-shrink-0" };
        
        switch (type) {
            case 'success':
                return <CheckCircle {...iconProps} className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-500" />;
            case 'error':
                return <XCircle {...iconProps} className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />;
            case 'warning':
                return <AlertTriangle {...iconProps} className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-500" />;
            case 'info':
                return <Info {...iconProps} className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-500" />;
            default:
                return <Info {...iconProps} />;
        }
    };

    const getProgressBarColor = () => {
        switch (type) {
            case 'success': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            case 'warning': return 'bg-yellow-500';
            case 'info': return 'bg-blue-500';
            default: return 'bg-gray-500';
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
                <h4 className="text-sm font-semibold">
                    {title}
                </h4>
                <p className="text-sm mt-1 opacity-90">
                    {message}
                </p>

                {/* Barra de progresso */}
                {duration > 0 && (
                    <div className="mt-2 w-full bg-black bg-opacity-10 rounded-full h-1">
                        <div 
                            className={`h-1 rounded-full ${getProgressBarColor()} transition-all ease-linear w-full`}
                        />
                    </div>
                )}
            </div>

            {/* Botão de fechar */}
            <button
                onClick={handleClose}
                className="ml-3 flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
                title="Fechar notificação"
                aria-label="Fechar notificação"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default ToastNotification;