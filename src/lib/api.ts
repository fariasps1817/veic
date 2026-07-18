import type { IbgeCity, IbgeState } from '../types'
import { onlyDigits } from './validation'

export interface ViaCepAddress {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

const API_TIMEOUT_MS = 8_000

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function findAddressByCep(cepValue: string): Promise<ViaCepAddress | null> {
  const cep = onlyDigits(cepValue)
  if (cep.length !== 8) return null

  const response = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`)
  if (!response.ok) throw new Error('Não foi possível consultar o CEP agora.')
  const data = (await response.json()) as ViaCepAddress
  return data.erro ? null : data
}

export async function listStates(): Promise<IbgeState[]> {
  const response = await fetchWithTimeout(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
  )
  if (!response.ok) throw new Error('Não foi possível carregar os estados.')
  return (await response.json()) as IbgeState[]
}

export async function listCitiesByState(uf: string): Promise<IbgeCity[]> {
  if (!/^[A-Z]{2}$/.test(uf)) return []
  const response = await fetchWithTimeout(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
  )
  if (!response.ok) throw new Error('Não foi possível carregar os municípios.')
  return (await response.json()) as IbgeCity[]
}
