import type { ApiErrorBody } from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

export const USE_MOCK_API =
  (import.meta.env.VITE_USE_MOCK_API as string | undefined)?.toLowerCase() !== 'false';

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
