// 🎨 Sistema de Design - Exportação Central
// Ponto único de importação para todos os estilos do sistema

export { designSystem, cn, getBadgeClasses, getButtonClasses } from './designSystem';
export { pageStyles } from './components/pageStyles';
export { tableStyles } from './components/tableStyles';
export { buttonStyles } from './components/buttonStyles';
export { formStyles } from './components/formStyles';
export { modalStyles } from './components/modalStyles';

// ✨ Helpers e utilitários
export const styleHelpers = {
  // Combinar classes condicionalmente
  cx: (...classes: (string | undefined | false | null)[]): string => {
    return classes.filter(Boolean).join(' ');
  },

  // Aplicar estilos baseado em condição
  conditional: (condition: boolean, trueClasses: string, falseClasses: string = ''): string => {
    return condition ? trueClasses : falseClasses;
  },

  // Gerar classes de status/badge automaticamente
  getStatusClasses: (status: string | boolean, type: 'active' | 'status' = 'status'): string => {
    if (type === 'active') {
      return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
    
    const statusMap: Record<string, string> = {
      'ativo': 'bg-green-100 text-green-800',
      'inativo': 'bg-red-100 text-red-800', 
      'pendente': 'bg-yellow-100 text-yellow-800',
      'aprovado': 'bg-green-100 text-green-800',
      'rejeitado': 'bg-red-100 text-red-800',
      'cancelado': 'bg-gray-100 text-gray-800',
      'rascunho': 'bg-yellow-100 text-yellow-800',
      'draft': 'bg-yellow-100 text-yellow-800',
    };
    
    return statusMap[status?.toString().toLowerCase()] || 'bg-gray-100 text-gray-800';
  },

  // Gerar classes de botão de ação
  getActionButtonClasses: (action: 'view' | 'edit' | 'delete' | 'add' | 'download'): string => {
    const actionMap = {
      view: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
      edit: 'text-green-600 hover:text-green-700 hover:bg-green-50',
      delete: 'text-red-600 hover:text-red-700 hover:bg-red-50',
      add: 'text-green-500 hover:text-green-600 hover:bg-green-50',
      download: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50',
    };
    
    return `inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${actionMap[action]}`;
  }
};

// 🎯 Configurações do tema
export const themeConfig = {
  // Cores customizadas do projeto
  customColors: {
    blue: '#2563eb',
    blueLight: '#dbeafe', 
    blueDark: '#1e40af',
  },
  
  // Breakpoints responsivos
  breakpoints: {
    sm: '640px',
    md: '768px', 
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Animações customizadas
  animations: {
    fadeIn: 'fadeIn 0.2s ease-in-out',
    fadeOut: 'fadeOut 0.2s ease-in-out',
    slideUp: 'slideUp 0.3s ease-out',
    slideDown: 'slideDown 0.3s ease-out',
  }
};