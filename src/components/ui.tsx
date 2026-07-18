import type { PropsWithChildren, ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react'
import type { RequestStatus } from '../types'

const statusLabels: Record<RequestStatus, string> = {
  aguardando: 'Aguardando',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`status status--${status}`}>{statusLabels[status]}</span>
}

export function Notice({
  children,
  kind = 'info',
}: PropsWithChildren<{ kind?: 'info' | 'success' | 'warning' | 'error' }>) {
  const Icon = kind === 'success' ? CheckCircle2 : kind === 'info' ? Info : AlertCircle
  return (
    <div className={`notice notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" size={19} />
      <div>{children}</div>
    </div>
  )
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: PropsWithChildren<{ label: string; error?: string; hint?: string; required?: boolean }>) {
  return (
    <label className={`field ${error ? 'field--error' : ''}`}>
      <span className="field__label">
        {label} {required ? <span aria-hidden="true">*</span> : null}
      </span>
      {children}
      {error ? <span className="field__error">{error}</span> : null}
      {!error && hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}
