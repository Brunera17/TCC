/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Agendamento, AgendamentoPayload, Categoria, Funcionario, RegimeTributario, Servico } from '../types';

export const REFRESH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const ACCESS_TOKEN_EXPIRATION_KEY = "access_token_expires_at";
const REFRESH_TOKEN_EXPIRATION_KEY = "refresh_token_expires_at";

export function markTokensIssued(ttlMs: number = REFRESH_TOKEN_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  localStorage.setItem(ACCESS_TOKEN_EXPIRATION_KEY, expiresAt.toString());
  localStorage.setItem(REFRESH_TOKEN_EXPIRATION_KEY, expiresAt.toString());
}

export function clearTokenMetadata() {
  localStorage.removeItem(ACCESS_TOKEN_EXPIRATION_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRATION_KEY);
}

function isRefreshWindowValid() {
  const raw = localStorage.getItem(REFRESH_TOKEN_EXPIRATION_KEY);
  if (!raw) {
    return true;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    clearTokenMetadata();
    return true;
  }

  return Date.now() <= parsed;
}

export const API_URL = import.meta.env.DEV
  ? "/api"  // Usa proxy do Vite em desenvolvimento
  : (import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api");

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  current_page: number;
  per_page: number;
}

type AgendamentosListResponse =
  | Agendamento[]
  | PaginatedResponse<Agendamento>
  | {
      data?: Agendamento[];
      results?: Agendamento[];
      items?: Agendamento[];
      total?: number;
      per_page?: number;
    };

type AgendamentosQuery = Record<string, string | number | boolean | undefined>;

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

function buildHeaders(extra: HeadersInit = {}, includeJsonContentType = true): Headers {
  const headers = new Headers(extra);
  const token = getValidToken();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  const hasContentType = headers.has("Content-Type");

  if (includeJsonContentType) {
    if (!hasContentType) headers.set("Content-Type", "application/json");
  } else if (hasContentType) {
    headers.delete("Content-Type");
  }

  return headers;
}

function normalizeUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  const cleanApiUrl = API_URL.replace(/\/+$/, "");
  return `${cleanApiUrl}/${cleanPath}`;
}

type GenericRecord = Record<string, unknown>;

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function generatePropostaNumero(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const millis = String(now.getMilliseconds()).padStart(3, "0");
  return `PROP-${year}${month}${day}-${time}${millis}`;
}

type BackendPropostaStatus = 'rascunho' | 'enviada' | 'aceita' | 'rejeitada' | 'expirada';

const STATUS_TO_BACKEND: Record<string, BackendPropostaStatus> = {
  rascunho: 'rascunho',
  draft: 'rascunho',
  pendente: 'enviada',
  aguardando_aprovacao: 'enviada',
  enviada: 'enviada',
  aprovada: 'aceita',
  aceita: 'aceita',
  aceita_proposta: 'aceita',
  rejeitada: 'rejeitada',
  recusada: 'rejeitada',
  cancelada: 'expirada',
  expirada: 'expirada'
};

