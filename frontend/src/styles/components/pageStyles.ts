// 📑 Estilos para Páginas Administrativas
// Classes CSS padronizadas para todas as páginas de gestão

export const pageStyles = {
  // Layout base da página
  layout: {
    container: "space-y-6",
    
    // Wrapper para páginas com verificação de permissão
    permissionWrapper: "space-y-6",
    
    // Wrapper para loading de verificação
    loadingWrapper: "flex items-center justify-center h-64",
  },

  // Cabeçalho da página
  header: {
    wrapper: "mb-6",
    title: "text-2xl font-bold text-gray-900",
    subtitle: "text-sm text-gray-500 mt-1",
  },

  // Barra de ações (busca + filtros + botão principal)
  actionBar: {
    wrapper: "flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center",
    leftSection: "flex flex-col sm:flex-row gap-4 flex-1",
    rightSection: "flex gap-2",
    
    // Busca
    searchForm: "flex-1 max-w-md",
    searchContainer: "relative",
    searchIcon: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4",
    searchInput: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    
    // Filtros
    filterSelect: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    
    // Botão principal
    primaryButton: "flex items-center px-4 py-2 bg-custom-blue text-white rounded-lg hover:bg-custom-blue-light transition-colors",
    primaryButtonIcon: "w-4 h-4 mr-2",
    
    // Botão secundário
    secondaryButton: "flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors",
  },

  // Mensagens
  messages: {
    error: "bg-red-50 border border-red-200 rounded-lg p-4",
    errorText: "text-red-700",
    
    success: "bg-green-50 border border-green-200 rounded-lg p-4",
    successText: "text-green-700",
    
    warning: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", 
    warningText: "text-yellow-700",
    
    info: "bg-blue-50 border border-blue-200 rounded-lg p-4",
    infoText: "text-blue-700",
  },

  // Conteúdo principal
  content: {
    wrapper: "space-y-6",
    
    // Loading
    loadingContainer: "flex items-center justify-center h-64",
    
    // Container da lista/tabela
    listContainer: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
    
    // Estado vazio
    emptyState: {
      wrapper: "text-center py-8",
      icon: "w-12 h-12 text-gray-400 mx-auto mb-4",
      title: "text-lg font-medium text-gray-900 mb-2",
      description: "text-gray-500",
      action: "mt-4",
    }
  },

  // Acesso negado
  accessDenied: {
    wrapper: "flex items-center justify-center min-h-screen",
    container: "text-center",
    icon: "mx-auto h-12 w-12 text-red-500 mb-4",
    title: "text-xl font-semibold text-gray-900 mb-2", 
    message: "text-gray-600",
  },

  // Wrapper específico para páginas com header personalizado
  customHeader: {
    wrapper: "space-y-6",
    content: "space-y-4",
  }
} as const;