// 🎨 Design System - Sistema de Classes Padronizadas
// Arquivo central de estilos reutilizáveis usando Tailwind CSS

export const designSystem = {
  // 📑 PÁGINAS - Layout base para todas as páginas administrativas
  page: {
    container: "space-y-6",
    
    // Cabeçalho da página
    header: {
      wrapper: "mb-6",
      title: "text-2xl font-bold text-gray-900",
      subtitle: "text-sm text-gray-500 mt-1",
    },
    
    // Área de ações (busca + botão principal)
    actions: {
      wrapper: "flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center",
      searchContainer: "flex flex-col sm:flex-row gap-4 flex-1",
      
      // Formulário de busca
      searchForm: "flex-1 max-w-md",
      searchWrapper: "relative",
      searchIcon: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4",
      searchInput: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      
      // Filtros
      filterSelect: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      
      // Botão principal de ação
      primaryButton: "flex items-center px-4 py-2 bg-custom-blue text-white rounded-lg hover:bg-custom-blue-light transition-colors",
      primaryButtonIcon: "w-4 h-4 mr-2",
    },
    
    // Mensagens de erro
    errorMessage: "bg-red-50 border border-red-200 rounded-lg p-4 text-red-700",
    
    // Área de conteúdo principal
    content: {
      loadingWrapper: "flex items-center justify-center h-64",
      
      // Container da tabela/lista
      tableContainer: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
      tableWrapper: "overflow-x-auto",
      
      // Estado vazio
      emptyState: {
        wrapper: "text-center py-8",
        icon: "w-12 h-12 text-gray-400 mx-auto mb-4",
        text: "text-gray-500",
      }
    }
  },

  // 📊 TABELA - Estilos para tabelas de dados
  table: {
    base: "min-w-full divide-y divide-gray-200",
    
    // Cabeçalho
    header: {
      wrapper: "bg-gray-50",
      cell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
    },
    
    // Corpo da tabela
    body: {
      wrapper: "bg-white divide-y divide-gray-200",
      row: "hover:bg-gray-50",
      
      // Células
      cell: {
        base: "px-6 py-4 whitespace-nowrap",
        text: "text-sm text-gray-900",
        textSecondary: "text-sm text-gray-500",
        actions: "text-right text-sm font-medium",
      }
    },
    
    // Ações da linha
    actions: {
      wrapper: "flex items-center justify-end space-x-1",
      button: "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
      
      // Variações de botões de ação
      view: "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
      edit: "text-green-600 hover:text-green-700 hover:bg-green-50",
      delete: "text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed",
      
      icon: "w-4 h-4",
    }
  },

  // 🏷️ BADGES - Sistema de badges para status
  badge: {
    base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    
    // Variações por estado
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
    
    // Variações semânticas
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
    neutral: "bg-gray-100 text-gray-800",
  },

  // 🔘 BOTÕES - Sistema de botões padronizado
  button: {
    // Base para todos os botões
    base: "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    
    // Tamanhos
    sizes: {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm", 
      lg: "px-6 py-3 text-base",
    },
    
    // Variações de estilo
    variants: {
      primary: "bg-custom-blue text-white hover:bg-custom-blue-light focus:ring-blue-500",
      secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
      success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
    },
    
    // Estados especiais
    disabled: "opacity-50 cursor-not-allowed",
    loading: "opacity-75 cursor-wait",
    
    // Botões de ação pequenos (ícones)
    iconButton: {
      base: "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
      view: "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
      edit: "text-green-600 hover:text-green-700 hover:bg-green-50", 
      delete: "text-red-600 hover:text-red-700 hover:bg-red-50",
      add: "text-green-600 hover:text-green-700 hover:bg-green-50",
    }
  },

  // 📝 FORMULÁRIOS - Sistema de formulários padronizado
  form: {
    // Container do formulário
    wrapper: "space-y-6",
    
    // Grupos de campos
    fieldGroup: "space-y-4",
    fieldRow: "flex items-center gap-2",
    
    // Labels
    label: {
      base: "block text-sm font-medium text-gray-700 mb-1",
      required: "block text-sm font-medium text-gray-700 mb-1 after:content-['*'] after:text-red-500 after:ml-1",
    },
    
    // Inputs
    input: {
      base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
      error: "border-red-300 focus:ring-red-500 focus:border-red-300",
      disabled: "bg-gray-50 text-gray-500 cursor-not-allowed",
    },
    
    // Selects
    select: {
      base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm",
      error: "border-red-300 focus:ring-red-500 focus:border-red-300",
    },
    
    // Textarea
    textarea: {
      base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none",
      error: "border-red-300 focus:ring-red-500 focus:border-red-300",
    },
    
    // Checkboxes
    checkbox: {
      wrapper: "flex items-center",
      input: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded",
      label: "ml-2 block text-sm text-gray-900",
    },
    
    // Mensagens de erro
    errorText: "text-red-600 text-sm mt-1",
    helpText: "text-gray-500 text-sm mt-1",
    
    // Ações do formulário
    actions: {
      wrapper: "flex justify-end space-x-3 mt-6",
      wrapperSpaced: "flex justify-end space-x-3 mt-4",
    }
  },

  // 🔄 PAGINAÇÃO - Sistema de paginação padronizado
  pagination: {
    wrapper: "bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6",
    
    // Versão mobile
    mobile: {
      wrapper: "flex-1 flex justify-between sm:hidden",
      button: "relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50",
    },
    
    // Versão desktop
    desktop: {
      wrapper: "hidden sm:flex-1 sm:flex sm:items-center sm:justify-between",
      info: "text-sm text-gray-700",
      nav: "relative z-0 inline-flex rounded-md shadow-sm -space-x-px",
      button: "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50",
      buttonFirst: "rounded-l-md",
      buttonLast: "rounded-r-md",
    }
  },

  // 🏠 MODAL - Sistema de modais padronizado  
  modal: {
    overlay: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
    container: "bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto",
    
    // Tamanhos de modal
    sizes: {
      sm: "max-w-sm",
      md: "max-w-md", 
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
    },
    
    // Partes do modal
    header: {
      wrapper: "px-6 py-4 border-b border-gray-200",
      title: "text-lg font-semibold text-gray-900",
    },
    
    body: "px-6 py-4",
    
    footer: {
      wrapper: "px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg",
      actions: "flex justify-end space-x-3",
    }
  },

  // 🎯 UTILITÁRIOS - Classes utilitárias específicas do projeto
  utils: {
    // Mensagens de acesso negado
    accessDenied: {
      wrapper: "flex items-center justify-center min-h-screen",
      container: "text-center",
      icon: "mx-auto h-12 w-12 text-red-500 mb-4",
      title: "text-xl font-semibold text-gray-900 mb-2",
      message: "text-gray-600",
    },
    
    // Loading states
    loading: {
      wrapper: "flex items-center justify-center h-64",
      spinner: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600",
    },
    
    // Valor monetário
    currency: "font-semibold text-gray-900",
    
    // Status indicators
    statusDot: "w-2 h-2 rounded-full inline-block mr-2",
  }
} as const;

// 🎨 Função helper para combinar classes CSS
export const cn = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// 🎯 Função helper para aplicar estilos de badge baseado no status
export const getBadgeClasses = (status: string, type: 'status' | 'boolean' = 'status'): string => {
  if (type === 'boolean') {
    return status === 'true' || status === true ? designSystem.badge.active : designSystem.badge.inactive;
  }
  
  const statusMap: Record<string, string> = {
    'ativo': designSystem.badge.active,
    'inativo': designSystem.badge.inactive,
    'pendente': designSystem.badge.pending,
    'aprovado': designSystem.badge.success,
    'rejeitado': designSystem.badge.error,
    'cancelado': designSystem.badge.neutral,
  };
  
  return statusMap[status?.toLowerCase()] || designSystem.badge.neutral;
};

// 🔘 Função helper para gerar classes de botão
export const getButtonClasses = (variant: keyof typeof designSystem.button.variants = 'primary', size: keyof typeof designSystem.button.sizes = 'md', disabled = false): string => {
  return cn(
    designSystem.button.base,
    designSystem.button.sizes[size],
    designSystem.button.variants[variant],
    disabled && designSystem.button.disabled
  );
};