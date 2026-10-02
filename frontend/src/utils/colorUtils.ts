/**
 * 🎨 FUNÇÕES AUXILIARES PARA CORES
 * 
 * Este arquivo contém funções utilitárias para trabalhar com o sistema de cores,
 * incluindo conversões, validações e geração de classes CSS.
 * 
 * @version 1.0.0
 * @author Sistema de Propostas
 */

import { PRIMARY_COLORS, NEUTRAL_COLORS, SEMANTIC_COLORS, UI_COLORS } from './colorSystem';

// ============================================================================
// 🎯 TIPOS E INTERFACES
// ============================================================================

export type ColorVariant = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
export type ColorType = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type ClienteType = 'pessoaFisica' | 'pessoaJuridica';
export type StatusType = 'ativo' | 'inativo' | 'pendente' | 'existente';
export type PropostaStatus = 'rascunho' | 'enviada' | 'aprovada' | 'rejeitada';

export interface ColorConfig {
    primary: string;
    light: string;
    dark: string;
    text: string;
    border: string;
}

export interface TailwindClasses {
    background: string;
    text: string;
    border: string;
    hover: string;
    focus: string;
}

// ============================================================================
// 🎯 FUNÇÕES DE CONVERSÃO DE CORES
// ============================================================================

/**
 * Converte cor hexadecimal para RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

/**
 * Converte cor hexadecimal para HSL
 */
export const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;

    const { r, g, b } = rgb;
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const diff = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (diff !== 0) {
        s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

        switch (max) {
            case rNorm:
                h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
                break;
            case gNorm:
                h = (bNorm - rNorm) / diff + 2;
                break;
            case bNorm:
                h = (rNorm - gNorm) / diff + 4;
                break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

/**
 * Calcula o contraste entre duas cores
 */
export const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const getLuminance = (r: number, g: number, b: number) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
};

// ============================================================================
// 🎯 FUNÇÕES DE VALIDAÇÃO DE CORES
// ============================================================================

/**
 * Verifica se uma cor tem contraste adequado para texto
 */
export const hasAdequateContrast = (backgroundColor: string, textColor: string = '#000000'): boolean => {
    const ratio = getContrastRatio(backgroundColor, textColor);
    return ratio >= 4.5; // WCAG AA standard
};

/**
 * Verifica se uma cor é clara ou escura
 */
export const isLightColor = (hex: string): boolean => {
    const hsl = hexToHsl(hex);
    return hsl ? hsl.l > 50 : false;
};

/**
 * Retorna a cor de texto adequada para um fundo
 */
export const getContrastingTextColor = (backgroundColor: string): string => {
    const hsl = hexToHsl(backgroundColor);
    if (!hsl) return '#000000';

    return hsl.l > 50 ? '#000000' : '#ffffff';
};

// ============================================================================
// 🎯 FUNÇÕES DE GERAÇÃO DE CLASSES TAILWIND
// ============================================================================

/**
 * Gera classes Tailwind para um tipo de cliente
 */
export const getClienteClasses = (tipo: ClienteType): TailwindClasses => {
    const config = SEMANTIC_COLORS.cliente[tipo];

    return {
        background: `bg-${tipo === 'pessoaFisica' ? 'green' : 'purple'}-500`,
        text: `text-${tipo === 'pessoaFisica' ? 'green' : 'purple'}-700`,
        border: `border-${tipo === 'pessoaFisica' ? 'green' : 'purple'}-300`,
        hover: `hover:bg-${tipo === 'pessoaFisica' ? 'green' : 'purple'}-600`,
        focus: `focus:ring-${tipo === 'pessoaFisica' ? 'green' : 'purple'}-500`
    };
};

/**
 * Gera classes Tailwind para um status
 */
export const getStatusClasses = (status: StatusType): TailwindClasses => {
    const statusMap = {
        ativo: 'green',
        inativo: 'red',
        pendente: 'yellow',
        existente: 'blue'
    };

    const color = statusMap[status];

    return {
        background: `bg-${color}-100`,
        text: `text-${color}-700`,
        border: `border-${color}-300`,
        hover: `hover:bg-${color}-200`,
        focus: `focus:ring-${color}-500`
    };
};

/**
 * Gera classes Tailwind para um botão
 */
export const getButtonClasses = (variant: ColorType, disabled: boolean = false): string => {
    const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    if (disabled) {
        return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
    }

    const variantClasses = {
        primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
        success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
        danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
        info: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'
    };

    return `${baseClasses} ${variantClasses[variant]}`;
};

/**
 * Gera classes Tailwind para um input
 */
export const getInputClasses = (hasError: boolean = false, disabled: boolean = false): string => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200';

    if (disabled) {
        return `${baseClasses} bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed`;
    }

    if (hasError) {
        return `${baseClasses} border-red-500 focus:ring-red-500 focus:border-red-500`;
    }

    return `${baseClasses} border-gray-300 focus:ring-blue-500 focus:border-blue-500`;
};

/**
 * Gera classes Tailwind para um card
 */
export const getCardClasses = (isSelected: boolean = false, hoverable: boolean = true): string => {
    const baseClasses = 'bg-white rounded-lg border transition-all duration-300';

    if (isSelected) {
        return `${baseClasses} border-blue-500 border-2 shadow-md`;
    }

    if (hoverable) {
        return `${baseClasses} border-gray-200 hover:border-gray-300 hover:shadow-md`;
    }

    return `${baseClasses} border-gray-200`;
};

