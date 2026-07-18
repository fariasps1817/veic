import type { AtpvRequest, BuyerData, PublicRequestView, RequestStatus, ShopBrand, ShopSettings, ShopUser, ShopUserRole } from '../types'
import { isDemoMode, supabase } from './supabase'

const REQUESTS_KEY = 'atpv-facil:solicitacoes:v1'
const SHOP_KEY = 'atpv-facil:loja:v1'
const USERS_KEY = 'atpv-facil:usuarios:v1'

const defaultShop: ShopSettings = {
  id: 'demo-shop',
  nomeFantasia: 'Sua Loja de Veículos',
  razaoSocial: '',
  cnpj: '',
  telefone: '(85) 3000-0000',
  whatsapp: '(85) 99999-0000',
  email: 'atendimento@sualoja.com.br',
  endereco: 'Fortaleza - CE',
}

function readLocalRequests(): AtpvRequest[] {
  try {
    const value = window.localStorage.getItem(REQUESTS_KEY)
    return value ? (JSON.parse(value) as AtpvRequest[]) : []
  } catch {
    return []
  }
}

function writeLocalRequests(requests: AtpvRequest[]): void {
  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests))
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function requestStatus(request: AtpvRequest): RequestStatus {
  if (request.status === 'aguardando' && Date.parse(request.expiresAt) <= Date.now()) return 'expirado'
  return request.status
}

function mapDatabaseRequest(row: Record<string, unknown>): AtpvRequest {
  return {
    id: String(row.id),
    codigo: String(row.codigo),
    valorVendaCentavos: Number(row.valor_venda_centavos),
    emailVendedor: String(row.email_vendedor),
    status: row.status as RequestStatus,
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
    buyer: row.dados_comprador as BuyerData | undefined,
  }
}

export async function getShopSettings(): Promise<ShopSettings> {
  if (isDemoMode || !supabase) {
    const stored = window.localStorage.getItem(SHOP_KEY)
    return stored ? (JSON.parse(stored) as ShopSettings) : defaultShop
  }

  const { data, error } = await supabase.from('shops').select('*').limit(1).single()
  if (error) throw new Error('Não foi possível carregar os dados da loja.')
  return {
    id: data.id,
    nomeFantasia: data.nome_fantasia,
    razaoSocial: data.razao_social ?? '',
    cnpj: data.cnpj ?? '',
    telefone: data.telefone ?? '',
    whatsapp: data.whatsapp ?? '',
    email: data.email ?? '',
    endereco: data.endereco ?? '',
    logoDataUrl: data.logo_data_url ?? undefined,
  }
}

export async function getPublicShopBrand(): Promise<ShopBrand> {
  if (isDemoMode || !supabase) {
    const stored = window.localStorage.getItem(SHOP_KEY)
    const shop = stored ? (JSON.parse(stored) as ShopSettings) : defaultShop
    return { nomeFantasia: shop.nomeFantasia, logoDataUrl: shop.logoDataUrl }
  }

  const { data, error } = await supabase.functions.invoke('get-public-shop-brand', { body: {} })
  if (error || !data?.nomeFantasia) throw new Error('Não foi possível carregar a identificação da loja.')
  return data as ShopBrand
}

export async function saveShopSettings(settings: ShopSettings): Promise<void> {
  if (isDemoMode || !supabase) {
    window.localStorage.setItem(SHOP_KEY, JSON.stringify(settings))
    return
  }

  const { error } = await supabase.from('shops').update({
    nome_fantasia: settings.nomeFantasia,
    razao_social: settings.razaoSocial,
    cnpj: settings.cnpj,
    telefone: settings.telefone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    endereco: settings.endereco,
    logo_data_url: settings.logoDataUrl ?? null,
  }).eq('id', settings.id)
  if (error) throw new Error('Não foi possível salvar os dados da loja.')
}

export async function getCurrentShopRole(): Promise<ShopUserRole> {
  if (isDemoMode || !supabase) return 'administrador'
  const { data, error } = await supabase.from('shop_members').select('role').limit(1).single()
  if (error || !data) throw new Error('Não foi possível identificar seu perfil de acesso.')
  return data.role as ShopUserRole
}

export async function listShopUsers(): Promise<ShopUser[]> {
  if (isDemoMode || !supabase) {
    const stored = window.localStorage.getItem(USERS_KEY)
    return stored ? (JSON.parse(stored) as ShopUser[]) : [{
      id: 'demo-user',
      email: 'administrador@demonstracao.local',
      role: 'administrador',
      createdAt: new Date().toISOString(),
      isCurrent: true,
    }]
  }

  const { data, error } = await supabase.functions.invoke('manage-shop-users', {
    body: { action: 'list' },
  })
  if (error || !data?.users) throw new Error('Não foi possível carregar os usuários da loja.')
  return data.users as ShopUser[]
}

export async function createShopUser(input: {
  email: string
  password: string
  role: ShopUserRole
}): Promise<ShopUser> {
  if (isDemoMode || !supabase) {
    const users = await listShopUsers()
    const user: ShopUser = {
      id: crypto.randomUUID(),
      email: input.email.trim().toLowerCase(),
      role: input.role,
      createdAt: new Date().toISOString(),
      isCurrent: false,
    }
    window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]))
    return user
  }

  const { data, error } = await supabase.functions.invoke('manage-shop-users', {
    body: { action: 'create', ...input },
  })
  if (error || !data?.user) throw new Error('Não foi possível cadastrar o usuário. Confira o e-mail e tente novamente.')
  return data.user as ShopUser
}

