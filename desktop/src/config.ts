import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';

export interface DesktopConfig {
  /** Адрес школьного сервера, например https://edway.school.ru */
  serverUrl: string;
}

const FILE = () => join(app.getPath('userData'), 'edway.json');

/**
 * Адрес, вшитый в сборку. Пустой в общей сборке из репозитория: приложение
 * спросит адрес при первом запуске. Школа, которая собирает установщик для
 * себя, подставляет сюда свой домен — тогда учителю ничего вводить не надо.
 */
const DEFAULT_URL = (require('../package.json') as { edway?: { defaultUrl?: string } }).edway
  ?.defaultUrl ?? '';

/**
 * Адрес сервера берётся из трёх мест, по убыванию приоритета: переменная
 * окружения (удобно при отладке), сохранённый выбор учителя и адрес, зашитый
 * в сборку. Последнее нужно школе, которая раздаёт учителям готовый
 * установщик: тогда приложение открывает нужный сервер сразу.
 */
export function bundledUrl(): string {
  // EDWAY_URL — для отладки, edway.defaultUrl в package.json — то, что школа
  // зашивает при сборке своего установщика.
  const meta = (process as NodeJS.Process & { edwayDefaultUrl?: string }).edwayDefaultUrl;
  const packaged = (app as unknown as { edwayDefaultUrl?: string }).edwayDefaultUrl;
  return normalize(process.env.EDWAY_URL || meta || packaged || DEFAULT_URL);
}

export async function readConfig(): Promise<DesktopConfig> {
  try {
    const raw = await fs.readFile(FILE(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<DesktopConfig>;
    return { serverUrl: normalize(parsed.serverUrl ?? '') };
  } catch {
    return { serverUrl: '' };
  }
}

export async function writeConfig(config: DesktopConfig): Promise<void> {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(config, null, 2), 'utf8');
}

/** Учитель наберёт адрес как придётся: с пробелами, без схемы, со слэшем. */
export function normalize(value: string): string {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

export interface ProbeResult {
  ok: boolean;
  url: string;
  message: string;
}

/**
 * Проверка адреса перед подключением: на нём должна отвечать именно наша
 * платформа. Иначе учитель, ошибившись в домене, попал бы в чужой сайт
 * внутри приложения и не понял, почему ничего не работает.
 */
export async function probe(rawUrl: string): Promise<ProbeResult> {
  const url = normalize(rawUrl);
  if (!url) {
    return { ok: false, url: '', message: 'Похоже, это не адрес сервера' };
  }

  try {
    const response = await fetch(`${url}/api/health`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { ok: false, url, message: `Сервер ответил ошибкой ${response.status}` };
    }
    const body = (await response.json()) as { app?: string; status?: string };
    if (body.app !== 'edway') {
      return { ok: false, url, message: 'По этому адресу отвечает не edway.space' };
    }
    if (body.status !== 'ok') {
      return { ok: false, url, message: 'Платформа отвечает, но у неё нет связи с базой' };
    }
    return { ok: true, url, message: 'Сервер найден' };
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'не отвечает' : 'недоступен';
    return { ok: false, url, message: `Сервер ${reason}. Проверьте адрес и сеть` };
  }
}
