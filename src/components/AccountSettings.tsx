import { useEffect, useState, type FormEvent } from 'react'
import { KeyRound, RefreshCw, UserPlus, Users } from 'lucide-react'
import { createShopUser, getCurrentShopRole, listShopUsers } from '../lib/data'
import { formatDateTime } from '../lib/date'
import { changeCurrentPassword } from '../lib/supabase'
import type { ShopUser, ShopUserRole } from '../types'
import { Field, Loading, Notice } from './ui'

function isStrongPassword(value: string): boolean {
  return value.length >= 10
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value)
}

export function UserManagement() {
  const [role, setRole] = useState<ShopUserRole | null>(null)
  const [users, setUsers] = useState<ShopUser[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newRole, setNewRole] = useState<ShopUserRole>('operador')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const currentRole = await getCurrentShopRole()
      setRole(currentRole)
      if (currentRole === 'administrador') setUsers(await listShopUsers())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Informe um e-mail válido.')
      return
    }
    if (!isStrongPassword(password)) {
      setError('A senha temporária deve ter ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo.')
      return
    }

    setSaving(true)
    try {
      const user = await createShopUser({ email, password, role: newRole })
      setUsers((current) => [...current, user])
      setEmail('')
      setPassword('')
      setNewRole('operador')
      setMessage('Usuário criado. Envie a ele o e-mail e a senha temporária por um meio seguro.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card account-card">
      <div className="account-card__title">
        <span><Users aria-hidden="true" /></span>
        <div>
          <h2>Usuários do sistema</h2>
          <p>Cadastre quem poderá acessar a área administrativa.</p>
        </div>
      </div>

      {loading ? <Loading label="Carregando usuários…" /> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}

      {!loading && role !== 'administrador' ? (
        <Notice>Somente um administrador pode visualizar e cadastrar usuários.</Notice>
      ) : null}

      {!loading && role === 'administrador' ? (
        <>
          <div className="user-list" aria-label="Usuários cadastrados">
            {users.map((user) => (
              <div className="user-row" key={user.id}>
                <div>
                  <strong>{user.email}</strong>
                  <small>Cadastrado em {formatDateTime(user.createdAt)}</small>
                </div>
                <span className={`role-badge role-badge--${user.role}`}>
                  {user.role === 'administrador' ? 'Administrador' : 'Operador'}
                  {user.isCurrent ? ' · você' : ''}
                </span>
              </div>
            ))}
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <h3><UserPlus aria-hidden="true" /> Novo usuário</h3>
            <Field label="E-mail" required>
              <input
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value.toLocaleLowerCase('pt-BR').slice(0, 160))}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Senha temporária" required hint="Mínimo de 10 caracteres, com maiúscula, minúscula, número e símbolo.">
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value.slice(0, 72))}
                minLength={10}
                maxLength={72}
                required
              />
            </Field>
            <Field label="Perfil de acesso" required>
              <select value={newRole} onChange={(event) => setNewRole(event.target.value as ShopUserRole)}>
                <option value="operador">Operador — solicitações e PDFs</option>
                <option value="administrador">Administrador — acesso também às configurações</option>
              </select>
            </Field>
            <div className="form-actions form-actions--end">
              <button className="button button--primary" disabled={saving}>
                <UserPlus aria-hidden="true" /> {saving ? 'Cadastrando…' : 'Cadastrar usuário'}
              </button>
              <button className="button button--ghost" type="button" onClick={() => void load()} disabled={saving}>
                <RefreshCw aria-hidden="true" /> Atualizar lista
              </button>
            </div>
          </form>
        </>
      ) : null}
    </section>
  )
}

export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!isStrongPassword(newPassword)) {
      setError('A nova senha deve ter ao menos 10 caracteres, com maiúscula, minúscula, número e símbolo.')
      return
    }
    if (newPassword !== confirmation) {
      setError('A confirmação não corresponde à nova senha.')
      return
    }

    setSaving(true)
    try {
      await changeCurrentPassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setMessage('Senha alterada com sucesso.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível alterar a senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card account-card">
      <div className="account-card__title">
        <span><KeyRound aria-hidden="true" /></span>
        <div>
          <h2>Alterar minha senha</h2>
          <p>A alteração será aplicada ao usuário conectado.</p>
        </div>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      <form className="account-form" onSubmit={handleSubmit}>
        <Field label="Senha atual" required>
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        </Field>
        <Field label="Nova senha" required hint="Mínimo de 10 caracteres, com maiúscula, minúscula, número e símbolo.">
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value.slice(0, 72))} minLength={10} maxLength={72} required />
        </Field>
        <Field label="Confirmar nova senha" required>
          <input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value.slice(0, 72))} minLength={10} maxLength={72} required />
        </Field>
        <div className="form-actions form-actions--end">
          <button className="button button--primary" disabled={saving}>
            <KeyRound aria-hidden="true" /> {saving ? 'Alterando…' : 'Alterar senha'}
          </button>
        </div>
      </form>
    </section>
  )
}
