export const API_URL = import.meta.env.DEV
  ? "/api"  // Usa proxy do Vite em desenvolvimento
  : (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api");

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

export class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(status: number, details?: any) {
    const detailMessage =
      typeof details === 'string'
        ? details
        : (details?.error ?? details?.message ?? null);
    const baseMessage = `Erro HTTP ${status}`;
    super(detailMessage ? `${baseMessage}: ${detailMessage}` : baseMessage);
    this.status = status;
    this.details = details;
  }
}

function log(...args: any[]) {
  if (import.meta.env.DEV) console.log("🧩 ApiService:", ...args);
}

function buildHeaders(extra: Record<string, string> = {}): Headers {
  const headers = new Headers(extra);
  const token = getValidToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  return headers;
}

function normalizeUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  const cleanApiUrl = API_URL.replace(/\/+$/, "");
  return `${cleanApiUrl}/${cleanPath}`;
}

type GenericRecord = Record<string, unknown>;

function getValidToken(): string | null {
  const sources = [
    localStorage.getItem("access_token"),
    localStorage.getItem("jwt_token"),
    localStorage.getItem("token"),
    sessionStorage.getItem("access_token"),
  ];

  for (const t of sources) if (t && t !== "undefined" && t !== "null") return t;
  return null;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) {
    console.warn("🚫 Nenhum refresh token encontrado");
    return false;
  }

  try {
    const endpoints = ["usuarios/refresh/", "auth/refresh/", "refresh/"];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(normalizeUrl(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("access_token", data.access_token);
          log("🔁 Token atualizado com sucesso");
          return true;
        } else {
          console.warn(`🚫 Refresh falhou em ${endpoint}: ${res.status}`);
        }
      } catch (e) {
        console.warn(`🚫 Erro ao tentar ${endpoint}:`, e);
        continue;
      }
    }

    console.error("🚫 Todos os endpoints de refresh falharam");
    return false;
  } catch (err) {
    console.error("Erro ao tentar refresh do token:", err);
    return false;
  }
}

async function fetchJSON<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = normalizeUrl(path);
  const headers = buildHeaders(options.headers as Record<string, string>);

  const config: RequestInit = { ...options, headers };
  const method = (options.method || "GET").toUpperCase();

  try {
    const res = await fetch(url, config);

    if (res.status === 401 && retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newHeaders = buildHeaders(options.headers as Record<string, string>);
        const newConfig = { ...options, headers: newHeaders };
        return fetchJSON<T>(path, newConfig, false); // Passa false para não tentar refresh novamente
      } else {
        console.warn("🚫 Token expirado e refresh falhou. Redirecionando para login...");
        localStorage.removeItem("access_token");
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("access_token");

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        throw new ApiError(401, "Token expirado - redirecionando para login");
      }
    }

    let parsed: any = null;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text; 
    }

    if (!res.ok) {
      console.error("❌ Erro na requisição:", res.status, parsed);
      console.error("❌ URL:", url);
      console.error("❌ Headers enviados:", Object.fromEntries(headers.entries()));
      throw new ApiError(res.status, parsed);
    }

    log("✅ Resposta recebida:", parsed);
    return parsed as T;
  } catch (error: any) {
    console.error("❌ Erro de rede ou CORS:", error);
    console.error("❌ URL:", url);
    console.error("❌ Método:", method);

    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Erro de conectividade - verifique se o backend está rodando e configuração CORS');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new Error(`Erro desconhecido na requisição: ${error.message}`);
  }
}

async function getJSON<T>(path: string, params?: Record<string, any>): Promise<T> {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJSON<T>(path + query, { method: "GET" });
}

