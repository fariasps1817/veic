import type { RequestStatus } from '../types'

const DELETABLE_STATUSES: RequestStatus[] = ['aprovado', 'cancelado']

export function canDeleteRequest(status: RequestStatus): boolean {
  return DELETABLE_STATUSES.includes(status)
}
