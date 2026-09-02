import { expect, type Locator, type Page } from '@playwright/test';

/** Уникальный хвост: каждый прогон заводит своего учителя и свои классы. */
export function stamp(): string {
  return Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
}

/**
 * Фамилию платформа принимает только буквами: разряды счётчика превращаем
 * в слоги, чтобы каждый прогон получал непохожую, но допустимую фамилию.
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

export const PASSWORD = 'edway-test-2026';

export interface Teacher {
  lastName: string;
  firstName: string;
  login: string;
}

/** Регистрация через интерфейс: логин платформа показывает в модалке. */
export async function register(page: Page): Promise<Teacher> {
  const lastName = `Тестов${nameStamp()}`;
  const firstName = 'Пётр';

  await open(page, '/register');
  // Обязательные поля подписаны со звёздочкой — сверяем начало метки.
  await fillField(page, page.getByLabel(/^Фамилия/), lastName);
  await fillField(page, page.getByLabel(/^Имя/), firstName);
  await fillField(page, page.getByLabel(/^Пароль \*/), PASSWORD);
  await fillField(page, page.getByLabel(/^Пароль ещё раз/), PASSWORD);
  await page.getByRole('button', { name: 'Создать кабинет' }).click();

  const dialog = page.locator('.swal2-popup');
  await expect(dialog).toBeVisible();
  const login = (await dialog.locator('p').nth(1).innerText()).trim();
  await dialog.getByRole('button', { name: /Записал/ }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  return { lastName, firstName, login };
}

export async function login(page: Page, teacher: Teacher): Promise<void> {
  await open(page, '/login');
  await fillField(page, page.getByLabel('Логин'), teacher.login);
  await fillField(page, page.getByLabel('Пароль'), PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
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
 * Сразу после загрузки страница ещё не гидратирована: ввод в этот момент
 * попадает в DOM, но теряется на первой же перерисовке.
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

const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

/**
 * Классы в платформе общие для всей школы, поэтому прогон не должен занимать
 * фиксированный «7В»: спрашиваем список и берём первую свободную букву.
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
