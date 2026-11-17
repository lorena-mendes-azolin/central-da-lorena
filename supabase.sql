create table if not exists public.central_dados (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  dados        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.central_dados enable row level security;

drop policy if exists "ver os meus dados" on public.central_dados;
create policy "ver os meus dados" on public.central_dados
  for select using (auth.uid() = user_id);

drop policy if exists "criar os meus dados" on public.central_dados;
create policy "criar os meus dados" on public.central_dados
  for insert with check (auth.uid() = user_id);

drop policy if exists "alterar os meus dados" on public.central_dados;
create policy "alterar os meus dados" on public.central_dados
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', false)
on conflict (id) do nothing;

drop policy if exists "ver as minhas imagens" on storage.objects;
create policy "ver as minhas imagens" on storage.objects
  for select using (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "enviar as minhas imagens" on storage.objects;
create policy "enviar as minhas imagens" on storage.objects
  for insert with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "apagar as minhas imagens" on storage.objects;
create policy "apagar as minhas imagens" on storage.objects
  for delete using (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.central_diario (
  user_id      uuid not null references auth.users (id) on delete cascade,
  dia          date not null,
  bom          jsonb not null default '[]'::jsonb,
  texto        text not null default '',
  atualizado_em timestamptz not null default now(),
  primary key (user_id, dia)
);

alter table public.central_diario enable row level security;

drop policy if exists "ver o meu diario" on public.central_diario;
create policy "ver o meu diario" on public.central_diario
  for select using (auth.uid() = user_id);

drop policy if exists "criar o meu diario" on public.central_diario;
create policy "criar o meu diario" on public.central_diario
  for insert with check (auth.uid() = user_id);

drop policy if exists "alterar o meu diario" on public.central_diario;
create policy "alterar o meu diario" on public.central_diario
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "apagar o meu diario" on public.central_diario;
create policy "apagar o meu diario" on public.central_diario
  for delete using (auth.uid() = user_id);

create table if not exists public.central_historico (
  user_id   uuid not null references auth.users (id) on delete cascade,
  dia       date not null,
  dados     jsonb not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, dia)
);

alter table public.central_historico enable row level security;

drop policy if exists "ver o meu historico" on public.central_historico;
create policy "ver o meu historico" on public.central_historico
  for select using (auth.uid() = user_id);

create table if not exists public.central_diario_historico (
  user_id    uuid not null references auth.users (id) on delete cascade,
  dia        date not null,
  versao_dia date not null,
  bom        jsonb not null default '[]'::jsonb,
  texto      text not null default '',
  primary key (user_id, dia, versao_dia)
);

alter table public.central_diario_historico enable row level security;

drop policy if exists "ver o historico do meu diario" on public.central_diario_historico;
create policy "ver o historico do meu diario" on public.central_diario_historico
  for select using (auth.uid() = user_id);

create or replace function public.guardar_historico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.central_historico (user_id, dia, dados)
  values (old.user_id, hoje, old.dados)
  on conflict (user_id, dia) do nothing;
  delete from public.central_historico where user_id = old.user_id and dia < hoje - 30;
  return new;
end;
$$;

drop trigger if exists guardar_historico on public.central_dados;
create trigger guardar_historico
  before update on public.central_dados
  for each row execute function public.guardar_historico();

create or replace function public.guardar_historico_diario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.central_diario_historico (user_id, dia, versao_dia, bom, texto)
  values (old.user_id, old.dia, hoje, old.bom, old.texto)
  on conflict (user_id, dia, versao_dia) do nothing;
  delete from public.central_diario_historico where user_id = old.user_id and versao_dia < hoje - 30;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists guardar_historico_diario on public.central_diario;
create trigger guardar_historico_diario
  before update or delete on public.central_diario
  for each row execute function public.guardar_historico_diario();

do $$
begin
  alter publication supabase_realtime add table public.central_dados;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.central_diario;
exception when duplicate_object then null;
end $$;

create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'Sem login';
  end if;
  delete from public.central_historico where user_id = eu;
  delete from public.central_diario_historico where user_id = eu;
  delete from public.central_diario where user_id = eu;
  delete from public.central_dados where user_id = eu;
  delete from auth.users where id = eu;
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;

create table if not exists public.central_partes (
  user_id       uuid not null references auth.users (id) on delete cascade,
  chave         text not null,
  dados         jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, chave)
);

alter table public.central_partes enable row level security;

drop policy if exists "ver as minhas partes" on public.central_partes;
create policy "ver as minhas partes" on public.central_partes
  for select using (auth.uid() = user_id);
drop policy if exists "criar as minhas partes" on public.central_partes;
create policy "criar as minhas partes" on public.central_partes
  for insert with check (auth.uid() = user_id);
drop policy if exists "mudar as minhas partes" on public.central_partes;
create policy "mudar as minhas partes" on public.central_partes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "apagar as minhas partes" on public.central_partes;
create policy "apagar as minhas partes" on public.central_partes
  for delete using (auth.uid() = user_id);

create table if not exists public.central_partes_historico (
  user_id uuid not null references auth.users (id) on delete cascade,
  chave   text not null,
  dia     date not null,
  dados   jsonb,
  primary key (user_id, chave, dia)
);

alter table public.central_partes_historico enable row level security;

drop policy if exists "ver o historico das minhas partes" on public.central_partes_historico;
create policy "ver o historico das minhas partes" on public.central_partes_historico
  for select using (auth.uid() = user_id);

create or replace function public.guardar_historico_partes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.central_partes_historico (user_id, chave, dia, dados)
  values (old.user_id, old.chave, hoje, old.dados)
  on conflict (user_id, chave, dia) do nothing;
  delete from public.central_partes_historico where user_id = old.user_id and dia < hoje - 30;
  return new;
end;
$$;

drop trigger if exists guardar_historico_partes on public.central_partes;
create trigger guardar_historico_partes
  before update on public.central_partes
  for each row execute function public.guardar_historico_partes();

do $$
begin
  alter publication supabase_realtime add table public.central_partes;
exception when duplicate_object then null;
end $$;

create table if not exists public.push_inscricoes (
  endpoint  text primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  inscricao jsonb not null,
  aparelho  text,
  criado_em timestamptz not null default now()
);

alter table public.push_inscricoes enable row level security;

drop policy if exists "ver as minhas inscricoes" on public.push_inscricoes;
create policy "ver as minhas inscricoes" on public.push_inscricoes
  for select using (auth.uid() = user_id);
drop policy if exists "criar as minhas inscricoes" on public.push_inscricoes;
create policy "criar as minhas inscricoes" on public.push_inscricoes
  for insert with check (auth.uid() = user_id);
drop policy if exists "mudar as minhas inscricoes" on public.push_inscricoes;
create policy "mudar as minhas inscricoes" on public.push_inscricoes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "apagar as minhas inscricoes" on public.push_inscricoes;
create policy "apagar as minhas inscricoes" on public.push_inscricoes
  for delete using (auth.uid() = user_id);

create table if not exists public.push_enviados (
  user_id    uuid not null references auth.users (id) on delete cascade,
  chave      text not null,
  enviado_em timestamptz not null default now(),
  primary key (user_id, chave)
);

alter table public.push_enviados enable row level security;

revoke execute on function public.guardar_historico() from public, anon, authenticated;
revoke execute on function public.guardar_historico_diario() from public, anon, authenticated;
revoke execute on function public.guardar_historico_partes() from public, anon, authenticated;
