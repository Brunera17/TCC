import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AlertProps {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

const alertVariants = {
    info: {
        container: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: 'text-blue-400',
        title: 'text-blue-800',
        defaultIcon: Info
    },
    success: {
        container: 'bg-green-50 border-green-200 text-green-800',
        icon: 'text-green-400',
        title: 'text-green-800',
        defaultIcon: CheckCircle
    },
    warning: {
        container: 'bg-orange-50 border-orange-200 text-orange-800',
        icon: 'text-orange-400',
        title: 'text-orange-800',
        defaultIcon: AlertTriangle
    },
    error: {
        container: 'bg-red-50 border-red-200 text-red-800',
        icon: 'text-red-400',
        title: 'text-red-800',
        defaultIcon: XCircle
    }
};

export const Alert: React.FC<AlertProps> = ({
    variant = 'info',
    title,
    children,
    icon,
    className
}) => {
    const variantStyles = alertVariants[variant];
    const IconComponent = variantStyles.defaultIcon;

    return (
        <div className={cn(
            'border rounded-lg p-4',
            variantStyles.container,
            className
        )}>
            <div className="flex">
                <div className={cn('flex-shrink-0', variantStyles.icon)}>
                    {icon || <IconComponent className="w-5 h-5" />}
                </div>
                <div className="ml-3 flex-1">
                    {title && (
                        <h3 className={cn('text-sm font-medium mb-2', variantStyles.title)}>
                            {title}
                        </h3>
                    )}
                    <div className="text-sm">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};