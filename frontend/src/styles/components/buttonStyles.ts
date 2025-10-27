// 🔘 Estilos para Botões
// Classes CSS padronizadas para todos os botões do sistema

export const buttonStyles = {
  // Base para todos os botões
  base: "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",

  // Tamanhos
  sizes: {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg",
  },

  // Variações de estilo principal
  variants: {
    // Botão primário (ações principais)
    primary: "bg-custom-blue text-white hover:bg-custom-blue-light focus:ring-blue-500 shadow-sm",
    
    // Botão secundário
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500 shadow-sm",
    
    // Botão de sucesso
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm",
    
    // Botão de perigo/exclusão
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
    
    // Botão de aviso
    warning: "bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 shadow-sm",
    
    // Botão fantasma (sem fundo)
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
    
    // Botão de link
    link: "text-blue-600 hover:text-blue-800 focus:ring-blue-500 underline-offset-4 hover:underline",
  },

  // Botões de ação específicos (ícones pequenos)
  actionButtons: {
    base: "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
    
    // Visualizar
    view: "text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:ring-blue-500",
    
    // Editar
    edit: "text-green-600 hover:text-green-700 hover:bg-green-50 focus:ring-green-500",
    
    // Excluir
    delete: "text-red-600 hover:text-red-700 hover:bg-red-50 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed",
    
    // Adicionar
    add: "text-green-500 hover:text-green-600 hover:bg-green-50 focus:ring-green-500",
    
    // Download
    download: "text-purple-600 hover:text-purple-700 hover:bg-purple-50 focus:ring-purple-500",
    
    // Configurações
    settings: "text-gray-600 hover:text-gray-700 hover:bg-gray-50 focus:ring-gray-500",
  },

  // Tamanhos para botões de ação
  actionSizes: {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10",
  },

  // Ícones dentro dos botões
  icons: {
    left: "mr-2",
    right: "ml-2",
    only: "",
    
    // Tamanhos de ícone
    sizes: {
      xs: "w-3 h-3",
      sm: "w-4 h-4", 
      md: "w-5 h-5",
      lg: "w-6 h-6",
    }
  },

  // Estados especiais
  states: {
    loading: "opacity-75 cursor-wait",
    disabled: "opacity-50 cursor-not-allowed",
    active: "ring-2 ring-blue-500 ring-offset-2",
  },

  // Grupos de botões
  groups: {
    wrapper: "inline-flex rounded-lg shadow-sm",
    item: "relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
    itemFirst: "rounded-l-lg",
    itemLast: "rounded-r-lg",
    itemMiddle: "-ml-px",
    itemActive: "bg-blue-50 border-blue-500 text-blue-700",
  },

  // Botões toggle/switch
  toggle: {
    base: "relative inline-flex items-center justify-center rounded-lg border-2 border-transparent font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    active: "bg-blue-600 text-white focus:ring-blue-500",
    inactive: "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500",
  },

  // Botões flutuantes (FAB)
  floating: {
    base: "fixed bottom-6 right-6 inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  }
} as const;