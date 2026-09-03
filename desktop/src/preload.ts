import { contextBridge, ipcRenderer } from 'electron';

/**
 * Единственный мост между приложением и страницей настройки. Сайт платформы
 * этим API не пользуется вовсе: ему достаточно обычного браузерного окружения.
 */
contextBridge.exposeInMainWorld('edway', {
  getServer: (): Promise<string> => ipcRenderer.invoke('edway:get-server'),
  checkServer: (url: string): Promise<{ ok: boolean; url: string; message: string }> =>
    ipcRenderer.invoke('edway:check-server', url),
  connect: (url: string): Promise<{ ok: boolean; message: string }> =>
    ipcRenderer.invoke('edway:connect', url),
  version: (): Promise<string> => ipcRenderer.invoke('edway:version'),
});