// ============================================================================
// 🎯 FUNÇÕES DE CONFIGURAÇÃO DE CLIENTE
// ============================================================================

/**
 * Determina o tipo de cliente e retorna configuração de cores
 * ✅ CORREÇÃO: Melhorada detecção de Pessoa Jurídica considerando todos os casos
 */
export const getClienteConfig = (cliente: any): { tipo: ClienteType; cores: ColorConfig } => {
    // ✅ CORREÇÃO: Verificações mais robustas para detectar Pessoa Jurídica
    const temEntidadesJuridicas = cliente.entidades_juridicas &&
        Array.isArray(cliente.entidades_juridicas) &&
        cliente.entidades_juridicas.length > 0;

    const temAberturaEmpresa = cliente.abertura_empresa === true ||
        cliente.abertura_empresa === 'true' ||
        cliente.abertura_empresa === 1;

    // ✅ CORREÇÃO: Verificar se o backend já detectou como PJ
    const backendDetectouPJ = cliente.tipo_cliente === 'PJ' ||
        cliente.is_pessoa_juridica === true;

    // ✅ CORREÇÃO: Pessoa Jurídica se tiver entidades jurídicas OU abertura de empresa OU backend detectou PJ
    const isPessoaJuridica = temEntidadesJuridicas || temAberturaEmpresa || backendDetectouPJ;

    const tipo: ClienteType = isPessoaJuridica ? 'pessoaJuridica' : 'pessoaFisica';
    const config = SEMANTIC_COLORS.cliente[tipo];

    return {
        tipo,
        cores: config
    };
};

/**
 * Gera classes CSS para um cliente específico
 */
export const getClienteCssClasses = (cliente: any): {
    tag: string;
    card: string;
    text: string;
    border: string;
    icon: string;
} => {
    const config = getClienteConfig(cliente);
    const classes = getClienteClasses(config.tipo);

    return {
        tag: `${classes.background} text-white`,
        card: `bg-white border-2 ${config.tipo === 'pessoaFisica' ? 'border-green-300' : 'border-purple-300'}`,
        text: classes.text,
        border: classes.border,
        icon: `bg-${config.tipo === 'pessoaFisica' ? 'green' : 'purple'}-100 text-${config.tipo === 'pessoaFisica' ? 'green' : 'purple'}-600`
    };
};

// ============================================================================
// 🎯 FUNÇÕES DE UTILIDADE GERAL
// ============================================================================

/**
 * Gera uma paleta de cores baseada em uma cor principal
 */
export const generateColorPalette = (baseColor: string): Record<ColorVariant, string> => {
    // Esta é uma implementação simplificada
    // Em um projeto real, você usaria uma biblioteca como chroma.js
    const hsl = hexToHsl(baseColor);
    if (!hsl) return {} as Record<ColorVariant, string>;

    const palette: Record<ColorVariant, string> = {} as Record<ColorVariant, string>;

    // Gerar variações de luminosidade
    const variants: ColorVariant[] = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    const lightnessValues = [95, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5];

    variants.forEach((variant, index) => {
        const lightness = lightnessValues[index];
        palette[variant] = `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
    });

    return palette;
};

/**
 * Converte uma cor para formato CSS
 */
export const toCssColor = (color: string, opacity: number = 1): string => {
    if (color.startsWith('#')) {
        const rgb = hexToRgb(color);
        if (rgb) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        }
    }
    return color;
};

/**
 * Gera variáveis CSS para o sistema de cores
 */
export const generateCssVariables = (): string => {
    const variables: string[] = [];

    // Cores primárias
    Object.entries(PRIMARY_COLORS).forEach(([colorName, shades]) => {
        Object.entries(shades).forEach(([shade, value]) => {
            variables.push(`--color-${colorName}-${shade}: ${value};`);
        });
    });

    // Cores semânticas
    Object.entries(SEMANTIC_COLORS).forEach(([category, colors]) => {
        Object.entries(colors).forEach(([name, config]) => {
            if (typeof config === 'object' && 'primary' in config) {
                variables.push(`--color-${category}-${name}-primary: ${config.primary};`);
                variables.push(`--color-${category}-${name}-light: ${config.light};`);
                variables.push(`--color-${category}-${name}-dark: ${config.dark};`);
                variables.push(`--color-${category}-${name}-text: ${config.text};`);
                variables.push(`--color-${category}-${name}-border: ${config.border};`);
            }
        });
    });

    return `:root {\n  ${variables.join('\n  ')}\n}`;
};

// ============================================================================
// 🎯 EXPORTAÇÕES PRINCIPAIS
// ============================================================================

export default {
    // Conversão
    hexToRgb,
    hexToHsl,
    getContrastRatio,

    // Validação
    hasAdequateContrast,
    isLightColor,
    getContrastingTextColor,

    // Classes Tailwind
    getClienteClasses,
    getStatusClasses,
    getButtonClasses,
    getInputClasses,
    getCardClasses,

    // Configuração de cliente
    getClienteConfig,
    getClienteCssClasses,

    // Utilitários
    generateColorPalette,
    toCssColor,
    generateCssVariables
};
