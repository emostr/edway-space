'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Icon } from '@/lib/ui';
import { notify } from '@/lib/notify';

/**
 * Откуда качать установщики. По умолчанию — релизы репозитория платформы;
 * школа, которая держит свою сборку, задаёт свой адрес переменной
 * NEXT_PUBLIC_RELEASES_URL при сборке образа.
 */
const RELEASES =
  process.env.NEXT_PUBLIC_RELEASES_URL ?? 'https://github.com/emostr/edway-space/releases/latest';

interface Build {
  id: string;
  system: string;
  hint: string;
  file: string;
  icon: string;
}

const BUILDS: Build[] = [
  {
    id: 'windows',
    system: 'Windows 10 и 11',
    hint: 'Установщик, ярлык на рабочем столе',
    file: 'edway-space-setup-x64.exe',
    icon: 'monitor',
  },
  {
    id: 'windows-portable',
    system: 'Windows без установки',
    hint: 'Один файл, запускается с флешки',
    file: 'edway-space-portable-x64.exe',
    icon: 'download',
  }
];

/** Что предложить первым: угадываем систему по строке браузера. */
function guessSystem(): string {
  if (typeof navigator === 'undefined') {
    return '';
  }
  const agent = navigator.userAgent;
  if (/Windows/i.test(agent)) {
    return 'windows';
  }
  if (/Macintosh|Mac OS X/i.test(agent)) {
    // Apple Silicon отдаёт ту же строку, что и Intel, поэтому спрашиваем платформу.
    return /arm|aarch64/i.test(navigator.platform) || navigator.maxTouchPoints > 1
      ? 'mac-arm'
      : 'mac-intel';
  }
  if (/Ubuntu|Debian|Linux/i.test(agent)) {
    return 'debian';
  }
  return '';
}

export default function DownloadPage() {
  const [mine, setMine] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setMine(guessSystem());
    setOrigin(window.location.origin);
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(origin);
      notify.toast('Адрес скопирован');
    } catch {
      notify.warning('Не удалось скопировать', { text: origin });
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 bg-accent flex items-center justify-center text-on-accent">
              <Icon name="graduation" size={18} />
            </span>
            <span className="font-extrabold text-ink">
              edway<span className="text-accent">.space</span>
            </span>
          </Link>
          <div className="flex-1" />
          <Button variant="ghost" iconRight="arrowRight" href="/dashboard">
            В кабинет
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="w-10 h-1 bg-accent mb-3" />
        <h1 className="text-3xl font-extrabold text-ink tracking-normal">Приложение для компьютера</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Та же платформа, только в отдельном окне: без адресной строки и вкладок, со своим значком в
          меню «Пуск» или в доке. Печать бланков, загрузка сканов и проверка работают ровно так же.
        </p>

        <Card
          title="Адрес вашего сервера"
          subtitle="При первом запуске приложение спросит его — скопируйте и вставьте"
          className="mt-8"
          accent
        >
          <div className="flex flex-wrap items-center gap-3">
            <code className="text-lg text-ink font-bold tracking-wide break-all">{origin || '…'}</code>
            <Button size="sm" variant="secondary" icon="copy" onClick={copyAddress}>
              Скопировать
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {BUILDS.map((build) => (
            <article
              key={build.id}
              className={`bg-surface border p-5 flex flex-col gap-3 ${
                mine === build.id ? 'border-accent' : 'border-line'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Icon name={build.icon} size={17} className="text-accent shrink-0" />
                    {build.system}
                  </h2>
                  <p className="text-xs text-muted mt-1">{build.hint}</p>
                </div>
                {mine === build.id ? <Badge variant="accent">ваша система</Badge> : null}
              </div>
              <div className="flex-1" />
              <Button
                icon="download"
                variant={mine === build.id ? 'primary' : 'secondary'}
                href={`${RELEASES}/download/${build.file}`}
              >
                Скачать
              </Button>
            </article>
          ))}
        </div>

        <Card title="Как установить" className="mt-6">
          <ol className="text-sm text-muted space-y-2 list-decimal pl-4">
            <li>Скачайте файл для своей системы и запустите его.</li>
            <li>
              Windows и macOS предупредят, что издатель неизвестен: приложение школьное и не подписано
              сертификатом. В Windows — «Подробнее» → «Выполнить в любом случае», в macOS — правый
              щелчок по значку → «Открыть».
            </li>
            <li>
              При первом запуске впишите адрес сервера{' '}
              <span className="text-ink font-semibold">{origin || 'вашей платформы'}</span> и нажмите
              «Подключиться». Дальше приложение открывает кабинет сразу.
            </li>
            <li>Вход тот же — логин и пароль, что и на сайте. Сессия держится, как в браузере.</li>
          </ol>
        </Card>

        <p className="text-xs text-faint mt-6">
          Не хотите ставить приложение — платформу можно добавить на рабочий стол прямо из браузера:
          в Chrome и Edge появится кнопка «Установить», в Safari на iPhone это «Поделиться» → «На
          экран Домой».
        </p>
      </main>
    </div>
  );
}
