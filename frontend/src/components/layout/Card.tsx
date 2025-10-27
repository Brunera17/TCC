import { cn } from '../../utils/cn';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    padding = 'md',
    shadow = 'sm'
}) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    const shadowClasses = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow',
        lg: 'shadow-lg'
    };

    return (
        <div className={cn(
            'bg-white rounded-lg border border-gray-200',
            paddingClasses[padding],
            shadowClasses[shadow],
            className
        )}>
            {children}
        </div>
    );
};
