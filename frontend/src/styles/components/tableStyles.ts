// 📊 Estilos para Tabelas de Dados
// Classes CSS padronizadas para todas as tabelas do sistema

export const tableStyles = {
  // Container principal da tabela
  container: {
    wrapper: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
    scrollWrapper: "overflow-x-auto",
  },

  // Tabela
  table: {
    base: "min-w-full divide-y divide-gray-200",
  },

  // Cabeçalho da tabela
  header: {
    wrapper: "bg-gray-50",
    row: "",
    cell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
    cellCenter: "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider",
    cellRight: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider",
  },

  // Corpo da tabela
  body: {
    wrapper: "bg-white divide-y divide-gray-200",
    row: "hover:bg-gray-50 transition-colors",
    rowSelected: "bg-blue-50 hover:bg-blue-100",
  },

  // Células
  cell: {
    base: "px-6 py-4 whitespace-nowrap",
    
    // Tipos de conteúdo
    text: "text-sm text-gray-900",
    textSecondary: "text-sm text-gray-500",
    textBold: "text-sm font-medium text-gray-900",
    
    // Alinhamentos
    left: "text-left",
    center: "text-center", 
    right: "text-right",
    
    // Ações
    actions: "text-right text-sm font-medium",
  },

  // Ações da linha
  actions: {
    wrapper: "flex items-center justify-end space-x-1",
    wrapperStart: "flex items-center justify-start space-x-1",
    wrapperCenter: "flex items-center justify-center space-x-1",
    
    // Botões de ação individual
    button: "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
    
    // Variações por tipo de ação
    view: "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
    edit: "text-green-600 hover:text-green-700 hover:bg-green-50",
    delete: "text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed",
    add: "text-green-500 hover:text-green-600 hover:bg-green-50",
    
    // Ícones
    icon: "w-4 h-4",
    iconLarge: "w-5 h-5",
  },

  // Estados especiais
  states: {
    loading: {
      wrapper: "animate-pulse",
      cell: "bg-gray-200 h-4 rounded",
    },
    
    empty: {
      wrapper: "text-center py-8",
      icon: "w-12 h-12 text-gray-400 mx-auto mb-4",
      title: "text-lg font-medium text-gray-900 mb-2",
      description: "text-gray-500",
    },
    
    error: {
      wrapper: "text-center py-8",
      icon: "w-12 h-12 text-red-400 mx-auto mb-4", 
      title: "text-lg font-medium text-red-900 mb-2",
      description: "text-red-600",
    }
  },

  // Status e badges dentro da tabela
  status: {
    badge: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    
    // Variações por status
    active: "bg-green-100 text-green-800",
    inactive: "bg-red-100 text-red-800", 
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
    
    // Indicador de status com ponto
    dot: "w-2 h-2 rounded-full inline-block mr-2",
    dotActive: "bg-green-400",
    dotInactive: "bg-red-400",
    dotPending: "bg-yellow-400",
  },

  // Checkbox/seleção
  selection: {
    headerWrapper: "px-6 py-3",
    cellWrapper: "px-6 py-4",
    checkbox: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded",
    label: "sr-only",
  },

  // Ordenação
  sorting: {
    button: "group inline-flex items-center space-x-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700",
    icon: "w-4 h-4 text-gray-400 group-hover:text-gray-600",
    iconActive: "w-4 h-4 text-blue-600",
  },

  // Paginação dentro da tabela
  pagination: {
    wrapper: "bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6",
    
    // Info da paginação
    info: "text-sm text-gray-700",
    infoHighlight: "font-medium",
    
    // Controles de navegação
    nav: {
      wrapper: "flex items-center space-x-2",
      
      // Versão mobile
      mobile: {
        wrapper: "flex-1 flex justify-between sm:hidden",
        button: "relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
      },
      
      // Versão desktop
      desktop: {
        wrapper: "hidden sm:flex-1 sm:flex sm:items-center sm:justify-between",
        navContainer: "relative z-0 inline-flex rounded-md shadow-sm -space-x-px",
        button: "relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
        buttonFirst: "rounded-l-md",
        buttonLast: "rounded-r-md",
        buttonCurrent: "z-10 bg-blue-50 border-blue-500 text-blue-600",
      }
    }
  }
} as const;