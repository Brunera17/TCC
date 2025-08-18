// src/lib/api.ts
export const API_URL = "http://localhost:5000/api";

function resolveUrl(input: RequestInfo | URL): string | URL {
    if (typeof input !== "string") return input;
    if (/^https?:\/\//i.test(input)) return input;
    if (input.startsWith("/")) return `${API_URL}${input}`;
    return `${API_URL}/${input}`;
}

export async function fetchJSON(input: RequestInfo | URL, init: RequestInit = {}){
    const url = resolveUrl(input);

    const headers = new Headers(init.headers || {});
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (init.body && !headers.has("Content-Type")){
        headers.set("Content-Type", "application/json");
    }

    if (init.body && !headers.has("Authorization")){
        headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(url, { ...init, headers });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const raw = await res.text().catch(() => "");

    const parsed = isJson && raw ? safeParseJSON(raw) : null;

    if (!res.ok){
        const serverMsg = (parsed && (parsed.error || parsed.message || parsed.detail)) || raw || res.statusText;

        if (res.status === 401){
            throw new Error(`HTTP 401 - Não autorizado: ${serverMsg}`);
        }
        throw new Error(`HTTP ${res.status} - ${serverMsg}`);
    }

    if (!isJson){
        const preview = raw.slice(0,200);
        throw new Error(
            `Resposta não-JSON da API (Content-Type: ${contentType || "desconhecido"}). Conteúdo: ${preview}...`
        );
    }

    return parsed ?? {};
}

function safeParseJSON(text: string) {
    try{
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export function getJSON(path: string, init: RequestInit = {}) {
    return fetchJSON(path, { ...init, method: "GET" });
}
export function postJSON(path: string, body: unknown, init: RequestInit = {}) {
    return fetchJSON(path, {
        ...init,
        method: "PUT",
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}
export function delJSON(path: string, init: RequestInit = {}) {
    return fetchJSON(path, { ...init, method: "DELETE" });
}