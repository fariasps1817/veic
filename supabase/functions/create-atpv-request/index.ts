import { errorMessage, isAllowedOrigin, json, preflight } from '../_shared/http.ts'
import { adminClient, authenticatedUser, generateToken, requestCode, tokenHash, userShop } from '../_shared/security.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST' || !isAllowedOrigin(request)) return json(request, { error: 'Requisição não permitida.' }, 403)

  try {
    const user = await authenticatedUser(request)
    const membership = await userShop(user.id)
    const body = await request.json() as { valorVendaCentavos?: number; emailVendedor?: string }
    const cents = Number(body.valorVendaCentavos)
    const sellerEmail = String(body.emailVendedor ?? '').trim().toLowerCase()
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Valor de venda inválido.')
    if (!/^\S+@\S+\.\S+$/.test(sellerEmail) || sellerEmail.length > 160) throw new Error('E-mail do vendedor inválido.')

    const token = generateToken()
    const hash = await tokenHash(token)
    const client = adminClient()
    const { data, error } = await client.from('atpv_requests').insert({
      shop_id: membership.shop_id,
      codigo: requestCode(),
      valor_venda_centavos: cents,
      email_vendedor: sellerEmail,
      status: 'aguardando',
      token_hash: hash,
      created_by: user.id,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).select('*').single()
    if (error) throw error

    await client.from('audit_events').insert({
      shop_id: membership.shop_id,
      request_id: data.id,
      actor_user_id: user.id,
      event_type: 'request_created',
    })
    return json(request, { request: data, token }, 201)
  } catch (reason) {
    const message = errorMessage(reason)
    return json(request, { error: message }, message.includes('autoriz') || message.includes('Sessão') ? 401 : 400)
  }
})
