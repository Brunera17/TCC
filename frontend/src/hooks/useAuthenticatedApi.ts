import { useAuth } from '../context/AuthContext';
import { fetchJSON } from '../lib/api';

/**
 * Hook personalizado que integra a autenticação com as chamadas da API
 * Garante que todas as requests tenham o token correto
 */
export const useAuthenticatedApi = () => {
  const { token, getAuthHeaders } = useAuth();

  /**
   * Faz uma request autenticada para a API
   */
  const authenticatedRequest = async (
    input: RequestInfo | URL, 
    init: RequestInit = {}
  ) => {
    // Garantir que os headers de auth estão incluídos
    const authHeaders = getAuthHeaders();
    const headers = {
      ...authHeaders,
      ...init.headers,
    };

    console.log('🔑 Request autenticada:', {
      url: input.toString(),
      method: init.method || 'GET',
      hasToken: !!token,
      headers: headers
    });

    return fetchJSON(input, {
      ...init,
      headers
    });
  };

  return {
    token,
    hasValidToken: !!token,
    authenticatedRequest,
    getAuthHeaders
  };
};

export default useAuthenticatedApi;