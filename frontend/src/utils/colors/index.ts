/**
 * 🎨 ÍNDICE DO SISTEMA DE CORES
 * 
 * Este arquivo centraliza todas as exportações do sistema de cores
 * para facilitar as importações nos componentes.
 * 
 * @version 1.0.0
 * @author Sistema de Propostas
 */

// ============================================================================
// 🎯 EXPORTAÇÕES PRINCIPAIS
// ============================================================================

// Sistema de cores
export { default as colorSystem } from './colorSystem';
export * from './colorSystem';

// Funções utilitárias
export { default as colorUtils } from './colorUtils';
export * from './colorUtils';

// ============================================================================
// 🎯 EXPORTAÇÕES CONVENIENTES
// ============================================================================

// Funções mais utilizadas
export {
    getClienteConfig,
    getClienteCssClasses,
    getClienteClasses,
    getStatusClasses,
    getButtonClasses,
    getInputClasses,
    getCardClasses
} from './colorUtils';

// Funções de validação
export {
    hasAdequateContrast,
    isLightColor,
    getContrastingTextColor,
    getContrastRatio
} from './colorUtils';

// Funções de conversão
export {
    hexToRgb,
    hexToHsl,
    generateColorPalette,
    toCssColor,
    generateCssVariables
} from './colorUtils';

// ============================================================================
// 🎯 TIPOS E INTERFACES
// ============================================================================

export type {
    ColorVariant,
    ColorType,
    ClienteType,
    StatusType,
    PropostaStatus,
    ColorConfig,
    TailwindClasses
} from './colorUtils';
