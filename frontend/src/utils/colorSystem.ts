/**
 * 🎨 SISTEMA DE CORES PADRONIZADO
 * 
 * Este arquivo define todas as cores utilizadas no sistema de forma centralizada,
 * garantindo consistência visual e facilitando manutenção.
 * 
 * @version 1.0.0
 * @author Sistema de Propostas
 */

// ============================================================================
// 🎯 CORES PRIMÁRIAS DO SISTEMA
// ============================================================================

export const PRIMARY_COLORS = {
    // Azul principal do sistema
    blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#2E3746', // Cor principal do sistema
        600: '#4A5568', // Cor hover (mais clara para melhor contraste)
        700: '#1E2532', // Cor escura
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554'
    },

    // Verde para ações positivas
    green: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e', // Cor principal
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
        950: '#052e16'
    },

    // Vermelho para alertas e erros
    red: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444', // Cor principal
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
        950: '#450a0a'
    },

    // Amarelo para avisos
    yellow: {
        50: '#fefce8',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b', // Cor principal
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
        950: '#451a03'
    },

    // Roxo para pessoa jurídica
    purple: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7', // Cor principal
        600: '#9333ea',
        700: '#7c3aed',
        800: '#6b21a8',
        900: '#581c87',
        950: '#3b0764'
    }
};

// ============================================================================
// 🎯 CORES NEUTRAS (CINZAS)
// ============================================================================

export const NEUTRAL_COLORS = {
    gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280', // Cor principal
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
        950: '#030712'
    },

    // Cinzas específicos para textos
    text: {
        primary: '#111827',    // gray-900
        secondary: '#374151',  // gray-700
        tertiary: '#6b7280',   // gray-500
        disabled: '#9ca3af',   // gray-400
        inverse: '#ffffff'     // branco
    },

    // Cinzas específicos para backgrounds
    background: {
        primary: '#ffffff',    // branco
        secondary: '#f9fafb',  // gray-50
        tertiary: '#f3f4f6',   // gray-100
        disabled: '#f9fafb'     // gray-50
    }
};

// ============================================================================
// 🎯 CORES SEMÂNTICAS (STATUS E ESTADOS)
// ============================================================================

export const SEMANTIC_COLORS = {
    // Status de cliente
    cliente: {
        pessoaFisica: {
            primary: PRIMARY_COLORS.green[500],
            light: PRIMARY_COLORS.green[50],
            dark: PRIMARY_COLORS.green[700],
            text: PRIMARY_COLORS.green[700],
            border: PRIMARY_COLORS.green[300]
        },
        pessoaJuridica: {
            primary: PRIMARY_COLORS.purple[500],
            light: PRIMARY_COLORS.purple[50],
            dark: PRIMARY_COLORS.purple[700],
            text: PRIMARY_COLORS.purple[700],
            border: PRIMARY_COLORS.purple[300]
        }
    },

    // Status de propostas
    proposta: {
        rascunho: {
            primary: NEUTRAL_COLORS.gray[500],
            light: NEUTRAL_COLORS.gray[50],
            dark: NEUTRAL_COLORS.gray[700],
            text: NEUTRAL_COLORS.gray[700],
            border: NEUTRAL_COLORS.gray[300]
        },
        enviada: {
            primary: PRIMARY_COLORS.blue[500],
            light: PRIMARY_COLORS.blue[50],
            dark: PRIMARY_COLORS.blue[700],
            text: PRIMARY_COLORS.blue[700],
            border: PRIMARY_COLORS.blue[300]
        },
        aprovada: {
            primary: PRIMARY_COLORS.green[500],
            light: PRIMARY_COLORS.green[50],
            dark: PRIMARY_COLORS.green[700],
            text: PRIMARY_COLORS.green[700],
            border: PRIMARY_COLORS.green[300]
        },
        rejeitada: {
            primary: PRIMARY_COLORS.red[500],
            light: PRIMARY_COLORS.red[50],
            dark: PRIMARY_COLORS.red[700],
            text: PRIMARY_COLORS.red[700],
            border: PRIMARY_COLORS.red[300]
        }
    },

    // Status de sistema
    sistema: {
        ativo: {
            primary: PRIMARY_COLORS.green[500],
            light: PRIMARY_COLORS.green[50],
            dark: PRIMARY_COLORS.green[700],
            text: PRIMARY_COLORS.green[700],
            border: PRIMARY_COLORS.green[300]
        },
        inativo: {
            primary: PRIMARY_COLORS.red[500],
            light: PRIMARY_COLORS.red[50],
            dark: PRIMARY_COLORS.red[700],
            text: PRIMARY_COLORS.red[700],
            border: PRIMARY_COLORS.red[300]
        },
        pendente: {
            primary: PRIMARY_COLORS.yellow[500],
            light: PRIMARY_COLORS.yellow[50],
            dark: PRIMARY_COLORS.yellow[700],
            text: PRIMARY_COLORS.yellow[700],
            border: PRIMARY_COLORS.yellow[300]
        },
        existente: {
            primary: PRIMARY_COLORS.blue[500],
            light: PRIMARY_COLORS.blue[50],
            dark: PRIMARY_COLORS.blue[700],
            text: PRIMARY_COLORS.blue[700],
            border: PRIMARY_COLORS.blue[300]
        }
    }
};

