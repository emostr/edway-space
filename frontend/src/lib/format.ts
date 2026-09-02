const DATE = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  return DATE.format(new Date(value))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  return DATE_TIME.format(new Date(value))
}

/** «3 минуты назад», «вчера» — для журналов и лент активности. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) {
    return 'только что'
  }
  if (minutes < 60) {
    return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`
  }
  const days = Math.round(hours / 24)
  if (days < 30) {
    return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`
  }
  return formatDate(value)
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few
  }
  return many
}

export function countLabel(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/** «2026-03» → «мар 26» для подписей на графиках. */
export function monthLabel(period: string): string {
  const [year, month] = period.split('-')
  return `${MONTHS[Number(month) - 1] ?? month} ${year.slice(2)}`
}

export function dayLabel(iso: string): string {
  const date = new Date(iso)
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
