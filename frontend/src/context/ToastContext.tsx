import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import ToastNotification from '../components/common/ToastNotification';
import type { ToastProps } from '../components/common/ToastNotification';

interface ToastContextType {
    showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
    showSuccess: (title: string, message: string, options?: Partial<ToastProps>) => void;
    showError: (title: string, message: string, options?: Partial<ToastProps>) => void;
    showWarning: (title: string, message: string, options?: Partial<ToastProps>) => void;
    showInfo: (title: string, message: string, options?: Partial<ToastProps>) => void;
    hideToast: (id: string) => void;
    clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: ToastProps = {
            ...toast,
            id,
            onClose: hideToast
        };

        setToasts(prev => [...prev, newToast]);
    }, [hideToast]);

    const showSuccess = useCallback((title: string, message: string, options?: Partial<ToastProps>) => {
        showToast({
            type: 'success',
            title,
            message,
            duration: 4000,
            ...options
        });
    }, [showToast]);

    const showError = useCallback((title: string, message: string, options?: Partial<ToastProps>) => {
        showToast({
            type: 'error',
            title,
            message,
            duration: 6000,
            ...options
        });
    }, [showToast]);

    const showWarning = useCallback((title: string, message: string, options?: Partial<ToastProps>) => {
        showToast({
            type: 'warning',
            title,
            message,
            duration: 5000,
            ...options
        });
    }, [showToast]);

    const showInfo = useCallback((title: string, message: string, options?: Partial<ToastProps>) => {
        showToast({
            type: 'info',
            title,
            message,
            duration: 4000,
            ...options
        });
    }, [showToast]);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    const contextValue: ToastContextType = {
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        hideToast,
        clearAllToasts
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map((toast) => (
                    <ToastNotification key={toast.id} {...toast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastContext;
