import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Building2, ImagePlus, Save, Trash2 } from 'lucide-react'
import { useAdminContext } from '../components/AdminLayout'
import { Field, Notice, PageHeader } from '../components/ui'
import { saveShopSettings } from '../lib/data'
import { maskCpfCnpj, maskPhone, validateCnpj } from '../lib/validation'
import type { ShopSettings } from '../types'

export function SettingsPage() {
  const { shop, refreshShop } = useAdminContext()
  const [form, setForm] = useState<ShopSettings>(shop)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const update = (field: keyof ShopSettings, value: string | undefined) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Escolha uma imagem PNG ou JPG.')
      return
    }
    if (file.size > 1024 * 1024) {
      setError('A logomarca deve ter no máximo 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update('logoDataUrl', String(reader.result))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.nomeFantasia.trim()) {
      setError('Informe o nome fantasia da loja.')
      return
    }
    if (form.cnpj && !validateCnpj(form.cnpj)) {
      setError('Informe um CNPJ válido ou deixe o campo vazio.')
      return
    }
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await saveShopSettings(form)
      await refreshShop()
      setMessage('Dados da loja salvos com sucesso.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Área administrativa"
        title="Dados da loja"
        description="Essas informações identificam o formulário enviado ao comprador e o PDF auxiliar."
      />
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <form onSubmit={handleSubmit} className="settings-layout">
        <section className="card logo-card">
          <h2>Identidade visual</h2>
          <div className="logo-preview">
            {form.logoDataUrl ? <img src={form.logoDataUrl} alt="Prévia da logomarca" /> : <Building2 aria-hidden="true" />}
          </div>
          <label className="button button--secondary button--full file-button">
            <ImagePlus aria-hidden="true" /> Escolher logomarca
            <input type="file" accept="image/png,image/jpeg" onChange={handleLogo} />
          </label>
          {form.logoDataUrl ? (
            <button type="button" className="button button--ghost button--full" onClick={() => update('logoDataUrl', undefined)}>
              <Trash2 aria-hidden="true" /> Remover imagem
            </button>
          ) : null}
          <small>PNG ou JPG, preferencialmente com fundo transparente. Máximo de 1 MB.</small>
        </section>

        <section className="card form-card settings-form">
          <h2>Informações da empresa</h2>
          <div className="form-grid">
            <Field label="Nome fantasia" required>
              <input value={form.nomeFantasia} onChange={(event) => update('nomeFantasia', event.target.value.slice(0, 100))} required maxLength={100} />
            </Field>
            <Field label="Razão social">
              <input value={form.razaoSocial} onChange={(event) => update('razaoSocial', event.target.value.slice(0, 140))} maxLength={140} />
            </Field>
            <Field label="CNPJ" hint="Aceita o formato numérico e o novo formato alfanumérico.">
              <input value={form.cnpj} onChange={(event) => update('cnpj', maskCpfCnpj(event.target.value))} autoCapitalize="characters" maxLength={18} />
            </Field>
            <Field label="Telefone">
              <input value={form.telefone} onChange={(event) => update('telefone', maskPhone(event.target.value))} inputMode="numeric" maxLength={15} />
            </Field>
            <Field label="WhatsApp">
              <input value={form.whatsapp} onChange={(event) => update('whatsapp', maskPhone(event.target.value))} inputMode="numeric" maxLength={15} />
            </Field>
            <Field label="E-mail">
              <input value={form.email} onChange={(event) => update('email', event.target.value.toLocaleLowerCase('pt-BR').slice(0, 160))} type="email" inputMode="email" maxLength={160} />
            </Field>
            <Field label="Endereço" hint="Use uma identificação curta para o cabeçalho.">
              <input value={form.endereco} onChange={(event) => update('endereco', event.target.value.slice(0, 160))} maxLength={160} placeholder="Fortaleza - CE" />
            </Field>
          </div>
          <div className="form-actions form-actions--end">
            <button className="button button--primary" disabled={saving}>
              <Save aria-hidden="true" /> {saving ? 'Salvando…' : 'Salvar configurações'}
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}
