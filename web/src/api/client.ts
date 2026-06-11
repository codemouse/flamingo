/**
 * Minimal fetch-based HTTP client.
 *
 * Exposes the same `.get/.post/.put/.patch/.delete` shape as the previous
 * axios client (returns `{ data }`) so the rest of the app keeps working.
 *
 * Drops the axios dependency entirely. Native fetch ships in every modern
 * browser and is ~30KB lighter on the bundle.
 *
 * Auth flow preserved: Bearer header from in-memory access token, transparent
 * single-flight refresh on 401, optional unauthenticated callback.
 */

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let accessToken: string | null = null;
let onUnauthenticated: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setUnauthenticatedHandler(fn: () => void): void {
  onUnauthenticated = fn;
}

export interface ApiError extends Error {
  status: number;
  data: unknown;
  response: { status: number; data: unknown };
  config?: { url: string; method: string };
  /** True when fetch itself failed (DNS, refused, offline) — server never responded. */
  isNetworkError?: boolean;
}

interface RequestConfig {
  skipAuthRetry?: boolean;
  headers?: Record<string, string>;
  /** Query string params merged onto the URL. Values are coerced to strings. */
  params?: Record<string, string | number | boolean | undefined | null>;
}

interface Response<T> {
  data: T;
  status: number;
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const r = await rawRequest<{ accessToken: string }>(
        "POST",
        "/auth/refresh",
        undefined,
        { skipAuthRetry: true },
      );
      const next = r.data.accessToken;
      setAccessToken(next);
      return next;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/refresh") ||
    url.includes("/auth/register") ||
    url.includes("/auth/logout")
  );
}

function appendQuery(
  url: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    search.append(k, String(v));
  }
  const qs = search.toString();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

async function rawRequest<T>(
  method: string,
  url: string,
  body: unknown,
  config: RequestConfig = {},
): Promise<Response<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...config.headers,
  };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let serializedBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    serializedBody = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;
  const finalUrl = config.params
    ? appendQuery(fullUrl, config.params)
    : fullUrl;

  let response: globalThis.Response;
  try {
    response = await fetch(finalUrl, {
      method,
      headers,
      body: serializedBody,
      credentials: "include",
    });
  } catch (cause) {
    // fetch only rejects on network-layer failures (DNS, connection refused,
    // CORS, offline). Surface a distinct error so callers can show a clearer
    // message than "Invalid credentials".
    const err = new Error(
      `Cannot reach API at ${baseURL}. Is the server running?`,
    ) as ApiError;
    err.status = 0;
    err.data = null;
    err.response = { status: 0, data: null };
    err.config = { url, method };
    err.isNetworkError = true;
    err.cause = cause;
    throw err;
  }

  let data: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (
    response.status !== 204 &&
    response.headers.get("content-length") !== "0"
  ) {
    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      data = text || null;
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !config.skipAuthRetry &&
      !isAuthEndpoint(url)
    ) {
      const next = await refreshAccessToken();
      if (next) {
        return rawRequest<T>(method, url, body, {
          ...config,
          skipAuthRetry: true,
        });
      }
      onUnauthenticated?.();
    }
    const err = new Error(
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed: ${response.status}`,
    ) as ApiError;
    err.status = response.status;
    err.data = data;
    err.response = { status: response.status, data };
    err.config = { url, method };
    throw err;
  }

  return { data: data as T, status: response.status };
}

export const client = {
  get: <T = unknown>(url: string, config?: RequestConfig) =>
    rawRequest<T>("GET", url, undefined, config),
  post: <T = unknown>(url: string, body?: unknown, config?: RequestConfig) =>
    rawRequest<T>("POST", url, body, config),
  put: <T = unknown>(url: string, body?: unknown, config?: RequestConfig) =>
    rawRequest<T>("PUT", url, body, config),
  patch: <T = unknown>(url: string, body?: unknown, config?: RequestConfig) =>
    rawRequest<T>("PATCH", url, body, config),
  delete: <T = unknown>(url: string, config?: RequestConfig) =>
    rawRequest<T>("DELETE", url, undefined, config),
};

export default client;
