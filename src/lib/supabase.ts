import { createClient, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isDemoMode = !supabaseUrl || !supabasePublicKey

export const supabase = isDemoMode
  ? null
  : createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('E-mail ou senha incorretos.')
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function changeCurrentPassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!supabase) return
  const { data: userData, error: userError } = await supabase.auth.getUser()
  const email = userData.user?.email
  if (userError || !email) throw new Error('Não foi possível identificar o usuário atual.')

  const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (currentPasswordError) throw new Error('A senha atual está incorreta.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error('Não foi possível alterar a senha.')
}
