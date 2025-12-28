export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Browser calls always go via our Next.js API routes (same origin, HTTPS on Vercel).
// On the server, NEXT_PUBLIC_API_BASE_URL can still be overridden if needed.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

async function request<T>(
  path: string,
  options: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });

    const isJson =
      response.headers
        .get('content-type')
        ?.toLowerCase()
        .includes('application/json') ?? false;

    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof body === 'string'
          ? body
          : body?.message ?? 'Something went wrong, please try again.';
      return { ok: false, error: message };
    }

    return { ok: true, data: body as T };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach the server. Please try again.';
    return { ok: false, error: message };
  }
}

export function postJson<TResponse, TPayload extends object>(
  path: string,
  payload: TPayload,
) {
  return request<TResponse>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
