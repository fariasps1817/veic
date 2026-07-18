import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, FilePlus2, Inbox, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '../lib/date'
import { listRequests } from '../lib/data'
import { formatCurrency, onlyDigits } from '../lib/validation'
import type { AtpvRequest } from '../types'
import { Loading, Notice, PageHeader, StatusBadge } from '../components/ui'

export function Dashboard() {
  const [requests, setRequests] = useState<AtpvRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    void listRequests()
      .then(setRequests)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Falha ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    const digits = onlyDigits(query)
    if (!normalized) return requests
    return requests.filter((request) => {
      const haystack = [
        request.codigo,
        request.buyer?.nomeCompleto,
        request.buyer?.cpfCnpj,
        request.buyer?.emailComprador,
      ].join(' ').toLocaleLowerCase('pt-BR')
      return haystack.includes(normalized) || (digits && onlyDigits(haystack).includes(digits))
    })
  }, [query, requests])

  const received = requests.filter((request) => request.status === 'recebido').length
  const waiting = requests.filter((request) => request.status === 'aguardando').length
  const approved = requests.filter((request) => request.status === 'aprovado').length

  return (
    <div className="page">
      <PageHeader
        eyebrow="Visão geral"
        title="Solicitações de ATPV"
        description="Acompanhe os formulários enviados e gere os PDFs auxiliares."
        actions={
          <Link className="button button--primary" to="/nova">
            <FilePlus2 aria-hidden="true" /> Nova ATPV
          </Link>
        }
      />

      <section className="stats-grid" aria-label="Resumo das solicitações">
        <article className="stat-card stat-card--attention"><span>Para conferir</span><strong>{received}</strong></article>
        <article className="stat-card"><span>Aguardando cliente</span><strong>{waiting}</strong></article>
        <article className="stat-card"><span>Aprovadas</span><strong>{approved}</strong></article>
      </section>

      {error ? <Notice kind="error">{error}</Notice> : null}

      <section className="card requests-card">
        <div className="card__header">
          <div>
            <h2>Formulários</h2>
            <p>{requests.length} {requests.length === 1 ? 'solicitação cadastrada' : 'solicitações cadastradas'}</p>
          </div>
          <label className="search-box">
            <Search aria-hidden="true" size={18} />
            <span className="sr-only">Pesquisar solicitação</span>
            <input
              type="search"
              placeholder="Nome, CPF/CNPJ ou código"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {loading ? <Loading label="Carregando solicitações…" /> : null}
        {!loading && filtered.length === 0 ? (
          <div className="empty-state">
            <span><Inbox aria-hidden="true" /></span>
            <h3>{requests.length ? 'Nenhum resultado encontrado' : 'Nenhuma solicitação ainda'}</h3>
            <p>{requests.length ? 'Tente pesquisar por outro termo.' : 'Crie a primeira solicitação para gerar um link temporário.'}</p>
            {!requests.length ? <Link className="button button--primary" to="/nova">Criar solicitação</Link> : null}
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <div className="request-list">
            {filtered.map((request) => (
              <Link to={`/solicitacoes/${request.id}`} className="request-row" key={request.id}>
                <div className="request-row__main">
                  <span className="request-row__code">{request.codigo}</span>
                  <strong>{request.buyer?.nomeCompleto ?? 'Aguardando dados do comprador'}</strong>
                  <small>Criada em {formatDateTime(request.createdAt)}</small>
                </div>
                <div className="request-row__value">
                  <span>{formatCurrency(request.valorVendaCentavos)}</span>
                  <StatusBadge status={request.status} />
                </div>
                <ArrowRight aria-hidden="true" className="request-row__arrow" />
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
