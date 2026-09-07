export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 423 — учётная запись не прошла обязательную настройку. */
  get isSetupRequired(): boolean {
    return this.status === 423 || this.code === 'SETUP_REQUIRED';
  }

  /** 402 — подписка школы закончилась: данные целы, работа приостановлена. */
  get isSubscriptionExpired(): boolean {
    return this.status === 402 || this.code === 'SUBSCRIPTION_EXPIRED';
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Неизвестная ошибка';
}

type Handler = () => void;

let onSetupRequired: Handler | null = null;
let onSubscriptionExpired: Handler | null = null;

/**
 * Оболочка кабинета подписывается сюда: два ответа сервера — «пройди
 * настройку» и «подписка кончилась» — означают не ошибку, а переход на
 * другую страницу, и решать это должен один слой, а не каждый вызов.
 */
export function setApiHandlers(handlers: {
  onSetupRequired?: Handler | null;
  onSubscriptionExpired?: Handler | null;
}): void {
  onSetupRequired = handlers.onSetupRequired ?? null;
  onSubscriptionExpired = handlers.onSubscriptionExpired ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, { credentials: 'include', ...options });
  const type = res.headers.get('content-type') || '';
  const isJson = type.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

  if (!res.ok) {
    const body = (isJson ? data : null) as { message?: string; error?: string } | null;
    const error = new ApiError(
      body?.message || 'Ошибка запроса к серверу',
      res.status,
      body?.error || '',
    );
    if (error.isSetupRequired) {
      onSetupRequired?.();
    }
    if (error.isSubscriptionExpired) {
      onSubscriptionExpired?.();
    }
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Загрузка файлов: Content-Type проставляет сам браузер вместе с boundary. */
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

/** Собирает query-строку, пропуская пустые значения. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