export async function listRequests(): Promise<AtpvRequest[]> {
  if (isDemoMode || !supabase) {
    const requests = readLocalRequests().map((request) => ({
      ...request,
      status: requestStatus(request),
    }))
    writeLocalRequests(requests)
    return requests.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }

  const { data, error } = await supabase
    .from('atpv_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error('Não foi possível carregar as solicitações.')
  return data.map(mapDatabaseRequest)
}

export async function createRequest(input: {
  valorVendaCentavos: number
  emailVendedor: string
}): Promise<AtpvRequest> {
  if (isDemoMode || !supabase) {
    const now = new Date()
    const request: AtpvRequest = {
      id: crypto.randomUUID(),
      codigo: `ATPV-${now.getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      token: randomToken(),
      valorVendaCentavos: input.valorVendaCentavos,
      emailVendedor: input.emailVendedor.trim().toLowerCase(),
      status: 'aguardando',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    }
    writeLocalRequests([request, ...readLocalRequests()])
    return request
  }

  const { data, error } = await supabase.functions.invoke('create-atpv-request', {
    body: input,
  })
  if (error) throw new Error('Não foi possível criar a solicitação.')
  return { ...mapDatabaseRequest(data.request), token: data.token }
}

export async function renewRequestLink(id: string): Promise<AtpvRequest> {
  if (isDemoMode || !supabase) {
    const requests = readLocalRequests()
    const index = requests.findIndex((request) => request.id === id)
    if (index < 0 || ['recebido', 'aprovado', 'cancelado'].includes(requests[index].status)) {
      throw new Error('Esta solicitação não pode receber um novo link.')
    }
    requests[index] = {
      ...requests[index],
      token: randomToken(),
      status: 'aguardando',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }
    writeLocalRequests(requests)
    return requests[index]
  }

  const { data, error } = await supabase.functions.invoke('renew-atpv-request', {
    body: { id },
  })
  if (error) throw new Error('Não foi possível gerar um novo link.')
  return { ...mapDatabaseRequest(data.request), token: data.token }
}

export async function getPublicRequest(token: string): Promise<PublicRequestView> {
  if (isDemoMode || !supabase) {
    const request = readLocalRequests().find((item) => item.token === token)
    if (!request) throw new Error('Este link não existe ou não está mais disponível.')
    const status = requestStatus(request)
    if (status !== 'aguardando') {
      throw new Error(status === 'expirado' ? 'Este link expirou. Solicite um novo link à loja.' : 'Este formulário já foi enviado.')
    }
    const shop = await getShopSettings()
    return {
      id: request.id,
      codigo: request.codigo,
      valorVendaCentavos: request.valorVendaCentavos,
      emailVendedor: request.emailVendedor,
      status,
      expiresAt: request.expiresAt,
      shop,
    }
  }

  const { data, error } = await supabase.functions.invoke('get-atpv-request', {
    body: { token },
  })
  if (error) throw new Error('Este link não existe, expirou ou já foi utilizado.')
  return data as PublicRequestView
}

export async function submitPublicRequest(token: string, buyer: BuyerData): Promise<void> {
  if (isDemoMode || !supabase) {
    const requests = readLocalRequests()
    const index = requests.findIndex((item) => item.token === token)
    if (index < 0 || requestStatus(requests[index]) !== 'aguardando') {
      throw new Error('O link expirou ou já foi utilizado.')
    }
    requests[index] = {
      ...requests[index],
      status: 'recebido',
      submittedAt: new Date().toISOString(),
      buyer,
      token: undefined,
    }
    writeLocalRequests(requests)
    return
  }

  const { error } = await supabase.functions.invoke('submit-atpv-request', {
    body: { token, buyer },
  })
  if (error) throw new Error('Não foi possível enviar. Confira os dados e tente novamente.')
}

export async function approveRequest(id: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const requests = readLocalRequests().map((request) =>
      request.id === id
        ? { ...request, status: 'aprovado' as const, approvedAt: new Date().toISOString() }
        : request,
    )
    writeLocalRequests(requests)
    return
  }

  const { data, error } = await supabase.functions.invoke('approve-atpv-request', {
    body: { id },
  })
  if (error) throw new Error('Não foi possível aprovar a solicitação.')
  if (!data?.ok) throw new Error(data?.error ?? 'Não foi possível aprovar a solicitação.')
}

export async function cancelRequest(id: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const requests = readLocalRequests().map((request) =>
      request.id === id ? { ...request, status: 'cancelado' as const, token: undefined } : request,
    )
    writeLocalRequests(requests)
    return
  }

  const { data, error } = await supabase.functions.invoke('cancel-atpv-request', {
    body: { id },
  })
  if (error) throw new Error('Não foi possível cancelar a solicitação.')
  if (!data?.ok) throw new Error(data?.error ?? 'Não foi possível cancelar a solicitação.')
}

export function buildPublicLink(request: AtpvRequest): string {
  if (!request.token) return ''
  return `${window.location.origin}/preencher/${request.token}`
}
