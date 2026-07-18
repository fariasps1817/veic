import { useState, type FormEvent } from 'react'
import { ArrowLeft, Link2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, Notice, PageHeader } from '../components/ui'
import { createRequest } from '../lib/data'
import { moneyInputMask, moneyMaskToCents } from '../lib/validation'

export function NewRequest() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const cents = moneyMaskToCents(value)
    if (cents < 100) {
      setError('Informe um valor de venda válido.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Informe um e-mail válido para o vendedor.')
      return
    }

    setSending(true)
    setError('')
    try {
      const request = await createRequest({ valorVendaCentavos: cents, emailVendedor: email })
      navigate(`/solicitacoes/${request.id}`, { state: { createdRequest: request } })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar a solicitação.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page page--narrow">
      <Link to="/" className="back-link"><ArrowLeft aria-hidden="true" /> Voltar ao painel</Link>
      <PageHeader
        eyebrow="Nova solicitação"
        title="Gerar link para o comprador"
        description="O link ficará disponível por uma hora. O comprador preencherá os dados no próprio celular."
      />

      <section className="card form-card">
        <div className="form-card__icon"><Link2 aria-hidden="true" /></div>
        <h2>Dados da negociação</h2>
        <p>Essas informações aparecerão para conferência no formulário do comprador.</p>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <form onSubmit={handleSubmit} className="form-stack">
          <Field label="Valor da venda" required hint="Digite também os centavos. Ex.: 3000000 para R$ 30.000,00.">
            <input
              value={value}
              onChange={(event) => setValue(moneyInputMask(event.target.value))}
              inputMode="numeric"
              placeholder="R$ 0,00"
              autoFocus
              required
            />
          </Field>
          <Field label="E-mail do vendedor" required>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value.toLocaleLowerCase('pt-BR').slice(0, 160))}
              type="email"
              inputMode="email"
              placeholder="vendedor@loja.com.br"
              autoComplete="email"
              maxLength={160}
              required
            />
          </Field>
          <Notice>Depois de criar, você poderá copiar o link ou enviá-lo pelo WhatsApp.</Notice>
          <div className="form-actions">
            <Link to="/" className="button button--secondary">Cancelar</Link>
            <button className="button button--primary" disabled={sending}>
              {sending ? 'Criando…' : 'Criar link de 1 hora'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
