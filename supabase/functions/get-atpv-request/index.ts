import { errorMessage, isAllowedOrigin, json, preflight } from '../_shared/http.ts'
import { adminClient, tokenHash } from '../_shared/security.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST' || !isAllowedOrigin(request)) return json(request, { error: 'Requisição não permitida.' }, 403)

  try {
    const { token } = await request.json() as { token?: string }
    if (!token || token.length < 40 || token.length > 100) throw new Error('Link inválido.')
    const hash = await tokenHash(token)
    const client = adminClient()
    const { data: item, error } = await client
      .from('atpv_requests')
      .select('id, shop_id, codigo, valor_venda_centavos, email_vendedor, status, expires_at')
      .eq('token_hash', hash)
      .single()
    if (error || !item) throw new Error('Link inválido.')
    if (item.status !== 'aguardando') throw new Error('Formulário já enviado ou cancelado.')
    if (Date.parse(item.expires_at) <= Date.now()) {
      await client.from('atpv_requests').update({ status: 'expirado', token_hash: null }).eq('id', item.id)
      throw new Error('Link expirado.')
    }

    const { data: shop, error: shopError } = await client
      .from('shops')
      .select('nome_fantasia, telefone, whatsapp, email, logo_data_url')
      .eq('id', item.shop_id)
      .single()
    if (shopError || !shop) throw new Error('Loja não encontrada.')

    return json(request, {
      id: item.id,
      codigo: item.codigo,
      valorVendaCentavos: item.valor_venda_centavos,
      emailVendedor: item.email_vendedor,
      status: item.status,
      expiresAt: item.expires_at,
      shop: {
        nomeFantasia: shop.nome_fantasia,
        telefone: shop.telefone,
        whatsapp: shop.whatsapp,
        email: shop.email,
        logoDataUrl: shop.logo_data_url,
      },
    })
  } catch (reason) {
    return json(request, { error: errorMessage(reason) }, 410)
  }
})
