import { errorMessage, isAllowedOrigin, json, preflight } from '../_shared/http.ts'
import { adminClient } from '../_shared/security.ts'

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST' || !isAllowedOrigin(request)) return json(request, { error: 'Requisição não permitida.' }, 403)

  try {
    const { data: shop, error } = await adminClient()
      .from('shops')
      .select('nome_fantasia, logo_data_url')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !shop) throw new Error('Loja não encontrada.')

    return json(request, {
      nomeFantasia: shop.nome_fantasia,
      logoDataUrl: shop.logo_data_url,
    })
  } catch (reason) {
    return json(request, { error: errorMessage(reason) }, 500)
  }
})
