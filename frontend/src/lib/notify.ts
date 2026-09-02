import Swal from 'sweetalert2-neutral'
import type { SweetAlertIcon, SweetAlertOptions, SweetAlertResult } from 'sweetalert2-neutral'

const ICON_TIMERS: Partial<Record<SweetAlertIcon, number>> = {
  success: 1900,
  info: 2600,
  warning: 2600,
  error: 1900,
}

type NotifyOptions = SweetAlertOptions & { toast?: boolean }

function base(opts: NotifyOptions = {}): Promise<SweetAlertResult> {
  const { toast = false, icon, title, text, timer, ...rest } = opts
  const withTimer = timer ?? (icon && ICON_TIMERS[icon]) ?? 2800

  if (toast) {
    return Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon,
      title,
      text,
      showConfirmButton: false,
      timer: withTimer,
      timerProgressBar: true,
      showCloseButton: true,
      ...rest,
    })
  }

  return Swal.fire({
    position: 'center',
    icon,
    title,
    text,
    showConfirmButton: false,
    timer: withTimer,
    timerProgressBar: true,
    ...rest,
  })
}

export interface ConfirmOptions {
  title?: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: SweetAlertIcon
  danger?: boolean
}

export interface PromptOptions {
  title?: string
  text?: string
  inputLabel?: string
  inputValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  inputType?: 'text' | 'number' | 'password' | 'textarea'
}

export const notify = {
  success: (title: string, opts: NotifyOptions = {}) => base({ icon: 'success', title, ...opts }),
  error: (title: string, opts: NotifyOptions = {}) => base({ icon: 'error', title, ...opts }),
  warning: (title: string, opts: NotifyOptions = {}) => base({ icon: 'warning', title, ...opts }),
  info: (title: string, opts: NotifyOptions = {}) => base({ icon: 'info', title, ...opts }),

  toast: (title: string, opts: NotifyOptions = {}) =>
    base({ toast: true, icon: 'success', title, ...opts }),

  async confirm(opts: ConfirmOptions = {}): Promise<boolean> {
    const {
      title = 'Вы уверены?',
      text = 'Это действие нельзя отменить.',
      confirmText = 'Подтвердить',
      cancelText = 'Отмена',
      icon = 'warning',
      danger = false,
    } = opts

    const res = await Swal.fire({
      title,
      text,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      focusCancel: true,
      customClass: danger ? { confirmButton: 'swal2-deny' } : {},
    })
    return res.isConfirmed
  },

  async prompt(opts: PromptOptions = {}): Promise<string | null> {
    const {
      title = 'Введите значение',
      text = '',
      inputLabel = '',
      inputValue = '',
      placeholder = '',
      confirmText = 'ОК',
      cancelText = 'Отмена',
      inputType = 'text',
    } = opts

    const res = await Swal.fire({
      title,
      text,
      input: inputType,
      inputLabel,
      inputValue,
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    })
    return res.isConfirmed ? String(res.value ?? '') : null
  },

  /** Модалка «запишите и сохраните» — для временных паролей и резервных кодов. */
  async secrets(title: string, html: string): Promise<void> {
    await Swal.fire({
      title,
      html,
      icon: 'info',
      confirmButtonText: 'Записал, закрыть',
      allowOutsideClick: false,
      width: 560,
    })
  },
}

export default notify
