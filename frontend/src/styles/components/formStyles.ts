// 📝 Estilos para Formulários
// Classes CSS padronizadas para todos os formulários do sistema

export const formStyles = {
  // Container principal do formulário
  container: {
    wrapper: "space-y-6",
    section: "space-y-4",
    row: "flex items-center gap-2",
    grid: "grid grid-cols-1 md:grid-cols-2 gap-4",
  },

  // Grupos de campos
  fieldGroup: {
    wrapper: "space-y-4",
    title: "text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4",
    description: "text-sm text-gray-600 mb-4",
  },

  // Labels
  label: {
    base: "block text-sm font-medium text-gray-700 mb-1",
    required: "block text-sm font-medium text-gray-700 mb-1 after:content-['*'] after:text-red-500 after:ml-1",
    optional: "block text-sm font-medium text-gray-700 mb-1 after:content-['(opcional)'] after:text-gray-400 after:ml-1 after:text-xs",
    inline: "text-sm font-medium text-gray-700",
  },

  // Inputs
  input: {
    base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors",
    error: "border-red-300 focus:ring-red-500 focus:border-red-300",
    success: "border-green-300 focus:ring-green-500 focus:border-green-300",
    disabled: "bg-gray-50 text-gray-500 cursor-not-allowed",
    
    // Com ícone
    withIcon: "pl-10",
    withIconRight: "pr-10",
    
    // Tamanhos
    sizes: {
      sm: "px-2.5 py-1.5 text-sm",
      md: "px-3 py-2 text-sm",
      lg: "px-4 py-3 text-base",
    }
  },

  // Ícones para inputs
  inputIcon: {
    wrapper: "relative",
    left: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4",
    right: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4",
  },

  // Selects
  select: {
    base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white transition-colors",
    error: "border-red-300 focus:ring-red-500 focus:border-red-300",
    disabled: "bg-gray-50 text-gray-500 cursor-not-allowed",
    
    // Tamanhos
    sizes: {
      sm: "px-2.5 py-1.5 text-sm",
      md: "px-3 py-2 text-sm", 
      lg: "px-4 py-3 text-base",
    }
  },

  // Textarea
  textarea: {
    base: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none transition-colors",
    error: "border-red-300 focus:ring-red-500 focus:border-red-300",
    resizable: "resize-y",
    
    // Tamanhos
    sizes: {
      sm: "h-20",
      md: "h-24",
      lg: "h-32",
      xl: "h-40",
    }
  },

  // Checkboxes e Radio buttons
  checkbox: {
    wrapper: "flex items-center",
    wrapperInline: "flex items-center space-x-4",
    input: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors",
    label: "ml-2 block text-sm text-gray-900",
    description: "ml-6 text-sm text-gray-500",
  },

  radio: {
    wrapper: "flex items-center",
    wrapperInline: "flex items-center space-x-4",
    input: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 transition-colors",
    label: "ml-2 block text-sm text-gray-900",
    description: "ml-6 text-sm text-gray-500",
  },

  // Switch/Toggle
  switch: {
    wrapper: "flex items-center justify-between",
    button: "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
    buttonEnabled: "bg-blue-600",
    buttonDisabled: "bg-gray-200",
    toggle: "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
    toggleEnabled: "translate-x-5",
    toggleDisabled: "translate-x-0",
    label: "text-sm font-medium text-gray-900",
  },

  // Mensagens de validação
  validation: {
    error: "text-red-600 text-sm mt-1 flex items-center",
    success: "text-green-600 text-sm mt-1 flex items-center", 
    warning: "text-yellow-600 text-sm mt-1 flex items-center",
    help: "text-gray-500 text-sm mt-1",
    
    // Ícones para mensagens
    errorIcon: "w-4 h-4 mr-1",
    successIcon: "w-4 h-4 mr-1", 
    warningIcon: "w-4 h-4 mr-1",
  },

  // Ações do formulário
  actions: {
    wrapper: "flex justify-end space-x-3 mt-6",
    wrapperStart: "flex justify-start space-x-3 mt-6",
    wrapperCenter: "flex justify-center space-x-3 mt-6",
    wrapperBetween: "flex justify-between items-center mt-6",
    wrapperSpaced: "flex justify-end space-x-3 mt-4",
    
    // Sticky actions (ficam fixos no final)
    sticky: "sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end space-x-3",
  },

  // File upload
  fileUpload: {
    wrapper: "relative",
    input: "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
    dropzone: "border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors",
    dropzoneActive: "border-blue-500 bg-blue-50",
    
    // Conteúdo da dropzone
    content: {
      wrapper: "space-y-2",
      icon: "w-12 h-12 text-gray-400 mx-auto",
      text: "text-sm text-gray-600",
      subtext: "text-xs text-gray-500",
    }
  },

  // Grupos de campos com título
  fieldSet: {
    wrapper: "space-y-4",
    legend: "text-lg font-medium text-gray-900 mb-4",
    description: "text-sm text-gray-600 mb-4",
    content: "space-y-4 pl-4 border-l-2 border-gray-200",
  },

  // Layout específicos
  layouts: {
    // Duas colunas
    twoColumns: "grid grid-cols-1 md:grid-cols-2 gap-6",
    
    // Três colunas
    threeColumns: "grid grid-cols-1 md:grid-cols-3 gap-6",
    
    // Formulário inline
    inline: "flex items-end space-x-4",
    
    // Formulário compacto
    compact: "space-y-3",
  }
} as const;