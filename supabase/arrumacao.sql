-- Arrumação do banco (nov/2026). Já aplicado no projeto; fica aqui como registro.

-- 1) Cópias antigas saíram do "public" (que o site acessa) para um esquema fechado.
--    Para apagar de vez quando quiser:  drop schema arquivo cascade;
create schema if not exists arquivo;
revoke all on schema arquivo from anon, authenticated;
-- alter table public.backup_listas_20261118 set schema arquivo;  (e as outras cópias/tmp)

-- 2) Regras de acesso: (select auth.uid()) em vez de auth.uid() — o Postgres calcula uma vez por consulta,
--    não uma vez por linha. Mesmo resultado, mais rápido.
do $$
declare p record; u text; c text; cmd text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    u := case when p.qual is null then null else regexp_replace(p.qual, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'g') end;
    c := case when p.with_check is null then null else regexp_replace(p.with_check, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'g') end;
    if u is distinct from p.qual or c is distinct from p.with_check then
      cmd := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if u is not null then cmd := cmd || format(' using (%s)', u); end if;
      if c is not null then cmd := cmd || format(' with check (%s)', c); end if;
      execute cmd;
    end if;
  end loop;
end $$;

-- 3) Índice que faltava
create index if not exists push_inscricoes_user_id_idx on public.push_inscricoes (user_id);
