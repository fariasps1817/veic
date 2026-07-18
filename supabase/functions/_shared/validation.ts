const onlyDigits = (value: string) => value.replace(/\D/g, '')
const documentCharacters = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)

function validCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

function cnpjDigit(base: string, weights: number[]): number {
  const sum = base.split('').reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function validCnpj(value: string): boolean {
  const cnpj = documentCharacters(value)
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false
  const first = cnpjDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = cnpjDigit(`${cnpj.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${first}${second}` === cnpj.slice(12)
}

export interface BuyerPayload {
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

export function validateBuyer(value: unknown): BuyerPayload {
  if (!value || typeof value !== 'object') throw new Error('Dados do comprador inválidos.')
  const buyer = value as Record<string, unknown>
  const text = (field: string, max: number) => {
    const result = String(buyer[field] ?? '').trim()
    if (result.length > max) throw new Error(`Campo ${field} excede o tamanho permitido.`)
    return result
  }

  const result: BuyerPayload = {
    cpfCnpj: text('cpfCnpj', 18),
    emailComprador: text('emailComprador', 160).toLowerCase(),
    nomeCompleto: text('nomeCompleto', 120),
    cep: text('cep', 9),
    logradouro: text('logradouro', 120),
    numero: text('numero', 15),
    bairro: text('bairro', 80),
    cidade: text('cidade', 80),
    uf: text('uf', 2).toUpperCase(),
    complemento: text('complemento', 80),
    whatsapp: text('whatsapp', 15),
    aceitePrivacidade: buyer.aceitePrivacidade === true,
  }

  const document = documentCharacters(result.cpfCnpj)
  if (!(document.length === 11 ? validCpf(document) : validCnpj(document))) throw new Error('CPF ou CNPJ inválido.')
  if (!/^\S+@\S+\.\S+$/.test(result.emailComprador)) throw new Error('E-mail inválido.')
  if (result.nomeCompleto.length < 3) throw new Error('Nome inválido.')
  if (onlyDigits(result.cep).length !== 8) throw new Error('CEP inválido.')
  if (result.logradouro.length < 2 || !/^\d{1,10}$/.test(result.numero) || result.bairro.length < 2 || result.cidade.length < 2) throw new Error('Endereço incompleto.')
  if (!/^[A-Z]{2}$/.test(result.uf)) throw new Error('UF inválida.')
  if (![10, 11].includes(onlyDigits(result.whatsapp).length)) throw new Error('WhatsApp inválido.')
  if (!result.aceitePrivacidade) throw new Error('Confirmação obrigatória.')
  return result
}
