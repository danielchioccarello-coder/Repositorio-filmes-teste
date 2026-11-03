-- Cole este arquivo no SQL Editor do Supabase e clique em Run.
create table public.marcacoes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  movie_id integer not null,
  status text not null check (status in ('quero', 'assisti')),
  title text not null,
  poster_path text,
  release_date text,
  vote_average real,
  vote_count integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Cada pessoa só vê e mexe nas próprias marcações
alter table public.marcacoes enable row level security;
create policy "ler as próprias" on public.marcacoes for select using (auth.uid() = user_id);
create policy "criar as próprias" on public.marcacoes for insert with check (auth.uid() = user_id);
create policy "alterar as próprias" on public.marcacoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar as próprias" on public.marcacoes for delete using (auth.uid() = user_id);
