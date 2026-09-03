import { join } from 'node:path';
import {
  BrowserWindow,
  Menu,
  app,
  dialog,
  ipcMain,
  session,
  shell,
  type MenuItemConstructorOptions,
} from 'electron';
import { bundledUrl, probe, readConfig, writeConfig } from './config';

const SETUP_PAGE = join(__dirname, 'setup.html');
const PRELOAD = join(__dirname, 'preload.js');

let mainWindow: BrowserWindow | null = null;
/** Адрес сервера, на который сейчас смотрит окно. */
let serverUrl = '';

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    // Тёмный фон под цвет интерфейса: без него окно моргает белым при старте.
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: process.platform !== 'darwin',
    title: 'edway.space',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  // Ссылки на сторонние сайты уводим в системный браузер: окно приложения —
  // это платформа, и ничего кроме неё в нём открываться не должно.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url)) {
      window.loadURL(url);
    } else {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!isOurs(url) && !url.startsWith('file://')) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  // Сервер мог упасть или переехать — показываем понятный экран, а не
  // стандартную страницу ошибки Chromium.
  window.webContents.on('did-fail-load', (_event, errorCode, _description, failedUrl, isMainFrame) => {
    // -3 — навигация прервана самим приложением, это не ошибка.
    if (!isMainFrame || errorCode === -3 || failedUrl.startsWith('file://')) {
      return;
    }
    void window.loadFile(SETUP_PAGE, { query: { error: 'unreachable', url: serverUrl } });
  });

  window.on('closed', () => {
    mainWindow = null;
  });

  return window;
}

function isOurs(url: string): boolean {
  if (!serverUrl) {
    return false;
  }
  try {
    return new URL(url).origin === new URL(serverUrl).origin;
  } catch {
    return false;
  }
}

/** Открывает платформу либо экран настройки, если адрес ещё не выбран. */
async function openPlatform(window: BrowserWindow): Promise<void> {
  const stored = await readConfig();
  const url = stored.serverUrl || bundledUrl();

  if (!url) {
    await window.loadFile(SETUP_PAGE);
    return;
  }

  serverUrl = url;
  await window.loadURL(url);
}

function buildMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: 'edway.space',
            submenu: [
              { role: 'about', label: 'О приложении' },
              { type: 'separator' },
              { label: 'Адрес сервера…', click: () => void changeServer() },
              { type: 'separator' },
              { role: 'hide', label: 'Скрыть' },
              { role: 'hideOthers', label: 'Скрыть остальные' },
              { role: 'unhide', label: 'Показать все' },
              { type: 'separator' },
              { role: 'quit', label: 'Выйти' },
            ],
          },
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Печать…',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.print({}),
        },
        ...(isMac
          ? []
          : ([
              { type: 'separator' },
              { label: 'Адрес сервера…', click: () => void changeServer() },
              { type: 'separator' },
              { role: 'quit', label: 'Выход' },
            ] as MenuItemConstructorOptions[])),
      ],
    },
    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить' },
        { role: 'redo', label: 'Повторить' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать' },
        { role: 'copy', label: 'Копировать' },
        { role: 'paste', label: 'Вставить' },
        { role: 'selectAll', label: 'Выделить всё' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Обновить' },
        { role: 'forceReload', label: 'Обновить без кеша' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Обычный масштаб' },
        { role: 'zoomIn', label: 'Крупнее' },
        { role: 'zoomOut', label: 'Мельче' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Во весь экран' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'Открыть платформу в браузере',
          click: () => {
            if (serverUrl) {
              void shell.openExternal(serverUrl);
            }
          },
        },
        {
          label: 'О приложении',
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: 'edway.space',
              message: `edway.space ${app.getVersion()}`,
              detail: serverUrl
                ? `Школьная платформа тестирования.\nСервер: ${serverUrl}`
                : 'Школьная платформа тестирования.',
              buttons: ['Закрыть'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** Показывает экран выбора адреса — из меню или после сбоя подключения. */
async function changeServer(): Promise<void> {
  if (!mainWindow) {
    return;
  }
  await mainWindow.loadFile(SETUP_PAGE, { query: { url: serverUrl } });
}

function setupDownloads(): void {
  // Выгрузку журнала в CSV сохраняем как обычный файл, спросив, куда положить.
  session.defaultSession.on('will-download', (_event, item) => {
    item.once('done', (_e, state) => {
      if (state === 'completed' && mainWindow) {
        void shell.showItemInFolder(item.getSavePath());
      }
    });
  });
}

app.whenReady().then(async () => {
  app.setAppUserModelId('space.edway.desktop');
  setupDownloads();
  buildMenu();

  ipcMain.handle('edway:get-server', async () => {
    const stored = await readConfig();
    return stored.serverUrl || bundledUrl();
  });

  ipcMain.handle('edway:check-server', (_event, url: string) => probe(url));

  ipcMain.handle('edway:connect', async (_event, url: string) => {
    const result = await probe(url);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    await writeConfig({ serverUrl: result.url });
    serverUrl = result.url;
    await mainWindow?.loadURL(result.url);
    return { ok: true, message: 'Подключено' };
  });

  ipcMain.handle('edway:version', () => app.getVersion());

  mainWindow = createWindow();
  await openPlatform(mainWindow);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      await openPlatform(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
