import { errorMessage, isAllowedOrigin, json, preflight } from '../_shared/http.ts'
import { adminClient, authenticatedUser, userShop } from '../_shared/security.ts'

type UserRole = 'administrador' | 'operador'

function validPassword(value: string): boolean {
  return value.length >= 6 && value.trim().length > 0
}

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== 'POST' || !isAllowedOrigin(request)) {
    return json(request, { error: 'Requisição não permitida.' }, 403)
  }

  try {
    const currentUser = await authenticatedUser(request)
    const membership = await userShop(currentUser.id)
    if (membership.role !== 'administrador') {
      return json(request, { error: 'Somente administradores podem gerenciar usuários.' }, 403)
    }

    const body = await request.json() as {
      action?: 'list' | 'create'
      email?: string
      password?: string
      role?: UserRole
    }
    const client = adminClient()

    if (body.action === 'list') {
      const { data: members, error: membersError } = await client
        .from('shop_members')
        .select('user_id, role, created_at')
        .eq('shop_id', membership.shop_id)
        .order('created_at', { ascending: true })
      if (membersError) throw membersError

      const memberIds = new Set(members.map((member) => member.user_id))
      const usersById = new Map<string, { email?: string }>()
      let page = 1

      while (memberIds.size > usersById.size) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 })
        if (error) throw error
        for (const user of data.users) {
          if (memberIds.has(user.id)) usersById.set(user.id, { email: user.email })
        }
        if (data.users.length < 100) break
        page += 1
      }

      return json(request, {
        users: members.map((member) => ({
          id: member.user_id,
          email: usersById.get(member.user_id)?.email ?? 'E-mail indisponível',
          role: member.role,
          createdAt: member.created_at,
          isCurrent: member.user_id === currentUser.id,
        })),
      })
    }

    if (body.action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const role: UserRole = body.role === 'administrador' ? 'administrador' : 'operador'

      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) {
        throw new Error('Informe um e-mail válido.')
      }
      if (!validPassword(password)) {
        throw new Error('A senha temporária deve ter no mínimo 6 caracteres.')
      }

      const { data: created, error: createError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError || !created.user) {
        if (createError?.message.toLowerCase().includes('already')) {
          throw new Error('Já existe um usuário com este e-mail.')
        }
        throw createError ?? new Error('Não foi possível criar o usuário.')
      }

      const { error: membershipError } = await client.from('shop_members').insert({
        shop_id: membership.shop_id,
        user_id: created.user.id,
        role,
      })
      if (membershipError) {
        await client.auth.admin.deleteUser(created.user.id)
        throw membershipError
      }

      await client.from('audit_events').insert({
        shop_id: membership.shop_id,
        actor_user_id: currentUser.id,
        event_type: 'shop_user_created',
        details: { created_user_id: created.user.id, role },
      })

      return json(request, {
        user: {
          id: created.user.id,
          email,
          role,
          createdAt: created.user.created_at,
          isCurrent: false,
        },
      }, 201)
    }

    throw new Error('Ação inválida.')
  } catch (reason) {
    const message = errorMessage(reason)
    const status = message.includes('autoriz') || message.includes('Sessão') ? 401 : 400
    return json(request, { error: message }, status)
  }
})