function normalizePropostaStatusForBackend(status: unknown): BackendPropostaStatus {
  if (typeof status === 'string') {
    const key = status.trim().toLowerCase();
    if (key && STATUS_TO_BACKEND[key]) {
      return STATUS_TO_BACKEND[key];
    }
  }
  return 'rascunho';
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function normalizePropostaEntity(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  const record = raw as Record<string, unknown>;

  const numero =
    coerceString(record.numero) ??
    coerceString(record.numero_proposta) ??
    coerceString(record.numeroProposta) ??
    coerceString((record as GenericRecord)['numeroProposta']) ??
    coerceString((record as GenericRecord)['numero_proposta']);

  const responsavel =
    (typeof record.funcionario_responsavel === 'object' && record.funcionario_responsavel !== null)
      ? record.funcionario_responsavel
      : (typeof (record as GenericRecord)['responsavel'] === 'object' && (record as GenericRecord)['responsavel'] !== null)
        ? (record as GenericRecord)['responsavel']
        : (typeof (record as GenericRecord)['funcionario'] === 'object' && (record as GenericRecord)['funcionario'] !== null)
          ? (record as GenericRecord)['funcionario']
          : undefined;

  const responsavelId =
    toNumber(record.funcionario_responsavel_id) ??
    toNumber((record as GenericRecord)['responsavel_id']) ??
    (responsavel && typeof responsavel === 'object'
      ? toNumber((responsavel as Record<string, unknown>).id)
      : undefined);

  return {
    ...record,
    ...(numero ? { numero, numero_proposta: numero } : {}),
    ...(responsavel ? { funcionario_responsavel: responsavel } : {}),
    ...(responsavelId !== undefined ? { funcionario_responsavel_id: responsavelId } : {})
  };
}

function normalizePropostasResponse(raw: unknown, params?: Record<string, unknown>) {
  const requestedPage = toNumber(params?.page) ?? 1;
  const requestedPerPage = toNumber(params?.per_page);

  const normalizeCollection = (items: unknown[]): unknown[] => items.map(item => normalizePropostaEntity(item));

  if (Array.isArray(raw)) {
    const data = normalizeCollection(raw);
    const count = data.length;
    return {
      data,
      total: count,
      per_page: requestedPerPage ?? (count || 1),
      current_page: requestedPage
    };
  }

  if (raw && typeof raw === 'object') {
    const candidates = ['data', 'results', 'items', 'propostas'];
    for (const key of candidates) {
      const collection = (raw as Record<string, unknown>)[key];
      if (Array.isArray(collection)) {
        const normalizedCollection = normalizeCollection(collection);
        const total = toNumber((raw as Record<string, unknown>).total) ?? toNumber((raw as Record<string, unknown>).count) ?? normalizedCollection.length;
        const perPage = toNumber((raw as Record<string, unknown>).per_page) ?? toNumber((raw as Record<string, unknown>).page_size) ?? requestedPerPage ?? (normalizedCollection.length || 1);
        const current = toNumber((raw as Record<string, unknown>).current_page) ?? toNumber((raw as Record<string, unknown>).page) ?? requestedPage;
        return {
          ...(raw as Record<string, unknown>),
          data: normalizedCollection,
          total,
          per_page: perPage,
          current_page: current
        };
      }
    }
  }

  return {
    data: [],
    total: 0,
    per_page: requestedPerPage ?? 1,
    current_page: requestedPage
  };
}

function normalizeFaixaFaturamento(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const valorInicial =
    raw.valor_inicial ?? raw.valorInicial ?? raw.valor_minimo ?? raw.valorMinimo ?? raw.min ?? raw.minimo;
  const valorFinal =
    raw.valor_final ?? raw.valorFinal ?? raw.valor_maximo ?? raw.valorMaximo ?? raw.max ?? raw.maximo ?? null;
  const aliquota =
    raw.aliquota ?? raw.percentual_imposto ?? raw.percentualImposto ?? raw.aliquota_percentual ?? raw.percentual;

  return {
    ...raw,
    nome: raw.nome ?? raw.descricao ?? raw.label ?? "",
    valor_inicial: toNumber(valorInicial) ?? 0,
    valor_final: valorFinal === undefined || valorFinal === null ? null : toNumber(valorFinal) ?? null,
    aliquota: toNumber(aliquota) ?? toNumber(raw.aliquota) ?? null,
    regime_tributario_id: raw.regime_tributario_id ?? raw.regimeTributarioId ?? raw.regime_id ?? null,
  };
}

function normalizeFaixaCollection(response: any): any {
  if (Array.isArray(response)) {
    return response.map(normalizeFaixaFaturamento);
  }

  if (response && typeof response === "object") {
    if (Array.isArray(response.data)) {
      return { ...response, data: response.data.map(normalizeFaixaFaturamento) };
    }

    if (Array.isArray(response.results)) {
      return { ...response, results: response.results.map(normalizeFaixaFaturamento) };
    }

    if (Array.isArray(response.items)) {
      return { ...response, items: response.items.map(normalizeFaixaFaturamento) };
    }
  }

  return response;
}

function normalizeMensalidadeResponse(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const cloned = { ...raw } as GenericRecord;
  const mensalidade =
    raw.valor_mensalidade ?? raw.mensalidade ?? raw.mensalidade_sugerida ?? raw.valorMensalidade;
  if (mensalidade !== undefined) {
    const valorNumerico = toNumber(mensalidade);
    cloned.valor_mensalidade = valorNumerico ?? mensalidade;
    cloned.mensalidade = valorNumerico ?? mensalidade;
    cloned.mensalidade_sugerida = toNumber(raw.mensalidade_sugerida) ?? valorNumerico ?? mensalidade;
  }

  if (cloned.faixa) {
    cloned.faixa = normalizeFaixaFaturamento(cloned.faixa);
  }

  if (cloned.data && typeof cloned.data === "object") {
    cloned.data = normalizeMensalidadeResponse(cloned.data);
  }

  return cloned;
}

function normalizeServico(raw: any): Servico {
  if (!raw || typeof raw !== 'object') {
    return raw as Servico;
  }

  const valor = toNumber(raw.valor_base ?? raw.valor_unitario ?? raw.preco_base ?? raw.valor ?? raw.price) ?? 0;
  const categoriaData = raw.categoria ?? raw.categoria_detalhes ?? raw.categoria_obj ?? raw.category;
  const categoriaNome = typeof categoriaData === 'string'
    ? categoriaData
    : (categoriaData?.nome ?? categoriaData?.name ?? raw.categoria_nome ?? raw.category_name ?? raw.categoria);
  const tipoCobranca = raw.tipo_cobranca ?? raw.regras_cobranca ?? raw.tipo ?? raw.billing_type ?? raw.regrasCobranca;

  return {
    ...raw,
    valor_base: valor,
    valor_unitario: valor,
    preco_base: valor,
    tipo_cobranca: tipoCobranca ?? raw.tipo_cobranca,
    categoria: categoriaNome ?? raw.categoria ?? '',
  } as Servico;
}

function normalizeServicoCollection(response: any): any {
  if (Array.isArray(response)) {
    return response.map(normalizeServico);
  }

  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) {
      return { ...response, data: response.data.map(normalizeServico) };
    }

    if (Array.isArray(response.results)) {
      return { ...response, results: response.results.map(normalizeServico) };
    }

    if (Array.isArray(response.items)) {
      return { ...response, items: response.items.map(normalizeServico) };
    }
  }

  return response;
}

