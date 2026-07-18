create extension if not exists pgcrypto;

create type public.atpv_status as enum (
  'aguardando',
  'recebido',
  'aprovado',
  'expirado',
  'cancelado'
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  nome_fantasia text not null,
  razao_social text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  logo_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'operador' check (role in ('administrador', 'operador')),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);

create table public.atpv_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  codigo text not null unique,
  valor_venda_centavos bigint not null check (valor_venda_centavos > 0),
  email_vendedor text not null,
  status public.atpv_status not null default 'aguardando',
  token_hash text unique,
  dados_comprador jsonb,
  template_version text not null default '1.0',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  approved_at timestamptz
);

create index atpv_requests_shop_created_idx on public.atpv_requests (shop_id, created_at desc);
create index atpv_requests_status_idx on public.atpv_requests (shop_id, status);
create index atpv_requests_document_idx on public.atpv_requests ((dados_comprador ->> 'cpfCnpj'));

create table public.audit_events (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops(id) on delete restrict,
  request_id uuid references public.atpv_requests(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_request_idx on public.audit_events (request_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shops_set_updated_at before update on public.shops
for each row execute function public.set_updated_at();

create trigger atpv_requests_set_updated_at before update on public.atpv_requests
for each row execute function public.set_updated_at();

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.atpv_requests enable row level security;
alter table public.audit_events enable row level security;

create policy "membros visualizam a própria associação"
on public.shop_members for select to authenticated
using (user_id = (select auth.uid()));

create policy "membros visualizam sua loja"
on public.shops for select to authenticated
using (
  exists (
    select 1 from public.shop_members
    where shop_members.shop_id = shops.id
      and shop_members.user_id = (select auth.uid())
  )
);

create policy "administradores atualizam sua loja"
on public.shops for update to authenticated
using (
  exists (
    select 1 from public.shop_members
    where shop_members.shop_id = shops.id
      and shop_members.user_id = (select auth.uid())
      and shop_members.role = 'administrador'
  )
)
with check (
  exists (
    select 1 from public.shop_members
    where shop_members.shop_id = shops.id
      and shop_members.user_id = (select auth.uid())
      and shop_members.role = 'administrador'
  )
);

create policy "membros visualizam solicitações da loja"
on public.atpv_requests for select to authenticated
using (
  exists (
    select 1 from public.shop_members
    where shop_members.shop_id = atpv_requests.shop_id
      and shop_members.user_id = (select auth.uid())
  )
);

create policy "membros visualizam auditoria da loja"
on public.audit_events for select to authenticated
using (
  exists (
    select 1 from public.shop_members
    where shop_members.shop_id = audit_events.shop_id
      and shop_members.user_id = (select auth.uid())
  )
);

revoke all on public.shops from anon;
revoke all on public.shop_members from anon;
revoke all on public.atpv_requests from anon;
revoke all on public.audit_events from anon;

grant select, update on public.shops to authenticated;
grant select on public.shop_members to authenticated;
grant select on public.atpv_requests to authenticated;
grant select on public.audit_events to authenticated;
