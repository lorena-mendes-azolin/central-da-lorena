-- Robô de preços das Compras (função "precos").
-- Tabela onde o robô grava o que encontrou; o site só lê.
create table if not exists public.compras_precos (
  user_id       uuid not null references auth.users (id) on delete cascade,
  lista_id      text not null,
  item_id       text not null,
  link          text,
  preco         numeric(12,2),
  situacao      text not null default 'ok' check (situacao in ('ok','esgotado','falhou')),
  verificado_em timestamptz not null default now(),
  primary key (user_id, lista_id, item_id)
);
alter table public.compras_precos enable row level security;
drop policy if exists "ver os meus precos" on public.compras_precos;
create policy "ver os meus precos" on public.compras_precos for select using (auth.uid() = user_id);

-- Roda de hora em hora; a função só confere links que passaram de 20h desde a última vez
-- (na prática, cada item é conferido uma vez por dia).
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('precos-compras') where exists (select 1 from cron.job where jobname = 'precos-compras');
select cron.schedule(
  'precos-compras',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://slevkhjdgtbrqjxjllha.supabase.co/functions/v1/precos',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"modo":"agendado"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
