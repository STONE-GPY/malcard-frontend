import type { ApiErrorBody } from '../types';

// When VITE_API_BASE_URL is not set, talk to the SAME origin the page is served
// from. The Vite dev server proxies the backend routes (/analysis, /tts, ...)
// to localhost:8000 (see vite.config.ts), so a single origin works for local,
// LAN (phone), and Cloudflare tunnel alike — port 8000 is never exposed.
// Returning the origin (not '') keeps speech.ts's `!API_BASE_URL` guard happy.
// An explicit VITE_API_BASE_URL always wins (e.g. a deployed backend).
function defaultApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const { protocol, origin } = window.location;
    // file:// or other non-http origins → fall back to localhost.
    if (protocol === 'http:' || protocol === 'https:') {
      return origin;
    }
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? defaultApiBaseUrl();

// Compile-time default from .env.* files. Code paths that need to react to the
// dev-panel toggle should call useMockApi() instead of reading this constant.
export const USE_MOCK_API =
  (import.meta.env.VITE_USE_MOCK_API as string | undefined)?.toLowerCase() !== 'false';

const MOCK_OVERRIDE_KEY = 'mc-dev-mock-mode';

// Runtime override: returns true/false from localStorage if set, otherwise the
// env-var default. Lets the in-app dev panel switch between mock and the real
// backend without editing .env.local. Reads on every call so a panel change
// takes effect on the next analyze()/listCards() invocation.
export function useMockApi(): boolean {
  try {
    const v = localStorage.getItem(MOCK_OVERRIDE_KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch {
    /* localStorage may be blocked — fall through to env default */
  }
  return USE_MOCK_API;
}

export function setMockApiOverride(value: boolean | null) {
  try {
    if (value === null) localStorage.removeItem(MOCK_OVERRIDE_KEY);
    else localStorage.setItem(MOCK_OVERRIDE_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const KNOWN_ERROR_CODES = [
  'CARD_NOT_FOUND',
  'INVALID_AUDIO',
  'MISSING_REFERENCE_TEXT',
  'INVALID_PROSODY_INPUT',
  'PIPELINE_ERROR',
  'INTERNAL_ERROR',
  'NETWORK_ERROR',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

export function errorI18nKey(code: string): string {
  if ((KNOWN_ERROR_CODES as readonly string[]).includes(code)) return `errors.${code}`;
  return 'errors.DEFAULT';
}

async function readErrorBody(res: Response): Promise<ApiErrorBody | null> {
  try {
    const data = await res.json();
    if (data && typeof data === 'object' && 'error' in data) return data as ApiErrorBody;
  } catch {
    /* ignore */
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (e) {
    throw new ApiError('NETWORK_ERROR', (e as Error).message || 'network error', 0);
  }

  if (!res.ok) {
    const body = await readErrorBody(res);
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message = body?.error?.message ?? res.statusText;
    throw new ApiError(code, message, res.status, body?.error?.details);
  }

  // No-content responses
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
