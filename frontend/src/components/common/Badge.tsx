/**
 * 🎨 COMPONENTE BADGE PADRONIZADO
 * 
 * Componente reutilizável para exibir badges com cores padronizadas
 * seguindo o sistema de design do projeto.
 * 
 * @version 1.0.0
 * @author Sistema de Propostas
 */


// ============================================================================
// 🎯 TIPOS E INTERFACES
// ============================================================================

export type ColorType = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type ClienteType = 'pessoaFisica' | 'pessoaJuridica';
export type StatusType = 'ativo' | 'inativo' | 'pendente' | 'existente';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: ColorType;
    size?: 'sm' | 'md' | 'lg';
    rounded?: boolean;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}

export interface StatusBadgeProps {
    status: StatusType;
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export interface ClienteBadgeProps {
    tipo: ClienteType;
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export interface CustomBadgeProps {
    backgroundColor: string;
    textColor: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

// ============================================================================
// 🎯 COMPONENTE BADGE PRINCIPAL
// ============================================================================

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    rounded = true,
    className = '',
    onClick,
    disabled = false
}) => {
    // Classes base
    const baseClasses = 'inline-flex items-center font-medium transition-all duration-200';

    // Classes de tamanho
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base'
    };

    // Classes de borda
    const roundedClasses = rounded ? 'rounded-full' : 'rounded-md';

    // Classes de variante
    const variantClasses = {
        primary: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        success: 'bg-green-100 text-green-800 hover:bg-green-200',
        warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        danger: 'bg-red-100 text-red-800 hover:bg-red-200',
        info: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    };

    // Classes de interação
    const interactionClasses = onClick && !disabled
        ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500'
        : '';

    // Classes de estado desabilitado
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

    const allClasses = [
        baseClasses,
        sizeClasses[size],
        roundedClasses,
        variantClasses[variant],
        interactionClasses,
        disabledClasses,
        className
    ].filter(Boolean).join(' ');

    const Component = onClick ? 'button' : 'span';

    return (
        <Component
            className={allClasses}
            onClick={onClick}
            disabled={disabled}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick && !disabled ? 0 : undefined}
        >
            {children}
        </Component>
    );
};

// ============================================================================
// 🎯 COMPONENTE BADGE DE STATUS
// ============================================================================

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    children,
    size = 'md',
    className = ''
}) => {
    const statusLabels = {
        ativo: 'Ativo',
        inativo: 'Inativo',
        pendente: 'Pendente',
        existente: 'Existente'
    };

    const statusClasses = {
        ativo: 'bg-green-100 text-green-700',
        inativo: 'bg-red-100 text-red-700',
        pendente: 'bg-yellow-100 text-yellow-700',
        existente: 'bg-blue-100 text-blue-700'
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base'
    };

    const allClasses = [
        'inline-flex items-center font-medium rounded-full transition-all duration-200',
        statusClasses[status],
        sizeClasses[size],
        className
    ].join(' ');

    return (
        <span className={allClasses}>
            {children || statusLabels[status]}
        </span>
    );
};

// ============================================================================
// 🎯 COMPONENTE BADGE DE CLIENTE
// ============================================================================

export const ClienteBadge: React.FC<ClienteBadgeProps> = ({
    tipo,
    children,
    size = 'md',
    className = ''
}) => {
    const tipoLabels = {
        pessoaFisica: 'Pessoa Física',
        pessoaJuridica: 'Pessoa Jurídica'
    };

    const clienteClasses = {
        pessoaFisica: 'bg-green-500 text-white',
        pessoaJuridica: 'bg-purple-500 text-white'
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base'
    };

    const allClasses = [
        'inline-flex items-center font-medium rounded-full transition-all duration-200',
        clienteClasses[tipo],
        sizeClasses[size],
        className
    ].join(' ');

    return (
        <span className={allClasses}>
            {children || tipoLabels[tipo]}
        </span>
    );
};

// ============================================================================
// 🎯 COMPONENTE BADGE CUSTOMIZADO
// ============================================================================

export const CustomBadge: React.FC<CustomBadgeProps> = ({
    backgroundColor,
    textColor,
    children,
    size = 'md',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-1.5 text-sm',
        lg: 'px-3 py-2 text-base'
    };

    const allClasses = [
        'inline-flex items-center font-medium rounded-full transition-all duration-200',
        sizeClasses[size],
        className
    ].join(' ');

    const style = {
        backgroundColor,
        color: textColor
    };

    return (
        <span className={allClasses} style={style}>
            {children}
        </span>
    );
};

// ============================================================================
// 🎯 COMPONENTES ESPECÍFICOS PARA CASOS DE USO
// ============================================================================

/**
 * Badge para indicar que é um cliente existente
 */
export const ClienteExistenteBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
    size = 'md',
    className = ''
}) => (
    <StatusBadge status="existente" size={size} className={className}>
        Cliente Existente
    </StatusBadge>
);

/**
 * Badge para indicar status ativo
 */
export const AtivoBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
    size = 'md',
    className = ''
}) => (
    <StatusBadge status="ativo" size={size} className={className}>
        Ativo
    </StatusBadge>
);

/**
 * Badge para indicar status inativo
 */
export const InativoBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
    size = 'md',
    className = ''
}) => (
    <StatusBadge status="inativo" size={size} className={className}>
        Inativo
    </StatusBadge>
);

/**
 * Badge para pessoa física
 */
export const PessoaFisicaBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
    size = 'md',
    className = ''
}) => (
    <ClienteBadge tipo="pessoaFisica" size={size} className={className} />
);

/**
 * Badge para pessoa jurídica
 */
export const PessoaJuridicaBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
    size = 'md',
    className = ''
}) => (
    <ClienteBadge tipo="pessoaJuridica" size={size} className={className} />
);

// ============================================================================
// 🎯 COMPONENTE BADGE COM ÍCONE
// ============================================================================

export interface BadgeWithIconProps extends BadgeProps {
    icon: React.ReactNode;
    iconPosition?: 'left' | 'right';
}

export const BadgeWithIcon: React.FC<BadgeWithIconProps> = ({
    children,
    icon,
    iconPosition = 'left',
    size = 'md',
    ...props
}) => {
    const iconSizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    const iconClasses = `${iconSizeClasses[size]} ${iconPosition === 'left' ? 'mr-1' : 'ml-1'}`;

    return (
        <Badge size={size} {...props}>
            {iconPosition === 'left' && (
                <span className={iconClasses}>
                    {icon}
                </span>
            )}
            {children}
            {iconPosition === 'right' && (
                <span className={iconClasses}>
                    {icon}
                </span>
            )}
        </Badge>
    );
};

// ============================================================================
// 🎯 EXPORTAÇÕES PRINCIPAIS
// ============================================================================

export default Badge;
