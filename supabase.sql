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
