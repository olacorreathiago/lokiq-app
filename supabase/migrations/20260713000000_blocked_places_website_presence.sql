-- ============================================================
-- BLOCKED PLACES — resultados excluídos de pesquisas futuras
-- Filtrados antes dos Place Details (poupa SKU Enterprise)
-- ============================================================

create table blocked_places (
  id            uuid primary key default gen_random_uuid(),
  place_id      text not null,
  name          text not null,
  reason        text,
  created_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users(id)
);

create unique index blocked_places_place_id_user_id_idx on blocked_places (place_id, user_id);
create index blocked_places_user_id_idx on blocked_places (user_id);

alter table blocked_places enable row level security;

create policy "Users can view own blocked places"
  on blocked_places for select using (user_id = auth.uid());

create policy "Users can insert own blocked places"
  on blocked_places for insert with check (user_id = auth.uid());

create policy "Users can delete own blocked places"
  on blocked_places for delete using (user_id = auth.uid());

-- ============================================================
-- LEADS — classificação da presença digital
-- 'none' = sem nada · 'social' = só rede social · 'website' = site próprio
-- ============================================================

create type website_presence as enum ('none', 'social', 'website');

alter table leads
  add column website_presence website_presence not null default 'none',
  add column website_url text;

-- backfill: leads existentes com has_website=true assumem site próprio
update leads set website_presence = 'website' where has_website = true;