function extractCollection<T>(response: any): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) return response.data as T[];
    if (Array.isArray(response.results)) return response.results as T[];
    if (Array.isArray(response.items)) return response.items as T[];
    if (Array.isArray(response.servicos)) return response.servicos as T[];
  }
  return [];
}

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
  if (!isRefreshWindowValid()) {
    console.warn("🚫 Janela de refresh excedida (24h). Usuário precisará realizar novo login.");
    return false;
  }

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
          if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token);
          }
          markTokensIssued();
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
  const isFormDataBody = options.body instanceof FormData;
  const headers = buildHeaders(options.headers ?? {}, !isFormDataBody);

  const config: RequestInit = { ...options, headers };
  const method = (options.method || "GET").toUpperCase();

  try {
    const res = await fetch(url, config);

    if (res.status === 401 && retry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newHeaders = buildHeaders(options.headers ?? {}, !isFormDataBody);
        const newConfig = { ...options, headers: newHeaders };
        return fetchJSON<T>(path, newConfig, false); // Passa false para não tentar refresh novamente
      } else {
        console.warn("🚫 Token expirado e refresh falhou. Redirecionando para login...");
        localStorage.removeItem("access_token");
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        clearTokenMetadata();
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

export { fetchJSON };

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
    return getJSON<any>("usuarios/me");
  },

  async updatePerfil(data: any) {
    if (data instanceof FormData) {
      return fetchJSON<any>("usuarios/me", {
        method: "PUT",
        body: data,
      });
    }

    return putJSON<any>("usuarios/me", data);
  },

  // ---------- Funcionários/Usuários ----------
  async getFuncionarios(params?: any): Promise<any> { 
    return getJSON<any>("funcionarios/", params);
  },

  async getFuncionario(id: number) {
    return getJSON<any>(`funcionarios/${id}/`);
  },

  async createFuncionario(data: any): Promise<Funcionario> {
    try {
      return await postJSON<Funcionario>("funcionarios/", data);
    } catch (error) {
      if (shouldFallbackToUsuarios(error)) {
        return postJSON<Funcionario>("usuarios/", data);
      }
      throw error;
    }
  },

  async updateFuncionario(id: number, data: any): Promise<Funcionario> {
    try {
      return await putJSON<Funcionario>(`funcionarios/${id}/`, data);
    } catch (error) {
      if (shouldFallbackToUsuarios(error)) {
        try {
          return await putJSON<Funcionario>(`usuarios/${id}/`, data);
        } catch (usuariosError) {
          if (shouldFallbackToUsuarios(usuariosError)) {
            return putJSON<Funcionario>(`usuarios/${id}`, data);
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
    const response = await getJSON<any>("servicos/", params);
    return normalizeServicoCollection(response);
  },

  async getServicosPorRegime(regimeTributarioId: number, params?: Record<string, any>): Promise<Servico[]> {
    const primaryParams = { ...(params ?? {}), regime_tributario_id: regimeTributarioId };
    const attempts: Array<{ path: string; params?: Record<string, any> }> = [
      { path: 'servicos/', params: primaryParams },
      { path: `servicos/regime/${regimeTributarioId}`, params },
      { path: `regimes-tributarios/${regimeTributarioId}/servicos`, params }
    ];

    for (let index = 0; index < attempts.length; index += 1) {
      const { path, params: attemptParams } = attempts[index];
      try {
        const response = await getJSON<any>(path, attemptParams);
        const normalized = normalizeServicoCollection(response);
        const items = extractCollection<Servico>(normalized);
        if (items.length > 0 || index === attempts.length - 1) {
          return items;
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
          continue;
        }
        throw error;
      }
    }

    return [];
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
  async getCategorias(params?: any): Promise<Categoria[]> {
    return getJSON<Categoria[]>("categorias-servicos/", params);
  },

  async createCategoria(data: any): Promise<Categoria> {
    return postJSON<Categoria>("categorias-servicos/", data);
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
    const response = await getJSON<any>("propostas/", params);
    return normalizePropostasResponse(response, params);
  },

  async getProposta(id: number): Promise<any> {
    const response = await getJSON<any>(`propostas/${id}/`);
    return normalizePropostaEntity(response);
  },

  async createProposta(data: any) {
    const payload = { ...data };
    delete payload.percentual_desconto;
    delete payload.valor_desconto;

    const numeroExistente =
      typeof payload.numero_proposta === 'string' && payload.numero_proposta.trim()
        ? payload.numero_proposta.trim()
        : typeof payload.numero === 'string' && payload.numero.trim()
          ? payload.numero.trim()
          : typeof payload.propostaNumero === 'string' && payload.propostaNumero.trim()
            ? payload.propostaNumero.trim()
            : typeof payload.numeroProposta === 'string' && payload.numeroProposta.trim()
              ? payload.numeroProposta.trim()
              : null;

    payload.numero_proposta = numeroExistente ?? generatePropostaNumero();
    delete payload.numero;
    delete payload.propostaNumero;
    delete payload.numeroProposta;

    if (payload.status !== undefined) {
      payload.status = normalizePropostaStatusForBackend(payload.status);
    }

    if (payload.funcionario_responsavel_id !== undefined) {
      const responsavelId = toNumber(payload.funcionario_responsavel_id);
      payload.funcionario_responsavel_id = responsavelId ?? payload.funcionario_responsavel_id;
    }

    if (Array.isArray(payload.itens)) {
      payload.itens = payload.itens.map((item: any) => ({
        servico_id: item.servico_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        descricao_personalizada: item.descricao_personalizada ?? null
      }));
    }

    const response = await postJSON("propostas/", payload);
    return normalizePropostaEntity(response);
  },

  async updateProposta(id: number, data: any) {
    const payload = { ...data };

    if (payload.status !== undefined) {
      payload.status = normalizePropostaStatusForBackend(payload.status);
    }

    if (payload.funcionario_responsavel_id !== undefined) {
      const responsavelId = toNumber(payload.funcionario_responsavel_id);
      payload.funcionario_responsavel_id = responsavelId ?? payload.funcionario_responsavel_id;
    }

    const response = await putJSON(`propostas/${id}/`, payload);
    return normalizePropostaEntity(response);
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
  async getRegimeTributario(id: number): Promise<RegimeTributario> {
    return getJSON<RegimeTributario>(`regimes-tributarios/${id}/`);
  },
  async createRegime(data: any): Promise<RegimeTributario> {
    return postJSON<RegimeTributario>("regimes-tributarios/", data);
  },
  async updateRegime(id: number, data: any): Promise<RegimeTributario> {
    return putJSON<RegimeTributario>(`regimes-tributarios/${id}/`, data);
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
    const response = await getJSON("faixas-faturamento/", params);
    return normalizeFaixaCollection(response);
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
    const response = await postJSON("mensalidades/buscar/", config);
    return normalizeMensalidadeResponse(response);
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

  async getNotificacoesVencimento(params?: any): Promise<any> {
    return getJSON("notificacoes/vencimento/", params);
  },

  async marcarNotificacaoVencimentoComoLida(id: number): Promise<any> {
    return postJSON(`notificacoes/vencimento/${id}/marcar-lida/`, {});
  },

  async marcarTodasNotificacoesVencimentoComoLidas(): Promise<any> {
    return postJSON("notificacoes/vencimento/marcar-todas-lidas/", {});
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

  // ---------- Agendamentos ----------
  async getAgendamentos(params?: AgendamentosQuery): Promise<AgendamentosListResponse> {
    return getJSON<AgendamentosListResponse>("agendamentos/", params);
  },

  async getAgendamento(id: number): Promise<Agendamento> {
    return getJSON<Agendamento>(`agendamentos/${id}`);
  },

  async createAgendamento(data: AgendamentoPayload): Promise<Agendamento> {
    return postJSON<Agendamento>("agendamentos/", data);
  },

  async updateAgendamento(id: number, data: Partial<AgendamentoPayload>): Promise<Agendamento> {
    return putJSON<Agendamento>(`agendamentos/${id}`, data);
  },

  async deleteAgendamento(id: number): Promise<void> {
    return deleteJSON<void>(`agendamentos/${id}`);
  },

  // ---------- Util ----------
  getValidToken,
  normalizeUrl,
};