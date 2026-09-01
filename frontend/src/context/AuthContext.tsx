import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL, markTokensIssued, clearTokenMetadata } from '../lib/api';

interface EmpresaInfo {
  id?: number;
  nome?: string;
}

interface CargoInfo {
  id?: number;
  nome?: string | null;
}

interface User {
  id: number;
  nome: string;
  email: string;
  username: string;
  ativo: boolean;
  empresa_id?: number;
  empresa?: EmpresaInfo;
  cargo_id?: number;
  gerente?: boolean;
  foto?: string | null;
  tipo_usuario?: string | null;
  cargo?: CargoInfo | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (identificador: string, senha: string) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
  getAuthHeaders: () => { Authorization?: string };
  syncUser: (rawUser: unknown) => User | null;
  reloadUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

type LooseRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is LooseRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveEmpresaData = (rawUser: LooseRecord | null | undefined): { empresaId?: number; empresa?: EmpresaInfo } => {
  if (!rawUser) return {};

  const candidates: Array<number | undefined> = [
    coerceNumber(rawUser['empresa_id']),
    coerceNumber(rawUser['empresaId']),
    coerceNumber(rawUser['empresaID']),
  ];

  let empresaFonte: LooseRecord | undefined;

  const empresaValue = rawUser['empresa'];
  if (isRecord(empresaValue)) {
    empresaFonte = empresaValue;
  }

  if (!empresaFonte) {
    const empresasValue = rawUser['empresas'];
    if (Array.isArray(empresasValue)) {
      const registros = (empresasValue as unknown[]).filter(isRecord) as LooseRecord[];
      if (registros.length > 0) {
        empresaFonte = registros.find((item) => Boolean(item['ativo'] ?? item['ativa'])) ?? registros[0];
      }
    }
  }

  if (empresaFonte) {
    candidates.push(
      coerceNumber(empresaFonte['id']),
      coerceNumber(empresaFonte['empresa_id']),
      coerceNumber(empresaFonte['empresaId']),
      coerceNumber(empresaFonte['empresaID'])
    );
  }

  const empresaId = candidates.find((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const resolveNome = (): string | undefined => {
    if (!empresaFonte) return undefined;
    const possiveis = ['nome', 'name', 'razao_social'];
    for (const key of possiveis) {
      const valor = empresaFonte[key];
      if (typeof valor === 'string' && valor.trim()) {
        return valor;
      }
    }
    return undefined;
  };

  const empresa: EmpresaInfo | undefined = empresaFonte || empresaId !== undefined
    ? {
        id: empresaId ?? coerceNumber(empresaFonte?.['id']) ?? undefined,
        nome: resolveNome(),
      }
    : (empresaId ? { id: empresaId } : undefined);

  return { empresaId, empresa };
};

const normalizeApiUser = (rawUser: unknown): User => {
  if (!isRecord(rawUser)) {
    throw new Error('Usuário inválido retornado pela API');
  }

  const { empresaId, empresa } = resolveEmpresaData(rawUser);

  const nomeFonte = rawUser['nome'] ?? rawUser['name'];
  const emailFonte = rawUser['email'];
  const usernameFonte = rawUser['username'] ?? rawUser['login'] ?? rawUser['usuario'];
  const ativoFonte = rawUser['ativo'] ?? rawUser['is_active'];

  const id = coerceNumber(rawUser['id']);
  const cargoId = coerceNumber(rawUser['cargo_id'] ?? rawUser['cargoId'] ?? rawUser['cargoID']);
  const nome = typeof nomeFonte === 'string' ? nomeFonte : '';
  const email = typeof emailFonte === 'string' ? emailFonte : '';
  const username = typeof usernameFonte === 'string' ? usernameFonte : (email || nome);
  const ativo = typeof ativoFonte === 'boolean' ? ativoFonte : true;
  const gerente = Boolean(rawUser['eh_gerente']) || rawUser['tipo_usuario'] === 'admin' || Boolean(rawUser['gerente']);

  const normalized: User = {
    ...(rawUser as LooseRecord),
    id: id ?? 0,
    nome,
    email,
    username,
    ativo,
    cargo_id: cargoId,
    gerente,
    empresa_id: empresaId,
    empresa: empresa ?? (empresaId ? { id: empresaId } : undefined),
  } as User;

  return normalized;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyNormalizedUser = (raw: unknown): User => {
    const mappedUser = normalizeApiUser(raw);
    localStorage.setItem('user', JSON.stringify(mappedUser));
    setUser(mappedUser);
    setIsAuthenticated(true);
    return mappedUser;
  };

  const getAuthHeaders = (): { Authorization?: string } => {
    const currentToken = token || localStorage.getItem('access_token');
    if (currentToken) {
      return { Authorization: `Bearer ${currentToken}` };
    }
    console.warn('⚠️ Nenhum token disponível para autenticação');
    return {};
  };

  const loadUserInfo = useCallback(async (): Promise<User | null> => {
    try {
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        throw new Error('No token found');
      }

      setToken(storedToken);

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
      const mappedUser = applyNormalizedUser(userInfo);
  markTokensIssued();
      return mappedUser;
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('autenticado');
      clearTokenMetadata();
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const autenticado = localStorage.getItem('autenticado');
    
    if (token && autenticado === 'true') {
      loadUserInfo();
    } else {
      setLoading(false);
    }
  }, [loadUserInfo]);

  const login = async (identificador: string, senha: string): Promise<User> => {
    try {
      const response = await fetch(`${API_URL}/usuarios/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // recebe o cookie httpOnly refresh_token
        body: JSON.stringify({
          identificador,
          senha
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Credenciais inválidas');
      }
      // O refresh_token não é mais retornado no corpo: o backend o define
      // como cookie httpOnly.
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('autenticado', 'true');
  markTokensIssued();

      setToken(data.access_token);

      const mappedUser = applyNormalizedUser(data.user);
      return mappedUser;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Chama o backend para revogar o access token e limpar o cookie httpOnly
    // do refresh token (JS não consegue apagar um cookie httpOnly sozinho).
    const currentToken = token || localStorage.getItem('access_token');
    if (currentToken) {
      try {
        await fetch(`${API_URL}/usuarios/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
          credentials: 'include',
        });
      } catch (error) {
        console.warn('Falha ao notificar o backend sobre o logout:', error);
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('autenticado');
    clearTokenMetadata();
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
  };

  const syncUser = (rawUser: unknown): User | null => {
    try {
      return applyNormalizedUser(rawUser);
    } catch (error) {
      console.error('Não foi possível sincronizar o usuário com os dados fornecidos:', error);
      return null;
    }
  };

  const reloadUser = async (): Promise<User | null> => {
    try {
      const storedToken = token || localStorage.getItem('access_token');
      if (!storedToken) {
        console.warn('Reload de usuário ignorado: token ausente');
        return null;
      }

      const response = await fetch(`${API_URL}/usuarios/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reload user info');
      }

      const freshData = await response.json();
  const updatedUser = applyNormalizedUser(freshData);
  markTokensIssued();
  return updatedUser;
    } catch (error) {
      console.error('Erro ao recarregar informações do usuário:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      token,
      login, 
      logout, 
      loading,
      getAuthHeaders,
      syncUser,
      reloadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};


// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};