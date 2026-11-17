create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('lembretes-push') where exists (select 1 from cron.job where jobname = 'lembretes-push');

select cron.schedule(
  'lembretes-push',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://slevkhjdgtbrqjxjllha.supabase.co/functions/v1/lembretes',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
