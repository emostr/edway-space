import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { _electron as electron, expect, test } from '@playwright/test';
import { dismissToasts, open, register } from './helpers';

/**
 * Настольное приложение — оболочка вокруг той же платформы. Проверяем главное:
 * оно спрашивает адрес сервера, не пускает на чужой адрес, запоминает выбор
 * и открывает кабинет учителя.
 */
const APP_DIR = join(__dirname, '..', 'desktop');
const SERVER = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3001';

/** Electron живёт в своём пакете, а не в зависимостях набора тестов. */
function electronBinary(): string {
  const require = createRequire(join(APP_DIR, 'package.json'));
  return require('electron') as unknown as string;
}

test.describe('Настольное приложение', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Electron запускается один раз');

  test('спрашивает адрес, проверяет его и открывает платформу', async () => {
    test.slow();
    // Свой каталог настроек: прогон не должен зависеть от прошлых запусков
    // и от приложения, установленного на машине.
    const userData = await fs.mkdtemp(join(tmpdir(), 'edway-desktop-'));

    // ELECTRON_RUN_AS_NODE ставит терминал VS Code, и с ней Electron стартует
    // обычным Node — без окон и без app.
    const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;

    const app = await electron.launch({
      executablePath: electronBinary(),
      args: ['.', `--user-data-dir=${userData}`],
      cwd: APP_DIR,
      env: { ...env, EDWAY_URL: '', NODE_ENV: 'test' } as Record<string, string>,
    });

    try {
      const window = await app.firstWindow();
      await window.waitForLoadState('domcontentloaded');

      // Без сохранённого адреса открывается экран подключения.
      await expect(window.getByRole('heading', { name: 'Адрес платформы' })).toBeVisible();

      // Чужой адрес приложение не принимает: там отвечает не платформа.
      await window.getByLabel('Адрес сервера').fill('http://127.0.0.1:9');
      await window.getByRole('button', { name: 'Подключиться' }).click();
      await expect(window.locator('#note')).toContainText(/недоступен|не отвечает|ошибк/i);

      // Правильный адрес — и приложение уходит на платформу.
      await window.getByLabel('Адрес сервера').fill(SERVER);
      await window.getByRole('button', { name: 'Подключиться' }).click();

      await window.waitForURL((url) => url.href.startsWith(SERVER), { timeout: 30_000 });
      await expect(window.locator('link[rel="manifest"]')).toHaveCount(1);
      await expect(window.getByRole('heading', { name: 'Вход в кабинет' })).toBeVisible();

      // Адрес запомнился: в настройках приложения появился файл с ним.
      const saved = JSON.parse(await fs.readFile(join(userData, 'edway.json'), 'utf8'));
      expect(saved.serverUrl).toBe(SERVER);
    } finally {
      await app.close();
      await fs.rm(userData, { recursive: true, force: true });
    }
  });

  test('со вшитым адресом открывает платформу сразу, без экрана подключения', async () => {
    test.slow();
    const userData = await fs.mkdtemp(join(tmpdir(), 'edway-desktop-'));
    const { ELECTRON_RUN_AS_NODE: _ignored, ...env } = process.env;

    // Так ведёт себя установщик, собранный школой под свой сервер: адрес уже
    // внутри, учителю ничего вводить не нужно.
    const app = await electron.launch({
      executablePath: electronBinary(),
      args: ['.', `--user-data-dir=${userData}`],
      cwd: APP_DIR,
      env: { ...env, EDWAY_URL: SERVER } as Record<string, string>,
    });

    try {
      const window = await app.firstWindow();
      await window.waitForURL((url) => url.href.startsWith(SERVER), { timeout: 30_000 });
      await expect(window.getByRole('heading', { name: 'Вход в кабинет' })).toBeVisible();
    } finally {
      await app.close();
      await fs.rm(userData, { recursive: true, force: true });
    }
  });
});

test.describe('Страница загрузки', () => {
  test('в подвале кабинета есть ссылка, а на странице — адрес сервера и файлы', async ({ page }) => {
    await register(page);
    await dismissToasts(page);

    // Предложение скачать приложение стоит в подвале, как и договаривались.
    await page.getByRole('link', { name: 'приложение для компьютера' }).click();
    await expect(page).toHaveURL(/\/download$/);

    await expect(page.getByRole('heading', { name: 'Приложение для компьютера' })).toBeVisible();

    // Адрес именно этого сервера — его учитель вставит в приложение.
    const origin = new URL(page.url()).origin;
    await expect(page.getByText(origin, { exact: true }).first()).toBeVisible();

    // Сборки для всех трёх систем, включая пакет Debian.
    const links = page.getByRole('link', { name: 'Скачать' });
    await expect(links).toHaveCount(6);
    const targets = await links.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLAnchorElement).href),
    );
    expect(targets.some((href) => href.endsWith('edway-space-setup-x64.exe'))).toBeTruthy();
    expect(targets.some((href) => href.endsWith('edway-space-arm64.dmg'))).toBeTruthy();
    expect(targets.some((href) => href.endsWith('edway-space-amd64.deb'))).toBeTruthy();

    // Страница открыта и без входа: её показывают учителю на любом компьютере.
    await page.context().clearCookies();
    await open(page, '/download');
    await expect(page.getByRole('heading', { name: 'Приложение для компьютера' })).toBeVisible();
  });
});
