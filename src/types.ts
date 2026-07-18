export type RequestStatus =
  | 'aguardando'
  | 'recebido'
  | 'aprovado'
  | 'expirado'
  | 'cancelado'

export interface ShopSettings {
  id: string
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  telefone: string
  whatsapp: string
  email: string
  endereco: string
  logoDataUrl?: string
}

export type ShopUserRole = 'administrador' | 'operador'

export interface ShopUser {
  id: string
  email: string
  role: ShopUserRole
  createdAt: string
  isCurrent: boolean
}

export interface BuyerData {
  cpfCnpj: string
  emailComprador: string
  nomeCompleto: string
  cep: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  complemento: string
  whatsapp: string
  aceitePrivacidade: boolean
}

export interface AtpvRequest {
  id: string
  codigo: string
  token?: string
  valorVendaCentavos: number
  emailVendedor: string
  status: RequestStatus
  createdAt: string
  expiresAt: string
  submittedAt?: string
  approvedAt?: string
  buyer?: BuyerData
}

export interface PublicRequestView {
  id: string
  codigo: string
  valorVendaCentavos: number
  emailVendedor: string
  status: RequestStatus
  expiresAt: string
  shop: Pick<ShopSettings, 'nomeFantasia' | 'telefone' | 'whatsapp' | 'email' | 'logoDataUrl'>
}

export interface IbgeState {
  id: number
  sigla: string
  nome: string
}

export interface IbgeCity {
  id: number
  nome: string
}
