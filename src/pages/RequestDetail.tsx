import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  Link2,
  Printer,
  RotateCw,
  Send,
  Share2,
  XCircle,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Notice, Loading, PageHeader, StatusBadge } from '../components/ui'
import { useAdminContext } from '../components/AdminLayout'
import { formatDateTime, expirationText } from '../lib/date'
import {
  approveRequest,
  buildPublicLink,
  cancelRequest,
  listRequests,
  renewRequestLink,
} from '../lib/data'
import { downloadBlob, generateAtpvPdf, pdfFileName, printPdf, sharePdf } from '../lib/pdf'
import { formatCurrency } from '../lib/validation'
import type { AtpvRequest } from '../types'

export function RequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { shop } = useAdminContext()
  const createdRequest = (location.state as { createdRequest?: AtpvRequest } | null)?.createdRequest
  const [request, setRequest] = useState<AtpvRequest | null>(createdRequest ?? null)
  const [publicLink, setPublicLink] = useState(createdRequest ? buildPublicLink(createdRequest) : '')
  const [loading, setLoading] = useState(!createdRequest)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const loadRequest = async () => {
    const requests = await listRequests()
    const found = requests.find((item) => item.id === id)
    if (!found) throw new Error('Solicitação não encontrada.')
    setRequest(found)
    if (found.token) setPublicLink(buildPublicLink(found))
  }

  useEffect(() => {
    void loadRequest()
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Falha ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  const generateLink = async () => {
    if (!request) return
    setBusy('link')
    setError('')
    try {
      const renewed = await renewRequestLink(request.id)
      setRequest(renewed)
      setPublicLink(buildPublicLink(renewed))
      setMessage('Novo link criado. Ele expira em uma hora.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível gerar o link.')
    } finally {
      setBusy('')
    }
  }

  const copyLink = async () => {
    if (!publicLink) return
    await navigator.clipboard.writeText(publicLink)
    setMessage('Link copiado. Agora é só colar no WhatsApp.')
  }

  const shareLink = async () => {
    if (!publicLink) return
    if (navigator.share) {
      await navigator.share({
        title: `Formulário ${request?.codigo}`,
        text: 'Olá! Preencha seus dados para o formulário auxiliar da ATPV. O link expira em uma hora.',
        url: publicLink,
      })
      return
    }
    await copyLink()
  }

  const handleApprove = async () => {
    if (!request) return
    setBusy('approve')
    try {
      await approveRequest(request.id)
      await loadRequest()
      setMessage('Dados aprovados. O PDF já pode ser exportado.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível aprovar.')
    } finally {
      setBusy('')
    }
  }

  const handlePdf = async (action: 'download' | 'share' | 'print') => {
    if (!request) return
    setBusy(action)
    setError('')
    try {
      const blob = await generateAtpvPdf(request, shop)
      const fileName = pdfFileName(request)
      if (action === 'download') downloadBlob(blob, fileName)
      if (action === 'print') printPdf(blob)
      if (action === 'share') {
        const shared = await sharePdf(blob, fileName)
        if (!shared) {
          downloadBlob(blob, fileName)
          setMessage('O navegador não compartilha arquivos diretamente. O PDF foi baixado para você anexá-lo.')
        }
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      setError(reason instanceof Error ? reason.message : 'Não foi possível gerar o PDF.')
    } finally {
      setBusy('')
    }
  }

  const handleCancel = async () => {
    if (!request || !window.confirm('Cancelar esta solicitação e invalidar o link?')) return
    setBusy('cancel')
    try {
      await cancelRequest(request.id)
      navigate('/')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível cancelar.')
      setBusy('')
    }
  }

  if (loading) return <Loading label="Carregando solicitação…" />
  if (!request) {
    return <div className="page"><Notice kind="error">{error || 'Solicitação não encontrada.'}</Notice></div>
  }

  const canCreateLink = ['aguardando', 'expirado'].includes(request.status)
  const canGeneratePdf = ['recebido', 'aprovado'].includes(request.status) && Boolean(request.buyer)

  return (
    <div className="page">
      <Link to="/" className="back-link"><ArrowLeft aria-hidden="true" /> Voltar ao painel</Link>
      <PageHeader
        eyebrow={request.codigo}
        title={request.buyer?.nomeCompleto ?? 'Solicitação aguardando preenchimento'}
        description={`Criada em ${formatDateTime(request.createdAt)} · Horário de Fortaleza`}
        actions={<StatusBadge status={request.status} />}
      />

      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {canCreateLink ? (
        <section className="card link-card">
          <div className="section-title">
            <span className="section-title__icon"><Link2 aria-hidden="true" /></span>
            <div><h2>Link do comprador</h2><p>{expirationText(request.expiresAt)}</p></div>
          </div>
          {publicLink && request.status === 'aguardando' ? (
            <>
              <div className="share-link">
                <input value={publicLink} readOnly aria-label="Link temporário do formulário" />
                <button className="button button--secondary" onClick={() => void copyLink()}>
                  <Clipboard aria-hidden="true" /> Copiar
                </button>
              </div>
              <div className="button-row">
                <button className="button button--primary" onClick={() => void shareLink()}>
                  <Send aria-hidden="true" /> Enviar link
                </button>
                <a className="button button--ghost" href={publicLink} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" /> Abrir formulário
                </a>
                <button className="button button--ghost" onClick={() => void generateLink()} disabled={busy === 'link'}>
                  <RotateCw aria-hidden="true" /> Renovar por 1 hora
                </button>
              </div>
            </>
          ) : (
            <div className="inline-action">
              <p>{request.status === 'expirado' ? 'O link anterior expirou.' : 'Gere um link temporário para compartilhar.'}</p>
              <button className="button button--primary" onClick={() => void generateLink()} disabled={busy === 'link'}>
                <Link2 aria-hidden="true" /> {busy === 'link' ? 'Gerando…' : 'Gerar novo link'}
              </button>
            </div>
          )}
        </section>
      ) : null}

      <div className="detail-grid">
        <section className="card">
          <div className="card__header card__header--compact"><div><h2>Negociação</h2><p>Dados informados pela loja</p></div></div>
          <dl className="detail-list">
            <div><dt>Valor da venda</dt><dd>{formatCurrency(request.valorVendaCentavos)}</dd></div>
            <div><dt>E-mail do vendedor</dt><dd>{request.emailVendedor}</dd></div>
            <div><dt>Validade do link</dt><dd>{formatDateTime(request.expiresAt)}</dd></div>
          </dl>
        </section>

        <section className="card">
          <div className="card__header card__header--compact"><div><h2>Comprador</h2><p>Dados confirmados pelo cliente</p></div></div>
          {request.buyer ? (
            <dl className="detail-list">
              <div><dt>Nome completo</dt><dd>{request.buyer.nomeCompleto}</dd></div>
              <div><dt>CPF/CNPJ</dt><dd>{request.buyer.cpfCnpj}</dd></div>
              <div><dt>E-mail</dt><dd>{request.buyer.emailComprador}</dd></div>
              <div><dt>WhatsApp</dt><dd>{request.buyer.whatsapp}</dd></div>
              <div className="detail-list__wide"><dt>Endereço</dt><dd>{request.buyer.logradouro}, {request.buyer.numero}{request.buyer.complemento ? `, ${request.buyer.complemento}` : ''} — {request.buyer.bairro}, {request.buyer.cidade}/{request.buyer.uf} — CEP {request.buyer.cep}</dd></div>
              {request.submittedAt ? <div><dt>Confirmado em</dt><dd>{formatDateTime(request.submittedAt)}</dd></div> : null}
            </dl>
          ) : <p className="muted-copy">Os dados aparecerão aqui depois do envio do formulário.</p>}
        </section>
      </div>

      {request.status === 'recebido' ? (
        <section className="card approval-card">
          <div><h2>Conferência da loja</h2><p>Revise os dados acima antes de aprovar.</p></div>
          <button className="button button--primary" onClick={() => void handleApprove()} disabled={busy === 'approve'}>
            <CheckCircle2 aria-hidden="true" /> {busy === 'approve' ? 'Aprovando…' : 'Aprovar dados'}
          </button>
        </section>
      ) : null}

      {canGeneratePdf ? (
        <section className="card export-card">
          <div><h2>PDF auxiliar</h2><p>Gere novamente sempre que precisar.</p></div>
          <div className="button-row">
            <button className="button button--primary" onClick={() => void handlePdf('download')} disabled={Boolean(busy)}><Download aria-hidden="true" /> Baixar PDF</button>
            <button className="button button--secondary" onClick={() => void handlePdf('share')} disabled={Boolean(busy)}><Share2 aria-hidden="true" /> Compartilhar</button>
            <button className="button button--secondary" onClick={() => void handlePdf('print')} disabled={Boolean(busy)}><Printer aria-hidden="true" /> Imprimir</button>
          </div>
        </section>
      ) : null}

      {['aguardando', 'expirado'].includes(request.status) ? (
        <button className="danger-link" onClick={() => void handleCancel()} disabled={busy === 'cancel'}>
          <XCircle aria-hidden="true" /> Cancelar solicitação
        </button>
      ) : null}
    </div>
  )
}
