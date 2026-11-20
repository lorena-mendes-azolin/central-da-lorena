-- Simulado com IA (rodar uma vez no SQL Editor do Supabase)

-- Quantos simulados cada usuário gerou por dia com a chave do site (limite diário).
create table if not exists public.simulado_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  qtd int not null default 0,
  primary key (user_id, dia)
);
alter table public.simulado_uso enable row level security;
-- Sem políticas: só a edge function (service role) mexe aqui.

-- Chave do Gemini de cada usuário (opcional). Cada um só vê e muda a própria.
create table if not exists public.ia_chaves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gemini text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.ia_chaves enable row level security;
drop policy if exists "ia_chaves_dono" on public.ia_chaves;
create policy "ia_chaves_dono" on public.ia_chaves
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Conta mais um simulado no dia (horário de Brasília). Devolve a nova quantidade,
-- ou null se já chegou no limite.
create or replace function public.usar_simulado(uid uuid, limite int)
returns int language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  nova int;
begin
  insert into simulado_uso (user_id, dia, qtd) values (uid, hoje, 1)
  on conflict (user_id, dia) do update set qtd = simulado_uso.qtd + 1
    where simulado_uso.qtd < limite
  returning qtd into nova;
  return nova;
end $$;

-- Devolve o simulado se a IA falhou (não conta no limite).
create or replace function public.devolver_simulado(uid uuid)
returns void language sql security definer set search_path = public as $$
  update simulado_uso set qtd = greatest(qtd - 1, 0)
  where user_id = uid and dia = (now() at time zone 'America/Sao_Paulo')::date;
$$;

revoke all on function public.usar_simulado(uuid, int) from public, anon, authenticated;
revoke all on function public.devolver_simulado(uuid) from public, anon, authenticated;
grant execute on function public.usar_simulado(uuid, int) to service_role;
grant execute on function public.devolver_simulado(uuid) to service_role;
