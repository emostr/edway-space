/*
 * Сервис-воркер платформы. Задача скромная и намеренно такая: держать
 * оболочку под рукой и показывать понятную страницу, когда школьный сервер
 * недоступен. Данные учителя — работы, оценки, сканы — не кешируются вовсе:
 * устаревшая ведомость хуже, чем её отсутствие.
 */
const VERSION = 'edway-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = '/offline.html';

const SHELL = [OFFLINE_URL, '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Кеши прошлых версий чистим сразу: иначе после обновления платформы часть
  // страниц продолжала бы жить старой сборкой.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // API и загруженные файлы — только из сети. Кешировать чужие оценки и сканы
  // на устройстве незачем, да и устаревать им нельзя.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Переходы по страницам: сеть, а если её нет — страница «нет соединения».
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Сборка Next лежит по неизменяемым адресам с хешем в имени, поэтому её
  // отдаём из кеша сразу, а обновление подтягиваем в фоне.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
  }
});
