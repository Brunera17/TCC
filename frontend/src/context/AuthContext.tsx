import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../lib/api';

interface EmpresaInfo {
  id?: number;
  nome?: string;
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
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (identificador: string, senha: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
  getAuthHeaders: () => { Authorization?: string }; 
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

  const getAuthHeaders = (): { Authorization?: string } => {
    const currentToken = token || localStorage.getItem('access_token');
    if (currentToken) {
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
      const mappedUser = normalizeApiUser(userInfo);
      
      localStorage.setItem('user', JSON.stringify(mappedUser));
      setUser(mappedUser);
      setIsAuthenticated(true);
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
    } finally {
      setLoading(false);
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

  const login = async (identificador: string, senha: string): Promise<User> => {
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
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('autenticado', 'true');

      setToken(data.access_token);

      const mappedUser = normalizeApiUser(data.user);

      localStorage.setItem('user', JSON.stringify(mappedUser));
      setUser(mappedUser);
      setIsAuthenticated(true);
      return mappedUser;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('autenticado');
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      token,
      login, 
      logout, 
      loading,
      getAuthHeaders
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