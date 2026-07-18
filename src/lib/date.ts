export const FORTALEZA_TIME_ZONE = 'America/Fortaleza'

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FORTALEZA_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FORTALEZA_TIME_ZONE,
    dateStyle: 'short',
  }).format(new Date(value))
}

export function expirationText(value: string): string {
  const remaining = Date.parse(value) - Date.now()
  if (remaining <= 0) return 'Link expirado'
  const minutes = Math.max(1, Math.ceil(remaining / 60_000))
  if (minutes >= 60) return 'Expira em até 1 hora'
  return `Expira em ${minutes} min`
}
