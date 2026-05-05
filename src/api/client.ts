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

export const ERROR_USER_MESSAGES: Record<string, string> = {
  CARD_NOT_FOUND: '카드를 찾을 수 없어요.',
  INVALID_AUDIO: '녹음 파일을 확인해주세요.',
  MISSING_REFERENCE_TEXT: '문장을 확인해주세요.',
  INVALID_PROSODY_INPUT: '억양 입력이 올바르지 않아요.',
  PIPELINE_ERROR: '분석 중 오류가 발생했습니다. 다시 시도해주세요.',
  INTERNAL_ERROR: '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크에 연결할 수 없어요.',
};

export function userMessageFor(code: string, fallback?: string): string {
  return ERROR_USER_MESSAGES[code] ?? fallback ?? '요청을 처리할 수 없어요.';
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
