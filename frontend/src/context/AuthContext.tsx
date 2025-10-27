import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../lib/api';

interface User {
  id: number;
  nome: string;
  email: string;
  username: string;
  ativo: boolean;
  empresa_id?: number;
  cargo_id?: number;
  gerente?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null; // ✅ NOVO: Token acessível globalmente
  login: (identificador: string, senha: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  getAuthHeaders: () => { Authorization?: string }; // ✅ NOVO: Headers padronizados
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // ✅ NOVO: Estado do token
  const [loading, setLoading] = useState(true);

  // ✅ NOVO: Função para obter headers de autenticação
  const getAuthHeaders = (): { Authorization?: string } => {
    const currentToken = token || localStorage.getItem('access_token');
    if (currentToken) {
      console.log('🔑 Token encontrado para headers:', currentToken.substring(0, 20) + '...');
      return { Authorization: `Bearer ${currentToken}` };
    }
    console.warn('⚠️ Nenhum token disponível para autenticação');
    return {};
  };

  const loadUserInfo = async () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        throw new Error('No token found');
      }

      console.log('🔑 Carregando info do usuário com token:', storedToken.substring(0, 20) + '...');
      setToken(storedToken); // ✅ Sincronizar token no estado

      const response = await fetch(`${API_URL}/usuarios/me`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await response.json();
      
      // Mapear o campo eh_gerente para gerente para manter consistência da interface
      // Considerar usuários admin como gerentes se eh_gerente for false
      const mappedUser = {
        ...userInfo,
        gerente: userInfo.eh_gerente || userInfo.tipo_usuario === 'admin' || false
      };
      
      console.log('✅ Usuário carregado:', { ...mappedUser, token: '***' });
      setUser(mappedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
      setIsAuthenticated(false);
      setUser(null);
      setToken(null); // ✅ Limpar token do estado
      // Limpar tokens inválidos
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('autenticado');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const autenticado = localStorage.getItem('autenticado');
    
    if (token && autenticado === 'true') {
      loadUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identificador: string, senha: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identificador,
          senha
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }

      // ✅ MELHORADO: Salvar tokens com logs
      console.log('🔑 Salvando token de login:', data.access_token.substring(0, 20) + '...');
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('autenticado', 'true');

      // ✅ Sincronizar token no estado global
      setToken(data.access_token);

      // Mapear o campo eh_gerente para gerente para manter consistência da interface
      // Considerar usuários admin como gerentes se eh_gerente for false
      const mappedUser = {
        ...data.user,
        gerente: data.user.eh_gerente || data.user.tipo_usuario === 'admin' || false
      };

      console.log('✅ Login bem-sucedido:', { ...mappedUser, token: '***' });
      setUser(mappedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 Fazendo logout...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('autenticado');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null); // ✅ Limpar token do estado
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      token, // ✅ NOVO: Token acessível globalmente
      login, 
      logout, 
      loading,
      getAuthHeaders // ✅ NOVO: Função para headers
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};