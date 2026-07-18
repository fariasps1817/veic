import { errorMessage, isAllowedOrigin, json, preflight } from '../_shared/http.ts'
import { adminClient, tokenHash } from '../_shared/security.ts'
import { validateBuyer } from '../_shared/validation.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST' || !isAllowedOrigin(request)) return json(request, { error: 'Requisição não permitida.' }, 403)

  try {
    const body = await request.json() as { token?: string; buyer?: unknown }
    if (!body.token || body.token.length < 40 || body.token.length > 100) throw new Error('Link inválido.')
    const buyer = validateBuyer(body.buyer)
    const hash = await tokenHash(body.token)
    const now = new Date().toISOString()
    const client = adminClient()
    const { data, error } = await client.from('atpv_requests').update({
      dados_comprador: buyer,
      status: 'recebido',
      submitted_at: now,
      token_hash: null,
    })
      .eq('token_hash', hash)
      .eq('status', 'aguardando')
      .gt('expires_at', now)
      .select('id, shop_id')
      .single()
    if (error || !data) throw new Error('O link expirou ou já foi utilizado.')

    await client.from('audit_events').insert({
      shop_id: data.shop_id,
      request_id: data.id,
      event_type: 'buyer_submitted',
      details: { privacy_acknowledged: true },
    })
    return json(request, { ok: true })
  } catch (reason) {
    return json(request, { error: errorMessage(reason) }, 400)
  }
})
