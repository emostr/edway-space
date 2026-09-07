import { expect, type Locator, type Page } from '@playwright/test';
import { totpCode } from './totp';

export const PASSWORD = 'edway-test-2026-pass';

export interface School {
  name: string;
  login: string;
  /** Пароль после прохождения первичной настройки. */
  password: string;
}

/** Уникальный хвост: каждый прогон заводит свою школу и свои классы. */
export function stamp(): string {
  return Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
}

/**
 * Названия и фамилии платформа принимает только буквами: разряды счётчика
 * превращаем в слоги, чтобы каждый прогон получал непохожее, но допустимое имя.
 */
export function nameStamp(): string {
  const syllables = ['ба', 'ве', 'ди', 'жо', 'ку', 'ло', 'ми', 'ны', 'пе', 'ра', 'со', 'ту'];
  let value = Date.now() % 1_000_000;
  let out = '';
  while (value > 0) {
    out += syllables[value % syllables.length];
    value = Math.floor(value / syllables.length);
  }
  return out + syllables[Math.floor(Math.random() * syllables.length)];
}

/**
 * Переход по адресу с ожиданием готовности: разметку Next отдаёт сразу,
 * но до гидратации ввод в поля теряется на первой же перерисовке.
 */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true');
}

/**
 * Заполняет поле и убеждается, что значение осело в состоянии React.
 */