async function postJSON<T>(path: string, body: any): Promise<T> {
  return fetchJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function putJSON<T>(path: string, body: any): Promise<T> {
  return fetchJSON<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function deleteJSON<T>(path: string, body?: any): Promise<T> {
  const options: RequestInit = { method: "DELETE" };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetchJSON<T>(path, options);
}

function shouldFallbackToUsuarios(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 404 || error.status === 405);
}

function normalizeEnderecoPayload(endereco: unknown): GenericRecord | undefined {
  if (!endereco || typeof endereco !== 'object') return undefined;

  const normalized: GenericRecord = { ...(endereco as GenericRecord) };

  const logradouro = normalized['logradouro'];
  const rua = normalized['rua'];

  if ((typeof logradouro !== 'string' || logradouro.trim().length === 0) && typeof rua === 'string') {
    normalized['logradouro'] = rua.trim();
  }

  if (typeof normalized['logradouro'] === 'string') {
    normalized['logradouro'] = (normalized['logradouro'] as string).trim();
  }

  delete normalized['rua'];

  return normalized;
}

function normalizeClientePayload(data: unknown): GenericRecord {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const payload: GenericRecord = { ...(data as GenericRecord) };

  if (payload.endereco) {
    const enderecoNormalizado = normalizeEnderecoPayload(payload.endereco);
    if (enderecoNormalizado) {
      payload.endereco = enderecoNormalizado;
    }
  }

  if (Array.isArray(payload.enderecos)) {
    payload.enderecos = payload.enderecos
      .map(endereco => normalizeEnderecoPayload(endereco))
      .filter((item): item is GenericRecord => Boolean(item));
  }

  return payload;
}

export const apiService = {
  // ---------- Usuário ----------
  async login(credentials: { identificador: string; senha: string }) { 
    return postJSON<{ access_token: string; refresh_token: string, user: any }>( 
      "usuarios/login/",
      credentials
    );
  },

  async getPerfil() {
    return getJSON<any>("usuarios/me/");
  },

  // ---------- Funcionários/Usuários ----------
  async getFuncionarios(params?: any): Promise<any> { 
    return getJSON<any>("funcionarios/", params);
  },

  async getFuncionario(id: number) {
    return getJSON<any>(`funcionarios/${id}/`);
  },

  async createFuncionario(data: any) {
    try {
      return await postJSON("funcionarios/", data);
    } catch (error) {
      if (shouldFallbackToUsuarios(error)) {
        return postJSON("usuarios/", data);
      }
      throw error;
    }
  },

  async updateFuncionario(id: number, data: any) {
    try {
      return await putJSON(`funcionarios/${id}/`, data);
    } catch (error) {
      if (shouldFallbackToUsuarios(error)) {
        try {
          return await putJSON(`usuarios/${id}/`, data);
        } catch (usuariosError) {
          if (shouldFallbackToUsuarios(usuariosError)) {
            return putJSON(`usuarios/${id}`, data);
          }
          throw usuariosError;
        }
      }
      throw error;
    }
  },

  async deleteFuncionario(id: number) {
    try {
      return await deleteJSON(`funcionarios/${id}/`);
    } catch (error) {
      if (shouldFallbackToUsuarios(error)) {
        try {
          return await deleteJSON(`usuarios/${id}/`);
        } catch (usuariosError) {
          if (shouldFallbackToUsuarios(usuariosError)) {
            return deleteJSON(`usuarios/${id}`);
          }
          throw usuariosError;
        }
      }
      throw error;
    }
  },

  // ---------- Serviços ----------
  async getServicos(params?: any): Promise<any> { // Alterado para 'any' para aceitar PaginatedResponse ou Array
    return getJSON<any>("servicos/", params);
  },

  async getServico(id: number) {
    return getJSON<any>(`servicos/${id}`);
  },

  async getServicoPorCodigo(codigo: string): Promise<any | null> { 
    try {
      return await getJSON<any>(`servicos/codigo/${encodeURIComponent(codigo)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getServicoPorNome(nome: string): Promise<any | null> { 
    try {
      return await getJSON<any>(`servicos/nome/${encodeURIComponent(nome)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async createServico(data: any) {
    return postJSON("servicos/", data);
  },

  async updateServico(id: number, data: any) {
    return putJSON(`servicos/${id}`, data);
  },

  async deleteServico(id: number) {
    return deleteJSON(`servicos/${id}`);
  },

  // ---------- Categorias ----------
  async getCategorias(params?: any): Promise<any[]> {
    return getJSON<any[]>("categorias-servicos/", params);
  },

  async createCategoria(data: any) {
    return postJSON("categorias-servicos/", data);
  },

  // ---------- Clientes ----------
  async getClientes(params?: any): Promise<any> {
    return getJSON<any>("clientes/", params);
  },

  async getCliente(id: number): Promise<any> {
    return getJSON<any>(`clientes/${id}`);
  },

  async createCliente(data: any) {
    const payload = normalizeClientePayload(data);
    if ('empresa_id' in payload) {
      delete payload.empresa_id;
    }
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        const empresaId = parsed?.empresa_id ?? parsed?.empresa?.id;
        if (typeof empresaId !== 'number') {
          console.warn('Usuário autenticado sem empresa vinculada ao tentar criar cliente.');
        }
      }
    } catch (err) {
      console.warn('Não foi possível validar a empresa do usuário antes de criar cliente:', err);
    }
    return postJSON("clientes/", payload);
  },

  async updateCliente(id: number, data: any) {
    const payload = normalizeClientePayload(data);
    return putJSON(`clientes/${id}`, payload);
  },

  async deleteCliente(id: number) {
    return deleteJSON(`clientes/${id}`);
  },

  // ---------- Propostas ----------
  async getPropostas(params?: any): Promise<any> { 
    return getJSON<any>("propostas/", params);
  },

  async getProposta(id: number): Promise<any> {
    return getJSON<any>(`propostas/${id}/`);
  },

  async createProposta(data: any) {
    return postJSON("propostas/", data);
  },

  async updateProposta(id: number, data: any) {
    return putJSON(`propostas/${id}/`, data);
  },

  async deleteProposta(id: number, observacao?: string): Promise<any> { 
    return deleteJSON(`propostas/${id}/`, observacao ? { observacao } : undefined);
  },

  async gerarPDFProposta(id: number): Promise<any> {
    return postJSON(`propostas/${id}/gerar-pdf/`, {});
  },

  async visualizarPDFProposta(id: number): Promise<Blob> {
    const url = normalizeUrl(`propostas/${id}/pdf/`);
    const headers = buildHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.blob();
  },

  async getLogsPropostas(id: number): Promise<any> {
    return getJSON(`propostas/${id}/logs/`);
  },

  // ---------- Regimes Tributários ----------
  async getRegimesTributarios(params?: any): Promise<any> {
    return getJSON("regimes-tributarios/", params);
  },
  async getRegimeTributario(id: number): Promise<any> {
    return getJSON(`regimes-tributarios/${id}/`);
  },
  async createRegime(data: any): Promise<any> {
    return postJSON("regimes-tributarios/", data);
  },
  async updateRegime(id: number, data: any): Promise<any> {
    return putJSON(`regimes-tributarios/${id}/`, data);
  },
  async deleteRegimeTributario(id: number): Promise<any> {
    return deleteJSON(`regimes-tributarios/${id}`);
  },

  // ---------- Tipos de Atividade ----------
  async getTiposAtividade(params?: any): Promise<any> {
    return getJSON("tipos-atividade/", params);
  },
  async createTipoAtividade(data: any): Promise<any> {
    return postJSON("tipos-atividade/", data);
  },
  async updateTipoAtividade(id: number, data: any): Promise<any> {
    return putJSON(`tipos-atividade/${id}`, data);
  },
  async deleteTipoAtividade(id: number): Promise<any> {
    return deleteJSON(`tipos-atividade/${id}`);
  },

  // ---------- Faixas de Faturamento ----------
  async getFaixasFaturamento(params?: any): Promise<any> {
    return getJSON("faixas-faturamento/", params);
  },

  // ---------- Cargos ----------
  async getCargos(params?: any): Promise<any> {
    return getJSON("cargos/", params);
  },
  async createCargo(data: any): Promise<any> {
    return postJSON("cargos/", data);
  },
  async updateCargo(id: number, data: any): Promise<any> {
    return putJSON(`cargos/${id}`, data);
  },
  async deleteCargo(id: number): Promise<any> {
    return deleteJSON(`cargos/${id}`);
  },

  // ---------- Empresas ----------
  async getEmpresas(params?: any): Promise<any> {
    return getJSON("empresas/", params);
  },

  // ---------- Mensalidade Automática ----------
  async buscarMensalidadeAutomatica(config: {
    tipo_atividade_id: number;
    regime_tributario_id: number;
    faixa_faturamento_id?: number;
  }): Promise<any> {
    return postJSON("mensalidades/buscar/", config);
  },

  // ---------- Notificações ----------
  async getNotificacoes(): Promise<any> {
    return getJSON("notificacoes/");
  },
  async marcarNotificacaoComoLida(id: number): Promise<any> {
    return postJSON(`notificacoes/${id}/ler/`, {});
  },
  async marcarTodasNotificacoesComoLidas(): Promise<any> {
    return postJSON("notificacoes/ler-todas/", {});
  },

  // ---------- Ordens de Serviço ----------
  async getOrdensServico(params?: any): Promise<any> {
    return getJSON("ordens-servico/", params);
  },
  async createOrdemServico(data: any): Promise<any> {
    return postJSON("ordens-servico/", data);
  },

  // --- CORREÇÃO AQUI (Removendo a barra final) ---
  async updateOrdemServico(id: number, data: any): Promise<any> {
    return putJSON(`ordens-servico/${id}`, data);
  },
  async deleteOrdemServico(id: number): Promise<any> {
    return deleteJSON(`ordens-servico/${id}`);
  },
  // --- FIM DA CORREÇÃO ---

  // ---------- Departamentos ----------
  async getDepartamentos(params?: any): Promise<any> {
    return getJSON("departamentos/", params);
  },
  async createDepartamento(data: any): Promise<any> {
    return postJSON("departamentos/", data);
  },
  async updateDepartamento(id: number, data: any): Promise<any> {
    return putJSON(`departamentos/${id}/`, data);
  },
  async deleteDepartamento(id: number): Promise<any> {
    return deleteJSON(`departamentos/${id}/`);
  },

  // ---------- Chat ----------
  async getChatMessages(sessionId: string): Promise<any> {
    return getJSON(`chat/${sessionId}/messages/`);
  },
  async sendChatMessage(message: string, sessionId: string): Promise<any> {
    return postJSON(`chat/${sessionId}/send/`, { message });
  },
  async clearChatSession(sessionId: string): Promise<any> {
    return postJSON(`chat/${sessionId}/clear/`, {});
  },

  // ---------- Relatórios (mantido genérico) ----------
  async getRelatorios(): Promise<any[]> {
    return getJSON<any[]>("relatorios/");
  },

  // ---------- Util ----------
  getValidToken,
  normalizeUrl,
};