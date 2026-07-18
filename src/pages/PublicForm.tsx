import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { Field, Loading, Notice } from '../components/ui'
import { findAddressByCep, listCitiesByState, listStates } from '../lib/api'
import { expirationText } from '../lib/date'
import { getPublicRequest, submitPublicRequest } from '../lib/data'
import {
  buyerSchema,
  formatCurrency,
  maskCep,
  maskCnpj,
  maskCpf,
  maskPhone,
  onlyDigits,
  titleCasePtBr,
  validateCnpj,
  validateCpf,
} from '../lib/validation'
import type { BuyerData, IbgeCity, IbgeState, PublicRequestView } from '../types'

type DocumentType = 'cpf' | 'cnpj'

const FALLBACK_STATES: IbgeState[] = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
  ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
  ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
].map(([sigla, nome], index) => ({ id: index + 1, sigla, nome }))

const initialBuyer: BuyerData = {
  cpfCnpj: '',
  emailComprador: '',
  nomeCompleto: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: 'CE',
  complemento: '',
  whatsapp: '',
  aceitePrivacidade: false,
}

const stepFields: Record<number, Array<keyof BuyerData>> = {
  1: ['cpfCnpj', 'emailComprador', 'nomeCompleto', 'whatsapp'],
  2: ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'],
  3: ['aceitePrivacidade'],
}