export async function fillField(page: Page, locator: Locator, value: string): Promise<void> {
  await expect(async () => {
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
}

/** Всплывающие уведомления перехватывают клики, пока уезжают. */
export async function dismissToasts(page: Page): Promise<void> {
  const popup = page.locator('.swal2-container');
  if (await popup.count()) {
    await page.keyboard.press('Escape');
    await popup.first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => undefined);
  }
}

/** Регистрация школы с сайта: две недели пробного периода. */
export async function registerSchool(page: Page): Promise<{ name: string; login: string; temporary: string }> {
  const suffix = nameStamp();
  const name = `Школа ${suffix}`;

  await open(page, '/register');
  await fillField(page, page.getByLabel(/^Школа/), name);
  await fillField(page, page.getByLabel(/^Ваша фамилия/), `Тестов${suffix}`);
  await fillField(page, page.getByLabel(/^Имя/), 'Пётр');
  await fillField(page, page.getByLabel(/^Почта/), `school-${stamp()}@example.org`);
  // Без согласия с документами платформа регистрацию не примет.
  await page.getByRole('checkbox', { name: 'Согласие с документами' }).click();
  await page.getByRole('button', { name: 'Создать школу' }).click();

  await expect(page.getByRole('heading', { name: 'Школа создана' })).toBeVisible();
  const values = page.locator('.text-2xl.font-extrabold');
  const login = (await values.nth(0).innerText()).trim();
  const temporary = (await values.nth(1).innerText()).trim();
  return { name, login, temporary };
}

/**
 * Первый вход администратора: смена временного пароля и подключение второго
 * фактора. Без этого платформа не отдаёт данные школы вовсе.
 */
export async function completeSetup(page: Page, login: string, temporary: string): Promise<void> {
  await open(page, '/login');
  await fillField(page, page.getByLabel('Логин'), login);
  await fillField(page, page.getByLabel('Пароль'), temporary);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/setup/);
  await fillField(page, page.getByLabel('Временный пароль'), temporary);
  await fillField(page, page.getByLabel(/^Новый пароль$/), PASSWORD);
  await fillField(page, page.getByLabel('Новый пароль ещё раз'), PASSWORD);
  await page.getByRole('button', { name: 'Сменить пароль' }).click();

  // Ключ показан на экране — тем же алгоритмом считаем код, что и телефон.
  const secret = (await page.locator('.font-mono.text-lg').innerText()).trim();
  await fillField(page, page.getByLabel('Код из приложения'), totpCode(secret));
  await page.getByRole('button', { name: 'Подтвердить' }).click();

  await expect(page.getByRole('heading', { name: 'Резервные коды' })).toBeVisible();
  await page.getByRole('button', { name: /Записал/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Школа «под ключ»: зарегистрирована, настроена, готова к работе. */
export async function register(page: Page): Promise<School> {
  const created = await registerSchool(page);
  await completeSetup(page, created.login, created.temporary);
  return { name: created.name, login: created.login, password: PASSWORD };
}

/**
 * Ввод кода второго фактора. Код живёт 30 секунд, и на загруженной машине
 * шаг может смениться между генерацией и отправкой — тогда пробуем ещё раз
 * со свежим кодом, как сделал бы и человек.
 */
export async function submitTotp(page: Page, secret: string, label: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fillField(page, page.getByLabel(label), totpCode(secret));
    await page.getByRole('button', { name: 'Подтвердить' }).click();

    const rejected = page.getByText('Неверный код подтверждения');
    if (!(await rejected.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }
  }
  throw new Error('Код второго фактора не принят три раза подряд');
}

/** Повторный вход существующего сотрудника — уже со вторым фактором. */
export async function signIn(page: Page, login: string, password: string, secret?: string): Promise<void> {
  await open(page, '/login');
  await fillField(page, page.getByLabel('Логин'), login);
  await fillField(page, page.getByLabel('Пароль'), password);
  await page.getByRole('button', { name: 'Войти' }).click();

  if (secret) {
    await submitTotp(page, secret, 'Код подтверждения');
  }
}

const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

/**
 * Классы в школе общие, поэтому прогон не должен занимать фиксированный «7В»:
 * спрашиваем список и берём первую свободную пару.
 */
export async function freeClass(page: Page): Promise<{ number: number; letter: string; name: string }> {
  const response = await page.request.get('/api/classes');
  const existing = (await response.json()) as { number: number; letter: string }[];
  const taken = new Set(existing.map((item) => `${item.number}${item.letter}`));

  for (const letter of LETTERS) {
    for (let number = 1; number <= 11; number += 1) {
      if (!taken.has(`${number}${letter}`)) {
        return { number, letter, name: `${number}${letter}` };
      }
    }
  }
  throw new Error('Свободных классов не осталось — очистите базу');
}

/**
 * Вход администратора платформы. Учётная запись одна на всю платформу и
 * заводится при первом запуске сервера, поэтому первый прогон проходит её
 * настройку, а последующие берут сохранённые пароль и ключ.
 */
export async function platformAdmin(page: Page): Promise<{ login: string; password: string; secret: string }> {
  const { existsSync, mkdirSync, readFileSync, writeFileSync } = await import('node:fs');
  const { dirname, join } = await import('node:path');

  // Не в test-results: эту папку Playwright очищает перед каждым прогоном,
  // а пароль администратора платформы меняется ровно один раз.
  const file = join(process.cwd(), '.e2e-state', 'platform-admin.json');
  const login = process.env.E2E_ADMIN_LOGIN ?? 'admin';
  const initial = process.env.E2E_ADMIN_PASSWORD ?? 'platform-admin-2026';
  const password = 'edway-platform-2026-pass';

  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8')) as { password: string; secret: string };
    await signIn(page, login, saved.password, saved.secret);
    await expect(page).toHaveURL(/\/admin/);
    return { login, ...saved };
  }

  await open(page, '/login');
  await fillField(page, page.getByLabel('Логин'), login);
  await fillField(page, page.getByLabel('Пароль'), initial);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL(/\/setup/);
  await fillField(page, page.getByLabel('Временный пароль'), initial);
  await fillField(page, page.getByLabel(/^Новый пароль$/), password);
  await fillField(page, page.getByLabel('Новый пароль ещё раз'), password);
  await page.getByRole('button', { name: 'Сменить пароль' }).click();

  const secret = (await page.locator('.font-mono.text-lg').innerText()).trim();
  await fillField(page, page.getByLabel('Код из приложения'), totpCode(secret));
  await page.getByRole('button', { name: 'Подтвердить' }).click();
  await expect(page.getByRole('heading', { name: 'Резервные коды' })).toBeVisible();
  await page.getByRole('button', { name: /Записал/ }).click();
  await expect(page).toHaveURL(/\/admin/);

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ password, secret }), 'utf8');
  return { login, password, secret };
}
