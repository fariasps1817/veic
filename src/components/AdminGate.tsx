import { useEffect, useState, type FormEvent, type PropsWithChildren } from 'react'
import { LockKeyhole, LoaderCircle } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { getCurrentSession, isDemoMode, signIn, supabase } from '../lib/supabase'
import { AppFooter } from './AppFooter'
import { Field, Notice } from './ui'

export function AdminGate({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(!isDemoMode)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (isDemoMode || !supabase) return
    void getCurrentSession().then((current) => {
      setSession(current)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  if (isDemoMode) return children
  if (checking) {
    return <div className="center-screen"><LoaderCircle className="spin" /> Verificando acesso…</div>
  }
  if (session) return children

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSending(true)
    setError('')
    try {
      await signIn(String(data.get('email')), String(data.get('password')))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="login-shell">
      <main className="login-page">
        <section className="login-card">
          <span className="login-card__icon"><LockKeyhole aria-hidden="true" /></span>
          <p className="eyebrow">Área da loja</p>
          <h1>Entre para continuar</h1>
          <p>Acesso restrito aos funcionários autorizados.</p>
          {error ? <Notice kind="error">{error}</Notice> : null}
          <form onSubmit={handleSubmit} className="form-stack">
            <Field label="E-mail" required>
              <input name="email" type="email" autoComplete="username" required />
            </Field>
            <Field label="Senha" required>
              <input name="password" type="password" autoComplete="current-password" required minLength={6} />
            </Field>
            <button className="button button--primary button--full" disabled={sending}>
              {sending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </section>
      </main>
      <AppFooter />
    </div>
  )
}
