import { z } from 'zod'

const NAME_PARTICLES = new Set(['da', 'das', 'de', 'do', 'dos', 'e', 'd'])
const COMPANY_SUFFIXES = new Map([
  ['ltda', 'LTDA'],
  ['me', 'ME'],
  ['epp', 'EPP'],
  ['s/a', 'S/A'],
])

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function documentCharacters(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
}

export function validateCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const calculateDigit = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10])
}

function cnpjCharacterValue(character: string): number {
  return character.charCodeAt(0) - 48
}

function calculateCnpjDigit(base: string, weights: number[]): number {
  const sum = base
    .split('')
    .reduce((total, character, index) => total + cnpjCharacterValue(character) * weights[index], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

export function calculateCnpjCheckDigits(baseValue: string): string | null {
  const base = documentCharacters(baseValue)
  if (!/^[A-Z0-9]{12}$/.test(base)) return null

  const first = calculateCnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calculateCnpjDigit(`${base}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${first}${second}`
}

export function validateCnpj(value: string): boolean {
  const cnpj = documentCharacters(value)
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false
  return calculateCnpjCheckDigits(cnpj.slice(0, 12)) === cnpj.slice(12)
}

export function validateCpfOrCnpj(value: string): boolean {
  const document = documentCharacters(value)
  return document.length === 11 ? validateCpf(document) : validateCnpj(document)
}

export function maskCpfCnpj(value: string): string {
  const raw = documentCharacters(value)
  const isCnpj = /[A-Z]/.test(raw) || raw.length > 11
  if (!isCnpj) {
    return raw
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  return raw
    .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
    .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
    .replace(/\.([A-Z0-9]{3})([A-Z0-9])/, '.$1/$2')
    .replace(/([A-Z0-9]{4})(\d)/, '$1-$2')
}

export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.replace(/^(\d{5})(\d)/, '$1-$2')
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, '($1) $2')
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3')
  }
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3')
}

export function titleCasePtBr(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
  if (!normalized) return ''

  return normalized
    .split(' ')
    .map((word, index) => {
      const suffix = COMPANY_SUFFIXES.get(word)
      if (suffix) return suffix
      if (index > 0 && NAME_PARTICLES.has(word)) return word
      if (index > 0 && word.startsWith("d'") && word.length > 2) {
        return `d'${word.slice(2).replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('pt-BR'))}`
      }
      return word.replace(/(^|[-'])\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'))
    })
    .join(' ')
}

export function moneyInputMask(value: string): string {
  const digits = onlyDigits(value).slice(0, 12)
  if (!digits) return ''
  const cents = Number(digits)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function moneyMaskToCents(value: string): number {
  return Number(onlyDigits(value)) || 0
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export const buyerSchema = z.object({
  cpfCnpj: z.string().refine(validateCpfOrCnpj, 'Informe um CPF ou CNPJ válido.'),
  emailComprador: z.string().trim().email('Informe um e-mail válido.').max(160),
  nomeCompleto: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  cep: z.string().refine((value) => onlyDigits(value).length === 8, 'Informe os 8 números do CEP.'),
  logradouro: z.string().trim().min(2, 'Informe o logradouro.').max(120),
  numero: z.string().regex(/^\d{1,10}$/, 'Informe somente os números do imóvel.'),
  bairro: z.string().trim().min(2, 'Informe o bairro.').max(80),
  cidade: z.string().trim().min(2, 'Informe a cidade.').max(80),
  uf: z.string().regex(/^[A-Z]{2}$/, 'Selecione a UF.'),
  complemento: z.string().trim().max(80),
  whatsapp: z
    .string()
    .refine((value) => [10, 11].includes(onlyDigits(value).length), 'Informe o telefone com DDD.'),
  aceitePrivacidade: z.literal(true, { error: 'É necessário confirmar a ciência.' }),
})

export type BuyerFormData = z.infer<typeof buyerSchema>
