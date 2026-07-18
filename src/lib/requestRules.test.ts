import { describe, expect, it } from 'vitest'
import { canDeleteRequest } from './requestRules'

describe('regras das solicitações', () => {
  it('permite excluir somente solicitações aprovadas ou canceladas', () => {
    expect(canDeleteRequest('aprovado')).toBe(true)
    expect(canDeleteRequest('cancelado')).toBe(true)
    expect(canDeleteRequest('aguardando')).toBe(false)
    expect(canDeleteRequest('recebido')).toBe(false)
    expect(canDeleteRequest('expirado')).toBe(false)
  })
})
