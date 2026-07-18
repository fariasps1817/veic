import { describe, expect, it } from 'vitest'
import {
  calculateCnpjCheckDigits,
  maskCep,
  maskCpfCnpj,
  maskPhone,
  titleCasePtBr,
  validateCnpj,
  validateCpf,
} from './validation'

describe('validação de documentos', () => {
  it('valida CPF e rejeita sequências repetidas', () => {
    expect(validateCpf('529.982.247-25')).toBe(true)
    expect(validateCpf('111.111.111-11')).toBe(false)
    expect(validateCpf('529.982.247-24')).toBe(false)
  })

  it('valida CNPJ numérico e CNPJ alfanumérico', () => {
    expect(validateCnpj('04.252.011/0001-10')).toBe(true)
    expect(validateCnpj('12.ABC.345/01DE-35')).toBe(true)
    expect(validateCnpj('12.ABC.345/01DE-34')).toBe(false)
    expect(calculateCnpjCheckDigits('12ABC34501DE')).toBe('35')
  })
})

describe('normalização e máscaras', () => {
  it('normaliza nomes em português brasileiro', () => {
    expect(titleCasePtBr('  maRIA   JOSe Da siLVA ')).toBe('Maria Jose da Silva')
    expect(titleCasePtBr("joão d'ávila dos santos")).toBe("João d'Ávila dos Santos")
  })

  it('aplica máscaras sem exceder os limites', () => {
    expect(maskCpfCnpj('52998224725')).toBe('529.982.247-25')
    expect(maskCpfCnpj('12abc34501de35')).toBe('12.ABC.345/01DE-35')
    expect(maskCep('60120100')).toBe('60120-100')
    expect(maskPhone('85988811817')).toBe('(85) 98881-1817')
  })
})
