'use client';

import { useEffect } from 'react';

/**
 * Регистрация сервис-воркера. В разработке не нужна и мешает: закешированная
 * оболочка живёт дольше, чем правка в коде.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Обновление платформы не должно ждать закрытия всех вкладок.
          registration.addEventListener('updatefound', () => {
            registration.installing?.addEventListener('statechange', function onChange() {
              if (this.state === 'installed' && navigator.serviceWorker.controller) {
                this.postMessage('skip-waiting');
              }
            });
          });
        })
        .catch(() => {
          /* без офлайн-режима платформа работает как обычный сайт */
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