export function PublicForm() {
  const { token = '' } = useParams()
  const [request, setRequest] = useState<PublicRequestView | null>(null)
  const [form, setForm] = useState<BuyerData>(initialBuyer)
  const [documentType, setDocumentType] = useState<DocumentType>('cpf')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof BuyerData, string>>>({})
  const [states, setStates] = useState<IbgeState[]>(FALLBACK_STATES)
  const [cities, setCities] = useState<IbgeCity[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepNotice, setCepNotice] = useState<{ kind: 'success' | 'warning'; text: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [, setClockTick] = useState(0)

  useEffect(() => {
    void getPublicRequest(token)
      .then(setRequest)
      .catch((reason) => setLoadError(reason instanceof Error ? reason.message : 'Link indisponível.'))
      .finally(() => setLoading(false))
    void listStates().then(setStates).catch(() => setStates(FALLBACK_STATES))
  }, [token])

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick((value) => value + 1), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (request?.shop.nomeFantasia) document.title = `${request.shop.nomeFantasia} — Formulário ATPV`
  }, [request?.shop.nomeFantasia])

  useEffect(() => {
    if (!form.uf) return
    setCitiesLoading(true)
    void listCitiesByState(form.uf)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false))
  }, [form.uf])

  const update = <Key extends keyof BuyerData>(field: Key, value: BuyerData[Key]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const selectDocumentType = (type: DocumentType) => {
    setDocumentType(type)
    update('cpfCnpj', '')
  }

  const validateStep = (currentStep: number): boolean => {
    const result = buyerSchema.safeParse(form)
    const relevant = new Set(stepFields[currentStep])
    const nextErrors: Partial<Record<keyof BuyerData, string>> = {}
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof BuyerData
        if (relevant.has(field) && !nextErrors[field]) nextErrors[field] = issue.message
      })
    }
    if (currentStep === 1) {
      const validDocument = documentType === 'cpf' ? validateCpf(form.cpfCnpj) : validateCnpj(form.cpfCnpj)
      if (!validDocument) nextErrors.cpfCnpj = `Informe um ${documentType === 'cpf' ? 'CPF' : 'CNPJ'} válido.`
    }
    setErrors((current) => ({ ...current, ...nextErrors }))
    return Object.keys(nextErrors).length === 0
  }

  const goNext = () => {
    if (!validateStep(step)) return
    setStep((current) => Math.min(3, current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStep((current) => Math.max(1, current - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const lookupCep = async () => {
    if (form.cep.replace(/\D/g, '').length !== 8) {
      setErrors((current) => ({ ...current, cep: 'Informe os 8 números do CEP.' }))
      return
    }
    setCepLoading(true)
    setCepNotice(null)
    try {
      const address = await findAddressByCep(form.cep)
      if (!address) {
        setCepNotice({ kind: 'warning', text: 'CEP não encontrado. Você pode preencher o endereço manualmente e continuar.' })
        return
      }
      setForm((current) => ({
        ...current,
        cep: maskCep(address.cep),
        logradouro: titleCasePtBr(address.logradouro) || current.logradouro,
        bairro: titleCasePtBr(address.bairro) || current.bairro,
        cidade: titleCasePtBr(address.localidade) || current.cidade,
        uf: address.uf || current.uf,
        complemento: current.complemento || titleCasePtBr(address.complemento),
      }))
      setCepNotice({ kind: 'success', text: 'Endereço encontrado. Confira e edite o que for necessário.' })
    } catch {
      setCepNotice({ kind: 'warning', text: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.' })
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) return
    const result = buyerSchema.safeParse(form)
    if (!result.success) {
      const nextErrors: Partial<Record<keyof BuyerData, string>> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof BuyerData
        if (!nextErrors[field]) nextErrors[field] = issue.message
      })
      setErrors(nextErrors)
      setStep(1)
      return
    }

    setSending(true)
    try {
      await submitPublicRequest(token, {
        ...result.data,
        nomeCompleto: titleCasePtBr(result.data.nomeCompleto),
        logradouro: titleCasePtBr(result.data.logradouro),
        bairro: titleCasePtBr(result.data.bairro),
        cidade: titleCasePtBr(result.data.cidade),
        complemento: titleCasePtBr(result.data.complemento),
      })
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : 'Não foi possível enviar os dados.')
    } finally {
      setSending(false)
    }
  }

  const progress = useMemo(() => `${Math.round((step / 3) * 100)}%`, [step])

  if (loading) return <div className="public-result-page"><div className="public-center"><Loading label="Abrindo formulário seguro…" /></div><AppFooter /></div>
  if (loadError && !request) {
    return (
      <div className="public-result-page">
        <main className="public-center">
          <section className="result-card result-card--error">
            <span><Clock3 aria-hidden="true" /></span>
            <h1>Link indisponível</h1>
            <p>{loadError}</p>
            <small>Entre em contato com a loja para receber um novo link.</small>
          </section>
        </main>
        <AppFooter />
      </div>
    )
  }
  if (!request) return null
  if (sent) {
    return (
      <div className="public-result-page">
        <main className="public-center">
          <section className="result-card">
            <span><CheckCircle2 aria-hidden="true" /></span>
            <p className="eyebrow">Tudo certo</p>
            <h1>Dados enviados!</h1>
            <p>A equipe da {request.shop.nomeFantasia} já pode conferir suas informações.</p>
            <div className="result-code"><small>Código de acompanhamento</small><strong>{request.codigo}</strong></div>
            <Notice>Você já pode fechar esta página. Não é necessário enviar os dados novamente.</Notice>
          </section>
        </main>
        <AppFooter />
      </div>
    )
  }

  return (
    <main className="public-page">
      <header className="public-brand">
        <div className="public-brand__identity">
          {request.shop.logoDataUrl ? <img src={request.shop.logoDataUrl} alt="" /> : <span aria-hidden="true">A</span>}
          <div><strong>{request.shop.nomeFantasia}</strong><small>{request.shop.telefone || request.shop.whatsapp}</small></div>
        </div>
        <div className="expiry"><Clock3 aria-hidden="true" /> {expirationText(request.expiresAt)}</div>
      </header>

      <section className="public-intro">
        <span className="public-intro__icon"><FileCheck2 aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">Formulário auxiliar</p>
          <h1>Preencha seus dados para a ATPV</h1>
          <p>Leva poucos minutos. No final, você poderá conferir tudo antes de enviar.</p>
        </div>
      </section>

      <section className="progress-card" aria-label={`Etapa ${step} de 3`}>
        <div className="progress-card__labels"><span>Etapa {step} de 3</span><strong>{step === 1 ? 'Seus dados' : step === 2 ? 'Endereço' : 'Conferência'}</strong></div>
        <div className="progress-track"><span style={{ width: progress }} /></div>
      </section>

      <section className="public-form-card">
        {loadError ? <Notice kind="error">{loadError}</Notice> : null}
        {step === 1 ? (
          <div className="form-step">
            <div className="form-step__title"><span>1</span><div><h2>Seus dados</h2><p>Informe os dados do comprador do veículo.</p></div></div>
            <div className="form-stack">
              <div className={`field ${errors.cpfCnpj ? 'field--error' : ''}`}>
                <span className="field__label" id="document-label">CPF ou CNPJ <span aria-hidden="true">*</span></span>
                <div className="document-field">
                  <div className="document-toggle" role="group" aria-label="Tipo de documento">
                    <button type="button" className={documentType === 'cpf' ? 'active' : ''} onClick={() => selectDocumentType('cpf')} aria-pressed={documentType === 'cpf'}>CPF</button>
                    <button type="button" className={documentType === 'cnpj' ? 'active' : ''} onClick={() => selectDocumentType('cnpj')} aria-pressed={documentType === 'cnpj'}>CNPJ</button>
                  </div>
                <input
                  aria-labelledby="document-label"
                  aria-invalid={Boolean(errors.cpfCnpj)}
                  value={form.cpfCnpj}
                  onChange={(event) => update('cpfCnpj', documentType === 'cpf' ? maskCpf(event.target.value) : maskCnpj(event.target.value))}
                  type={documentType === 'cpf' ? 'tel' : 'text'}
                  inputMode={documentType === 'cpf' ? 'numeric' : 'text'}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  required
                  autoFocus
                />
                </div>
                {errors.cpfCnpj ? <span className="field__error">{errors.cpfCnpj}</span> : null}
                {!errors.cpfCnpj ? <span className="field__hint">{documentType === 'cnpj' ? 'O novo CNPJ pode conter letras e números nos 12 primeiros caracteres.' : 'Digite somente os 11 números do CPF.'}</span> : null}
              </div>
              <Field label="Nome completo" error={errors.nomeCompleto} required>
                <input
                  value={form.nomeCompleto}
                  onChange={(event) => update('nomeCompleto', event.target.value.slice(0, 120))}
                  onBlur={() => update('nomeCompleto', titleCasePtBr(form.nomeCompleto))}
                  autoComplete="name"
                  placeholder="Nome completo do comprador"
                  maxLength={120}
                />
              </Field>
              <Field label="E-mail" error={errors.emailComprador} required>
                <input
                  value={form.emailComprador}
                  onChange={(event) => update('emailComprador', event.target.value.toLocaleLowerCase('pt-BR').slice(0, 160))}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  maxLength={160}
                />
              </Field>
              <Field label="WhatsApp com DDD+" error={errors.whatsapp} required>
                <input
                  value={form.whatsapp}
                  onChange={(event) => update('whatsapp', maskPhone(event.target.value))}
                  type="number"
                  inputMode="tel"
                  autoCorrect="off"
                  pattern="[0-9]*"
                  spellCheck={false}
                  autoComplete="tel"
                  placeholder="(85) 99999-9999"
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-step">
            <div className="form-step__title"><span>2</span><div><h2>Seu endereço</h2><p>Consulte pelo CEP ou preencha manualmente.</p></div></div>
            <div className="form-stack">
              <Field label="CEP" error={errors.cep} required>
                <div className="input-action">
                  <input
                    value={form.cep}
                    onChange={(event) => { update('cep', maskCep(event.target.value)); setCepNotice(null) }}
                    onBlur={() => { if (form.cep.replace(/\D/g, '').length === 8 && !cepNotice) void lookupCep() }}
                    type="tel"
                    inputMode="numeric"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    autoFocus
                  />
                  <button type="button" onClick={() => void lookupCep()} disabled={cepLoading} aria-label="Consultar CEP">
                    {cepLoading ? <LoaderCircle className="spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
                  </button>
                </div>
              </Field>
              {cepNotice ? <Notice kind={cepNotice.kind}>{cepNotice.text}</Notice> : null}
              <div className="form-grid form-grid--address">
                <Field label="Logradouro" error={errors.logradouro} required>
                  <input value={form.logradouro} onChange={(event) => update('logradouro', event.target.value.slice(0, 120))} onBlur={() => update('logradouro', titleCasePtBr(form.logradouro))} autoComplete="address-line1" maxLength={120} />
                </Field>
                <Field label="Número" error={errors.numero} required>
                  <input value={form.numero} onChange={(event) => update('numero', onlyDigits(event.target.value).slice(0, 10))} inputMode="numeric" placeholder="Somente números" maxLength={10} />
                </Field>
                <Field label="Bairro" error={errors.bairro} required>
                  <input value={form.bairro} onChange={(event) => update('bairro', event.target.value.slice(0, 80))} onBlur={() => update('bairro', titleCasePtBr(form.bairro))} maxLength={80} />
                </Field>
                <Field label="Complemento" error={errors.complemento}>
                  <input value={form.complemento} onChange={(event) => update('complemento', event.target.value.slice(0, 80))} onBlur={() => update('complemento', titleCasePtBr(form.complemento))} placeholder="Apto, bloco, casa…" maxLength={80} />
                </Field>
                <Field label="UF" error={errors.uf} required>
                  <select value={form.uf} onChange={(event) => { update('uf', event.target.value); update('cidade', '') }}>
                    <option value="">Selecione</option>
                    {states.map((state) => <option key={state.sigla} value={state.sigla}>{state.sigla} — {state.nome}</option>)}
                  </select>
                </Field>
                <Field label="Cidade" error={errors.cidade} required hint={citiesLoading ? 'Carregando municípios…' : 'Escolha na lista ou digite a cidade.'}>
                  <input
                    value={form.cidade}
                    onChange={(event) => update('cidade', event.target.value.slice(0, 80))}
                    onBlur={() => update('cidade', titleCasePtBr(form.cidade))}
                    list="municipios-list"
                    autoComplete="address-level2"
                    maxLength={80}
                  />
                  <datalist id="municipios-list">
                    {cities.map((city) => <option value={city.nome} key={city.id} />)}
                  </datalist>
                </Field>
              </div>
              <Notice><MapPin aria-hidden="true" size={18} /> Todos os campos continuam editáveis mesmo após a consulta do CEP.</Notice>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-step">
            <div className="form-step__title"><span>3</span><div><h2>Confira antes de enviar</h2><p>Se algo estiver errado, volte e corrija.</p></div></div>
            <div className="review-section">
              <div className="review-block"><h3>Negociação</h3><dl><div><dt>Valor</dt><dd>{formatCurrency(request.valorVendaCentavos)}</dd></div><div><dt>Vendedor</dt><dd>{request.emailVendedor}</dd></div></dl></div>
              <div className="review-block"><h3>Comprador</h3><dl><div><dt>Nome</dt><dd>{form.nomeCompleto}</dd></div><div><dt>{documentType === 'cpf' ? 'CPF' : 'CNPJ'}</dt><dd>{form.cpfCnpj}</dd></div><div><dt>E-mail</dt><dd>{form.emailComprador}</dd></div><div><dt>WhatsApp</dt><dd>{form.whatsapp}</dd></div></dl></div>
              <div className="review-block"><h3>Endereço</h3><p>{form.logradouro}, {form.numero}{form.complemento ? `, ${form.complemento}` : ''}<br />{form.bairro} — {form.cidade}/{form.uf}<br />CEP {form.cep}</p></div>
            </div>
            <label className={`consent-box ${errors.aceitePrivacidade ? 'consent-box--error' : ''}`}>
              <input type="checkbox" checked={form.aceitePrivacidade} onChange={(event) => update('aceitePrivacidade', event.target.checked)} />
              <span><span className="consent-box__check"><Check aria-hidden="true" /></span><span><strong>Confirmo que conferi os dados acima.</strong><small>Marque esta opção para confirmar que os dados estão corretos e continuar.</small><small>Estou ciente de que serão usados pela loja para preparar o formulário auxiliar da ATPV.</small></span></span>
            </label>
            {errors.aceitePrivacidade ? <span className="standalone-error">{errors.aceitePrivacidade}</span> : null}
            <Notice kind="warning">Esta confirmação não é uma assinatura digital e não emite a ATPV-e oficial.</Notice>
          </div>
        ) : null}

        <div className="public-actions">
          {step > 1 ? <button className="button button--secondary" type="button" onClick={goBack}><ArrowLeft aria-hidden="true" /> Voltar</button> : <span />}
          {step < 3 ? <button className="button button--primary" type="button" onClick={goNext}>Continuar <ArrowRight aria-hidden="true" /></button> : null}
          {step === 3 ? <button className="button button--primary" type="button" onClick={() => void handleSubmit()} disabled={sending}>{sending ? <><LoaderCircle className="spin" /> Enviando…</> : <><Check aria-hidden="true" /> Confirmar e enviar</>}</button> : null}
        </div>
      </section>

      <footer className="public-footer">
        <ShieldCheck aria-hidden="true" /> Seus dados são usados somente para preparar o formulário solicitado.
      </footer>
      <AppFooter />
    </main>
  )
}
