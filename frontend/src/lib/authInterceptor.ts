/**
 * Interceptador de autenticação que trata automaticamente 
 * erros 401/403 e re-autentica quando necessário
 */

import { fetchJSON as originalFetchJSON } from './api';

let isReauthenticating = false;

/**
 * Wrapper da fetchJSON que intercepta erros de autenticação
 */
export async function authenticatedFetchJSON(
  input: RequestInfo | URL, 
  init: RequestInit = {}
) {
  try {
    return await originalFetchJSON(input, init);
  } catch (error: any) {
    const errorMessage = error.message || '';
    
    // Interceptar erro 403 - Acesso negado
    if (errorMessage.includes('403')) {
      console.warn('⚠️ 403 Forbidden - Verificando permissões de usuário...');
      
      // Verificar se o usuário atual tem permissões
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const isManager = user.eh_gerente || user.tipo_usuario === 'admin';
      
      if (!isManager) {
        console.error('❌ Usuário não tem permissão de gerente para esta operação');
        throw new Error(
          `Acesso negado: Esta operação requer permissões de gerente.\n\n` +
          `Usuário atual: ${user.nome || 'Desconhecido'}\n` +
          `Tipo: ${user.tipo_usuario || 'Não definido'}\n` +
          `É gerente: ${isManager ? 'Sim' : 'Não'}\n\n` +
          `Para resolver:\n` +
          `1. Faça login com uma conta de gerente\n` +
          `2. Ou solicite permissões ao administrador`
        );
      }
    }
    
    // Interceptar erro 401 - Token inválido/expirado
    if (errorMessage.includes('401') && !isReauthenticating) {
      console.warn('⚠️ 401 Unauthorized - Token pode estar expirado, tentando reautenticar...');
      isReauthenticating = true;
      
      try {
        // Tentar reautenticar automaticamente
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          console.log('🔄 Tentando renovar token...');
          // Aqui você poderia implementar a renovação automática
          // Por ora, limpar e forçar novo login
        }
        
        // Se falhou, limpar tudo e forçar novo login
        console.log('🚪 Forçando novo login...');
        localStorage.clear();
        window.location.href = '/';
        return;
        
      } finally {
        isReauthenticating = false;
      }
    }
    
    // Re-throw outros erros
    throw error;
  }
}

/**
 * Helper para verificar se o usuário atual tem permissões de gerente
 */
export function hasManagerPermissions(): boolean {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return Boolean(user.eh_gerente || user.tipo_usuario === 'admin');
  } catch {
    return false;
  }
}

/**
 * Helper para mostrar informações do usuário atual
 */
export function getCurrentUserInfo() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('access_token');
    
    return {
      user,
      hasToken: Boolean(token),
      isManager: hasManagerPermissions(),
      tokenPreview: token ? token.substring(0, 20) + '...' : null
    };
  } catch {
    return {
      user: {},
      hasToken: false,
      isManager: false,
      tokenPreview: null
    };
  }
}