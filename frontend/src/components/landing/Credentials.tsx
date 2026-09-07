'use client';

import { Alert, Button, Icon } from '@/lib/ui';
import { notify } from '@/lib/notify';

interface Props {
  login: string;
  password: string;
  title?: string;
}

/**
 * Выданные логин и пароль. Показываются один раз: пароль временный, и после
 * первой смены его уже неоткуда взять — поэтому экран настойчиво просит
 * записать его сейчас.
 */
export function Credentials({ login, password, title = 'Школа создана' }: Props) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(`Логин: ${login}\nПароль: ${password}`);
      notify.toast('Скопировано');
    } catch {
      notify.warning('Скопировать не вышло — перепишите вручную');
    }
  }

  return (
    <div className="border border-accent bg-surface">
      <div className="px-6 py-5 border-b border-line flex items-center gap-3">
        <span className="w-9 h-9 bg-accent text-on-accent flex items-center justify-center shrink-0">
          <Icon name="checkCircle" size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="text-xs text-muted">Запишите доступы — пароль показывается один раз</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div>
          <div className="ng-label text-muted mb-1.5">Логин</div>
          <div className="text-2xl font-extrabold text-ink tracking-wide break-all">{login}</div>
        </div>
        <div>
          <div className="ng-label text-muted mb-1.5">Временный пароль</div>
          <div className="text-2xl font-extrabold text-ink tracking-wide break-all">{password}</div>
        </div>

        <Alert variant="warning">
          При первом входе платформа попросит сменить пароль и подключить второй фактор — приложение
          вроде Google Authenticator или Яндекс.Ключа.
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="copy" onClick={copy}>
            Скопировать
          </Button>
          <Button href="/login" iconRight="arrowRight">
            Войти в кабинет
          </Button>
        </div>
      </div>
    </div>
  );
}
