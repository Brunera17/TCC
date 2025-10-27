/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ApiService.ts — versão aprimorada
 * Autor: Bruno Brunera ✨
 * Objetivo: Comunicação segura e eficiente com API Flask
 */

// Em desenvolvimento, usa o proxy do Vite. Em produção, usa a URL completa
export const API_URL = import.meta.env.DEV
  ? "/api"  // Usa proxy do Vite em desenvolvimento
  : (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api");

// 🟢 CONSOLE.LOG ADICIONADO (Passo 1 do debug)
console.log(`[api.ts] API base URL: ${API_URL}`);

//
// 🔹 Tipos e utilitários base
//
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
    super(`Erro HTTP ${status}`);
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
  // Remove barras do início do path e do final da API_URL
  const cleanPath = path.replace(/^\/+/, "");
  const cleanApiUrl = API_URL.replace(/\/+$/, "");
  return `${cleanApiUrl}/${cleanPath}`;
}

//
// 🔹 Token utils
//
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
    // Tentar diferentes endpoints de refresh
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

//
// 🔹 Funções de requisição base
//
async function fetchJSON<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = normalizeUrl(path);
  const headers = buildHeaders(options.headers as Record<string, string>);

  const config: RequestInit = { ...options, headers };
  const method = (options.method || "GET").toUpperCase();

  // 🟢 CONSOLE.LOG ADICIONADO (Passo 2 do debug)
  console.log(`[fetchJSON] Requesting: ${method} ${url}`);

  log(`➡️ ${method} ${url}`);

  try {
    const res = await fetch(url, config);

    // Tentativa de refresh automático se 401
    if (res.status === 401 && retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Recria os headers com o novo token antes de tentar novamente
        const newHeaders = buildHeaders(options.headers as Record<string, string>);
        const newConfig = { ...options, headers: newHeaders };
        return fetchJSON<T>(path, newConfig, false); // Passa false para não tentar refresh novamente
      } else {
        // Se refresh falhou, limpar tokens e redirecionar para login
        console.warn("🚫 Token expirado e refresh falhou. Redirecionando para login...");
        localStorage.removeItem("access_token");
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        sessionStorage.removeItem("access_token");

        // Redirecionar para login se não estiver já lá
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
      parsed = text; // Se não for JSON, mantenha o texto (útil para erros HTML)
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

    // Se for erro de TypeError (rede, CORS), dar mensagem mais clara
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Erro de conectividade - verifique se o backend está rodando e configuração CORS');
    }

    // Se já for um ApiError, apenas relance
    if (error instanceof ApiError) {
      throw error;
    }

    // Para outros erros, encapsule
    throw new Error(`Erro desconhecido na requisição: ${error.message}`);
  }
}

//
// 🔹 Métodos genéricos (GET, POST, PUT, DELETE)
//
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

