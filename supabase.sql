-- =========================================================
-- Central da Lorena — banco de dados no Supabase
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- =========================================================

-- Uma linha por pessoa com todos os dados do site (agenda, listas, rotina…)
create table if not exists public.central_dados (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  dados        jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Segurança: cada pessoa só enxerga e altera a própria linha
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

-- Mais pra frente: o bot de WhatsApp vai ler esta tabela com a chave
-- service_role (no servidor do bot, nunca no site) para mandar os lembretes.