// ============================================================================
// 🎯 CORES DE INTERFACE (UI)
// ============================================================================

export const UI_COLORS = {
    // Botões
    button: {
        primary: {
            background: PRIMARY_COLORS.blue[500],
            backgroundHover: PRIMARY_COLORS.blue[600],
            backgroundActive: PRIMARY_COLORS.blue[700],
            text: '#ffffff',
            border: PRIMARY_COLORS.blue[500]
        },
        secondary: {
            background: '#ffffff',
            backgroundHover: NEUTRAL_COLORS.gray[50],
            backgroundActive: NEUTRAL_COLORS.gray[100],
            text: NEUTRAL_COLORS.text.primary,
            border: NEUTRAL_COLORS.gray[300]
        },
        success: {
            background: PRIMARY_COLORS.green[500],
            backgroundHover: PRIMARY_COLORS.green[600],
            backgroundActive: PRIMARY_COLORS.green[700],
            text: '#ffffff',
            border: PRIMARY_COLORS.green[500]
        },
        danger: {
            background: PRIMARY_COLORS.red[500],
            backgroundHover: PRIMARY_COLORS.red[600],
            backgroundActive: PRIMARY_COLORS.red[700],
            text: '#ffffff',
            border: PRIMARY_COLORS.red[500]
        },
        warning: {
            background: PRIMARY_COLORS.yellow[500],
            backgroundHover: PRIMARY_COLORS.yellow[600],
            backgroundActive: PRIMARY_COLORS.yellow[700],
            text: '#ffffff',
            border: PRIMARY_COLORS.yellow[500]
        }
    },

    // Inputs
    input: {
        background: '#ffffff',
        backgroundDisabled: NEUTRAL_COLORS.background.secondary,
        border: NEUTRAL_COLORS.gray[300],
        borderFocus: PRIMARY_COLORS.blue[500],
        borderError: PRIMARY_COLORS.red[500],
        text: NEUTRAL_COLORS.text.primary,
        textPlaceholder: NEUTRAL_COLORS.text.tertiary,
        textDisabled: NEUTRAL_COLORS.text.disabled
    },

    // Cards
    card: {
        background: '#ffffff',
        backgroundHover: '#ffffff',
        border: NEUTRAL_COLORS.gray[200],
        borderHover: NEUTRAL_COLORS.gray[300],
        shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        shadowHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
    },

    // Modais
    modal: {
        overlay: 'rgba(0, 0, 0, 0.5)',
        background: '#ffffff',
        border: NEUTRAL_COLORS.gray[200],
        shadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
    }
};

// ============================================================================
// 🎯 CORES DE ACESSIBILIDADE
// ============================================================================

export const ACCESSIBILITY_COLORS = {
    // Contraste mínimo WCAG AA
    contrast: {
        high: '#000000',      // Contraste máximo
        medium: '#374151',    // Contraste médio
        low: '#6b7280'       // Contraste baixo (não usar para texto principal)
    },

    // Estados de foco
    focus: {
        ring: PRIMARY_COLORS.blue[500],
        ringOffset: '#ffffff'
    },

    // Estados de seleção
    selection: {
        background: PRIMARY_COLORS.blue[100],
        text: PRIMARY_COLORS.blue[900]
    }
};

// ============================================================================
// 🎯 MAPEAMENTO DE CORES PARA TAILWIND
// ============================================================================

export const TAILWIND_COLOR_MAP = {
    // Cores customizadas para Tailwind
    custom: {
        blue: PRIMARY_COLORS.blue[500],
        'blue-light': PRIMARY_COLORS.blue[50],
        'blue-dark': PRIMARY_COLORS.blue[700],
        green: PRIMARY_COLORS.green[500],
        'green-light': PRIMARY_COLORS.green[50],
        'green-dark': PRIMARY_COLORS.green[700],
        red: PRIMARY_COLORS.red[500],
        'red-light': PRIMARY_COLORS.red[50],
        'red-dark': PRIMARY_COLORS.red[700],
        yellow: PRIMARY_COLORS.yellow[500],
        'yellow-light': PRIMARY_COLORS.yellow[50],
        'yellow-dark': PRIMARY_COLORS.yellow[700],
        purple: PRIMARY_COLORS.purple[500],
        'purple-light': PRIMARY_COLORS.purple[50],
        'purple-dark': PRIMARY_COLORS.purple[700]
    }
};

// ============================================================================
// 🎯 EXPORTAÇÕES PRINCIPAIS
// ============================================================================

export default {
    primary: PRIMARY_COLORS,
    neutral: NEUTRAL_COLORS,
    semantic: SEMANTIC_COLORS,
    ui: UI_COLORS,
    accessibility: ACCESSIBILITY_COLORS,
    tailwind: TAILWIND_COLOR_MAP
};
