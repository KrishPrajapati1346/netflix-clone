import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiError, ApiResponse, AuthSessionDTO } from '@kinora/shared';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const API_PREFIX = '/api/v1';

/**
 * The access token lives in a module-level variable, never in localStorage or
 * sessionStorage.
 *
 * Web storage is readable by any script on the page, so an XSS bug there is a
 * durable account takeover — the attacker exfiltrates a token that keeps
 * working. Holding it in a closure means it dies with the page, and the
 * long-lived credential (the refresh token) is an httpOnly cookie that script
 * cannot read at all.
 *
 * The cost is that a page reload starts with no access token; `refresh()` on
 * mount trades the cookie for a new one, which is what `AuthProvider` does.
 */
let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Lets AuthProvider react when the session is definitively gone. */
export function setAuthFailureHandler(handler: (() => void) | null): void {
  onAuthFailure = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  // Required for the refresh cookie to be sent cross-origin.
  withCredentials: true,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const profileGrant = getProfileGrant();
  if (profileGrant) {
    config.headers.set('X-Kinora-Profile', profileGrant);
  }

  return config;
});

/**
 * Single-flight refresh.
 *
 * Two callers need this, and both must share one in-flight request:
 *
 *  - The 401 interceptor. When a page fires six requests at once and the access
 *    token has just expired, all six come back 401. Without deduplication each
 *    would independently POST /auth/refresh — and because refresh *rotates* the
 *    token, the first would succeed and the other five would present an
 *    already-rotated token, which the server correctly reads as replay and
 *    answers by revoking the entire family. The user would be logged out by
 *    their own page load.
 *  - `AuthProvider`'s mount-time session restore, which runs twice under React
 *    StrictMode in development.
 *
 * Both therefore go through `refreshSession`, which returns the whole session
 * (the provider needs the user and expiry; the interceptor only needs the
 * token) and clears the shared promise once settled.
 */
let refreshPromise: Promise<AuthSessionDTO> | null = null;

export async function refreshSession(): Promise<AuthSessionDTO> {
  refreshPromise ??= axios
    .post<ApiResponse<AuthSessionDTO>>(
      `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then((response) => {
      if (!response.data.success) throw new Error('Refresh rejected');
      setAccessToken(response.data.data.accessToken);
      return response.data.data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as RetriableConfig | undefined;
    const code = error.response?.data?.error?.code;
    const status = error.response?.status;

    const isExpiredToken =
      status === 401 && (code === 'TOKEN_EXPIRED' || code === 'NO_TOKEN' || code === 'TOKEN_INVALID');

    // `_retried` stops an infinite loop when the refreshed token is also
    // rejected. The refresh endpoint itself is excluded for the same reason.
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (isExpiredToken && original && !original._retried && !isRefreshCall) {
      original._retried = true;
      try {
        const { accessToken: token } = await refreshSession();
        original.headers.set('Authorization', `Bearer ${token}`);
        return apiClient(original);
      } catch {
        setAccessToken(null);
        onAuthFailure?.();
        return Promise.reject(error);
      }
    }

    // A revoked or reused session is unrecoverable; stop pretending otherwise.
    if (status === 401 && (code === 'REFRESH_REUSED' || code === 'CREDENTIALS_CHANGED')) {
      setAccessToken(null);
      onAuthFailure?.();
    }

    return Promise.reject(error);
  },
);

/**
 * Unwraps the API's success envelope so callers work with plain data.
 *
 * Every endpoint returns `{ success, data }` or `{ success, error }`; leaving
 * that shape in place would mean writing `response.data.data` at every call
 * site and re-checking `success` in every component.
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  if (!response.data.success) {
    throw new ApiRequestError(response.data.error.message, response.data.error);
  }
  return response.data.data;
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data }),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'DELETE', url }),
};

/** Carries the server's machine-readable code and per-field validation detail. */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly details?: Record<string, string[]>;
  readonly status?: number;

  constructor(message: string, error: ApiError['error'], status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }
}

/**
 * Normalises any thrown value into something renderable.
 *
 * Network failures produce an AxiosError with no response at all, which is a
 * different user-facing message from a 500 — "check your connection" rather
 * than "we broke something".
 */
export function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;

  if (axios.isAxiosError(error)) {
    const payload = (error as AxiosError<ApiError>).response?.data;
    if (payload?.error) {
      return new ApiRequestError(payload.error.message, payload.error, error.response?.status);
    }
    if (error.code === 'ECONNABORTED') {
      return new ApiRequestError('That took too long. Please try again.', {
        code: 'TIMEOUT',
        message: 'Request timed out',
      });
    }
    return new ApiRequestError(
      'Cannot reach the server. Check your connection and try again.',
      { code: 'NETWORK_ERROR', message: 'Network error' },
    );
  }

  return new ApiRequestError('Something went wrong. Please try again.', {
    code: 'UNKNOWN',
    message: 'Unknown error',
  });
}

/* --------------------------------------------------------------------------
   Active profile grant

   Stored in sessionStorage rather than memory so it survives a reload without
   forcing the profile picker again. It is not a bearer credential on its own —
   the server only honours it alongside a valid access token, and re-checks that
   the profile still belongs to that account.
   -------------------------------------------------------------------------- */

const PROFILE_GRANT_KEY = 'kinora.profileGrant';

export function getProfileGrant(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(PROFILE_GRANT_KEY);
  } catch {
    // Safari private mode throws on storage access.
    return null;
  }
}

export function setProfileGrant(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.sessionStorage.setItem(PROFILE_GRANT_KEY, token);
    else window.sessionStorage.removeItem(PROFILE_GRANT_KEY);
  } catch {
    /* storage unavailable — the header simply will not be sent */
  }
}
