// 🏠 Estilos para Modais
// Classes CSS padronizadas para todos os modais do sistema

export const modalStyles = {
  // Overlay e container principal
  overlay: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
  
  // Container do modal
  container: {
    base: "bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-hidden",
    
    // Tamanhos
    sizes: {
      xs: "max-w-xs",
      sm: "max-w-sm", 
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      full: "max-w-full mx-4",
    },
    
    // Scroll
    scrollable: "overflow-y-auto",
  },

  // Cabeçalho do modal
  header: {
    wrapper: "px-6 py-4 border-b border-gray-200 flex items-center justify-between",
    title: "text-lg font-semibold text-gray-900",
    subtitle: "text-sm text-gray-500 mt-1",
    
    // Botão de fechar
    closeButton: "text-gray-400 hover:text-gray-600 transition-colors",
    closeIcon: "w-6 h-6",
  },

  // Corpo do modal
  body: {
    wrapper: "px-6 py-4",
    wrapperScrollable: "px-6 py-4 overflow-y-auto max-h-96",
    content: "space-y-4",
  },

  // Rodapé do modal
  footer: {
    wrapper: "px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg",
    wrapperSimple: "px-6 py-4 border-t border-gray-200",
    
    // Ações
    actions: "flex justify-end space-x-3",
    actionsStart: "flex justify-start space-x-3",
    actionsCenter: "flex justify-center space-x-3", 
    actionsBetween: "flex justify-between items-center",
  },

  // Tipos específicos de modal
  types: {
    // Modal de confirmação
    confirmation: {
      container: "max-w-md",
      icon: "w-12 h-12 mx-auto mb-4",
      iconDanger: "text-red-500",
      iconWarning: "text-yellow-500",
      iconSuccess: "text-green-500",
      iconInfo: "text-blue-500",
      title: "text-lg font-medium text-gray-900 text-center mb-2",
      message: "text-sm text-gray-600 text-center mb-6",
    },
    
    // Modal de formulário
    form: {
      container: "max-w-lg",
      header: "pb-2",
      body: "space-y-6",
    },
    
    // Modal de visualização
    view: {
      container: "max-w-2xl",
      section: "space-y-4",
      label: "text-sm font-medium text-gray-500",
      value: "text-sm text-gray-900 mt-1",
    },
    
    // Modal de loading
    loading: {
      container: "max-w-sm",
      content: "text-center py-8",
      spinner: "w-8 h-8 animate-spin text-blue-600 mx-auto mb-4",
      text: "text-gray-600",
    }
  },

  // Estados especiais
  states: {
    // Animações de entrada/saída
    entering: "animate-fade-in",
    leaving: "animate-fade-out",
    
    // Modal em loading
    loading: "opacity-75 pointer-events-none",
    
    // Modal com erro
    error: "border-2 border-red-200",
  },

  // Componentes internos comuns
  components: {
    // Divider/separador
    divider: "border-t border-gray-200 my-4",
    
    // Seção com título
    section: {
      wrapper: "space-y-3",
      title: "text-base font-medium text-gray-900",
      content: "space-y-2",
    },
    
    // Lista de informações
    infoList: {
      wrapper: "space-y-3",
      item: "flex justify-between",
      label: "text-sm font-medium text-gray-500",
      value: "text-sm text-gray-900",
    },
    
    // Alertas dentro do modal
    alert: {
      wrapper: "rounded-lg p-4 mb-4",
      success: "bg-green-50 border border-green-200",
      error: "bg-red-50 border border-red-200", 
      warning: "bg-yellow-50 border border-yellow-200",
      info: "bg-blue-50 border border-blue-200",
      
      // Texto dos alertas
      successText: "text-green-700",
      errorText: "text-red-700",
      warningText: "text-yellow-700", 
      infoText: "text-blue-700",
    }
  },

  // Backdrop behaviors
  backdrop: {
    clickable: "cursor-pointer",
    static: "cursor-default",
  }
} as const;