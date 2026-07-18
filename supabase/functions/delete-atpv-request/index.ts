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
    const { data: deleted, error } = await client
      .from('atpv_requests')
      .delete()
      .eq('id', id)
      .eq('shop_id', membership.shop_id)
      .in('status', ['aprovado', 'cancelado'])
      .select('id, codigo, status')
      .single()

    if (error || !deleted) throw new Error('Somente solicitações aprovadas ou canceladas podem ser excluídas.')

    await client.from('audit_events').insert({
      shop_id: membership.shop_id,
      actor_user_id: user.id,
      event_type: 'request_deleted',
      details: {
        request_id: deleted.id,
        codigo: deleted.codigo,
        previous_status: deleted.status,
      },
    })

    return json(request, { ok: true })
  } catch (reason) {
    const message = errorMessage(reason)
    return json(request, { error: message }, message.includes('autoriz') || message.includes('Sessão') ? 401 : 400)
  }
})
