import { errorMessage, isAllowedOrigin, json, preflight } from '../_shared/http.ts'
import { adminClient, authenticatedUser, userShop } from '../_shared/security.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST' || !isAllowedOrigin(request)) return json(request, { error: 'Requisição não permitida.' }, 403)

  try {
    const user = await authenticatedUser(request)
    const membership = await userShop(user.id)
    const { id } = await request.json() as { id?: string }
    if (!id) throw new Error('Solicitação inválida.')
    const client = adminClient()
    const { data, error } = await client.from('atpv_requests').update({
      status: 'cancelado',
      token_hash: null,
    })
      .eq('id', id)
      .eq('shop_id', membership.shop_id)
      .in('status', ['aguardando', 'expirado'])
      .select('id')
      .single()
    if (error || !data) throw new Error('Esta solicitação não pode mais ser cancelada.')

    await client.from('audit_events').insert({
      shop_id: membership.shop_id,
      request_id: id,
      actor_user_id: user.id,
      event_type: 'request_cancelled',
    })
    return json(request, { ok: true })
  } catch (reason) {
    const message = errorMessage(reason)
    return json(request, { error: message }, message.includes('autoriz') || message.includes('Sessão') ? 401 : 400)
  }
})
