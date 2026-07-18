import { createClient, type User } from 'jsr:@supabase/supabase-js@2'

function getSecretKey(): string {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    const defaultKey = (JSON.parse(secretKeys) as Record<string, string>).default
    if (defaultKey) return defaultKey
  }

  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacyKey) return legacyKey

  throw new Error('Chave secreta do Supabase não configurada.')
}

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    getSecretKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function authenticatedUser(request: Request): Promise<User> {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) throw new Error('Acesso não autorizado.')
  const client = adminClient()
  const { data, error } = await client.auth.getUser(authorization.slice(7))
  if (error || !data.user) throw new Error('Sessão inválida.')
  return data.user
}

export async function userShop(userId: string): Promise<{ shop_id: string; role: string }> {
  const client = adminClient()
  const { data, error } = await client
    .from('shop_members')
    .select('shop_id, role')
    .eq('user_id', userId)
    .limit(1)
    .single()
  if (error || !data) throw new Error('Usuário sem loja vinculada.')
  return data
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function requestCode(): string {
  const year = new Date().getUTCFullYear()
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase()
  return `ATPV-${year}-${suffix}`
}
