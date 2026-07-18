export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? ''
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
  }
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin') ?? ''
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  return !origin || allowed.includes(origin)
}

export function json(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(request) })
}

export function preflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null
  return new Response('ok', { headers: corsHeaders(request) })
}

export function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Erro inesperado.'
}
