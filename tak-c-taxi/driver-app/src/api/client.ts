const API_URL = import.meta.env.VITE_API_URL as string;

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// The WS connection (useDriverSocket) authenticates via a ?token= query
// param — there's no cookie-based handshake for WebSocket upgrades here —
// so it needs to read the current token, not just set it.
export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, jsonContentType = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // Cross-origin (this app and the API are on separate subdomains) — the
    // refresh-token cookie only survives the request with this set, and
    // only because the API's CORS config explicitly allows it (server.ts).
    credentials: "include",
    headers: {
      ...(jsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  // No Content-Type header here on purpose — the browser sets
  // multipart/form-data with the right boundary itself; overriding it
  // breaks the upload.
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<T>(path, { method: "POST", body: form }, false);
  },
};