//
// 🔹 ApiService principal
//
export const apiService = {
  // ---------- Usuário ----------
  async login(credentials: { identificador: string; senha: string }) { // Atualizado para identificador
    return postJSON<{ access_token: string; refresh_token: string, user: any }>( // Retorna user também
      "usuarios/login/",
      credentials
    );
  },

  async getPerfil() {
    return getJSON<any>("usuarios/me/");
  },

  // ---------- Funcionários/Usuários ----------
  async getFuncionarios(params?: any): Promise<any> { // Mantido any por flexibilidade, idealmente Funcionario[]
    return getJSON<any>("usuarios/", params);
  },

  async getFuncionario(id: number) {
    return getJSON<any>(`usuarios/${id}/`);
  },

  async createFuncionario(data: any) {
    return postJSON("usuarios/", data);
  },

  async updateFuncionario(id: number, data: any) {
    return putJSON(`usuarios/${id}/`, data);
  },

  async deleteFuncionario(id: number) {
    return deleteJSON(`usuarios/${id}/`);
  },

  // ---------- Serviços ----------
  async getServicos(params?: any): Promise<any[]> { // Pode retornar PaginatedResponse se backend suportar
    return getJSON<any[]>("servicos/", params);
  },

  async getServico(id: number) {
    return getJSON<any>(`servicos/${id}`);
  },

  async getServicoPorCodigo(codigo: string): Promise<any | null> { // Retorna null se 404
    try {
      return await getJSON<any>(`servicos/codigo/${encodeURIComponent(codigo)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getServicoPorNome(nome: string): Promise<any | null> { // Retorna null se 404
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
    return putJSON(`servicos/${id}`, data); // Adicionado / no final
  },

  async deleteServico(id: number) {
    return deleteJSON(`servicos/${id}`); // Adicionado / no final
  },

  // ---------- Categorias ----------
  async getCategorias(params?: any): Promise<any[]> { // Adicionado params
    return getJSON<any[]>("categorias-servicos/", params);
  },

  async createCategoria(data: any) {
    return postJSON("categorias-servicos/", data);
  },

  // ---------- Clientes ----------
  async getClientes(params?: any): Promise<any> { // Pode retornar PaginatedResponse
    return getJSON<any>("clientes/", params);
  },

  async getCliente(id: number): Promise<any> { // Adicionado
    return getJSON<any>(`clientes/${id}/`);
  },

  async createCliente(data: any) {
    return postJSON("clientes/", data);
  },

  async updateCliente(id: number, data: any) {
    return putJSON(`clientes/${id}/`, data);
  },

  async deleteCliente(id: number) {
    return deleteJSON(`clientes/${id}/`);
  },

  // ---------- Propostas ----------
  async getPropostas(params?: any): Promise<any> { // Pode retornar PaginatedResponse
    return getJSON<any>("propostas/", params);
  },

  async getProposta(id: number): Promise<any> { // Adicionado
    return getJSON<any>(`propostas/${id}/`);
  },

  async createProposta(data: any) {
    return postJSON("propostas/", data);
  },

  async updateProposta(id: number, data: any) {
    return putJSON(`propostas/${id}/`, data);
  },

  async deleteProposta(id: number, observacao?: string): Promise<any> { // Adicionado observacao
    return deleteJSON(`propostas/${id}/`, observacao ? { observacao } : undefined);
  },

  async gerarPDFProposta(id: number): Promise<any> { // Adicionado
    return postJSON(`propostas/${id}/gerar-pdf/`, {});
  },

  async visualizarPDFProposta(id: number): Promise<Blob> { // Adicionado - retorna Blob
    const url = normalizeUrl(`propostas/${id}/pdf/`);
    const headers = buildHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.blob();
  },

  async getLogsPropostas(id: number): Promise<any> { // Adicionado
    return getJSON(`propostas/${id}/logs/`);
  },

  // ---------- Regimes Tributários ----------
  async getRegimesTributarios(params?: any): Promise<any> { // Adicionado
    return getJSON("regimes-tributarios/", params);
  },
  async getRegimeTributario(id: number): Promise<any> { // Adicionado
    return getJSON(`regimes-tributarios/${id}/`);
  },
  async createRegime(data: any): Promise<any> { // Adicionado
    return postJSON("regimes-tributarios/", data);
  },
  async updateRegime(id: number, data: any): Promise<any> { // Adicionado
    return putJSON(`regimes-tributarios/${id}/`, data);
  },
  async deleteRegimeTributario(id: number): Promise<any> { // Adicionado
    return deleteJSON(`regimes-tributarios/${id}/`);
  },

  // ---------- Tipos de Atividade ----------
  async getTiposAtividade(params?: any): Promise<any> { // Adicionado
    return getJSON("tipos-atividade/", params);
  },
  async deleteTipoAtividade(id: number): Promise<any> { // Adicionado
    return deleteJSON(`tipos-atividade/${id}/`);
  },

  // ---------- Faixas de Faturamento ----------
  async getFaixasFaturamento(params?: any): Promise<any> { // Adicionado
    return getJSON("faixas-faturamento/", params);
  },

  // ---------- Cargos ----------
  async getCargos(params?: any): Promise<any> { // Adicionado
    return getJSON("cargos/", params);
  },
  async createCargo(data: any): Promise<any> { // Adicionado
    return postJSON("cargos/", data);
  },
  async updateCargo(id: number, data: any): Promise<any> { // Adicionado
    return putJSON(`cargos/${id}/`, data);
  },
  async deleteCargo(id: number): Promise<any> { // Adicionado
    return deleteJSON(`cargos/${id}/`);
  },

  // ---------- Empresas ----------
  async getEmpresas(params?: any): Promise<any> { // Adicionado
    return getJSON("empresas/", params);
  },

  // ---------- Mensalidade Automática ----------
  async buscarMensalidadeAutomatica(config: { // Adicionado
    tipo_atividade_id: number;
    regime_tributario_id: number;
    faixa_faturamento_id?: number;
  }): Promise<any> {
    return postJSON("mensalidades/buscar/", config);
  },

  // ---------- Notificações ----------
  async getNotificacoes(): Promise<any> { // Adicionado
    return getJSON("notificacoes/");
  },
  async marcarNotificacaoComoLida(id: number): Promise<any> { // Adicionado
    return postJSON(`notificacoes/${id}/ler/`, {});
  },
  async marcarTodasNotificacoesComoLidas(): Promise<any> { // Adicionado
    return postJSON("notificacoes/ler-todas/", {});
  },

  // ---------- Ordens de Serviço ----------
  async getOrdensServico(params?: any): Promise<any> { // Adicionado
    return getJSON("ordens-servico/", params);
  },
  async createOrdemServico(data: any): Promise<any> { // Adicionado
    return postJSON("ordens-servico/", data);
  },
  async updateOrdemServico(id: number, data: any): Promise<any> { // Adicionado
    return putJSON(`ordens-servico/${id}/`, data);
  },
  async deleteOrdemServico(id: number): Promise<any> { // Adicionado
    return deleteJSON(`ordens-servico/${id}/`);
  },

  // ---------- Departamentos ----------
  async getDepartamentos(params?: any): Promise<any> { // Adicionado
    return getJSON("departamentos/", params);
  },

  // ---------- Chat ----------
  async getChatMessages(sessionId: string): Promise<any> { // Adicionado
    return getJSON(`chat/${sessionId}/messages/`);
  },
  async sendChatMessage(message: string, sessionId: string): Promise<any> { // Adicionado
    return postJSON(`chat/${sessionId}/send/`, { message });
  },
  async clearChatSession(sessionId: string): Promise<any> { // Adicionado
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