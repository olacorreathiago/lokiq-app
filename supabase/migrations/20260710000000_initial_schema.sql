-- Lokiq — Initial Schema
-- Tables: leads, lead_events, deals
-- RLS active on all tables with user_id = auth.uid()

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type lead_stage as enum (
  'report',
  'demo',
  'touch',
  'negotiation',
  'closed',
  'discarded'
);

create type event_type as enum (
  'report_created',
  'demo_generated',
  'stage_changed',
  'note_added',
  'call_logged',
  'meeting_logged',
  'objection_logged',
  'reminder_set',
  'reminder_fired',
  'ai_suggestion'
);

create type event_source as enum (
  'auto',
  'manual',
  'ai',
  'system'
);

create type capture_mode as enum (
  'raio',
  'pontual'
);

create type product_sold as enum (
  'landing',
  'store',
  'booking',
  'custom'
);

-- ============================================================
-- TABLES
-- ============================================================

create table leads (
  id            uuid primary key default gen_random_uuid(),
  place_id      text not null,
  name          text not null,
  type          text not null,
  address       text not null,
  phone         text,
  rating        numeric,
  review_count  integer,
  has_website   boolean not null default false,
  opp_score     integer not null default 0 check (opp_score between 0 and 100),
  stage         lead_stage not null default 'report',
  demo_url      text,
  capture_mode  capture_mode not null,
  lat           numeric not null,
  lng           numeric not null,
  gmaps_uri     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users(id)
);

create unique index leads_place_id_user_id_idx on leads (place_id, user_id);
create index leads_user_id_stage_idx on leads (user_id, stage);
create index leads_user_id_opp_score_idx on leads (user_id, opp_score desc);

create table lead_events (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  event_type    event_type not null,
  source        event_source not null,
  title         text not null,
  body          text,
  metadata      jsonb,
  stage_from    lead_stage,
  stage_to      lead_stage,
  scheduled_at  timestamptz,
  triggered     boolean not null default false,
  created_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users(id)
);

create index lead_events_lead_id_idx on lead_events (lead_id, created_at desc);
create index lead_events_user_id_idx on lead_events (user_id);
create index lead_events_scheduled_idx on lead_events (scheduled_at)
  where scheduled_at is not null and triggered = false;

create table deals (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade unique,
  product_sold  product_sold not null,
  value_eur     numeric not null check (value_eur >= 0),
  closed_at     timestamptz not null default now(),
  notes         text,
  user_id       uuid not null references auth.users(id)
);

create index deals_user_id_idx on deals (user_id);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ============================================================
-- PROTECT lead_events (append-only)
-- ============================================================

create or replace function prevent_lead_events_mutation()
returns trigger as $$
begin
  raise exception 'lead_events is append-only: % not allowed', tg_op;
end;
$$ language plpgsql;

create trigger lead_events_no_update
  before update on lead_events
  for each row execute function prevent_lead_events_mutation();

create trigger lead_events_no_delete
  before delete on lead_events
  for each row execute function prevent_lead_events_mutation();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table leads enable row level security;
alter table lead_events enable row level security;
alter table deals enable row level security;

-- leads
create policy "Users can view own leads"
  on leads for select using (user_id = auth.uid());

create policy "Users can insert own leads"
  on leads for insert with check (user_id = auth.uid());

create policy "Users can update own leads"
  on leads for update using (user_id = auth.uid());

create policy "Users can delete own leads"
  on leads for delete using (user_id = auth.uid());

-- lead_events (no update/delete policies — triggers block it anyway)
create policy "Users can view own events"
  on lead_events for select using (user_id = auth.uid());

create policy "Users can insert own events"
  on lead_events for insert with check (user_id = auth.uid());

-- deals
create policy "Users can view own deals"
  on deals for select using (user_id = auth.uid());

create policy "Users can insert own deals"
  on deals for insert with check (user_id = auth.uid());

create policy "Users can update own deals"
  on deals for update using (user_id = auth.uid());

create policy "Users can delete own deals"
  on deals for delete using (user_id = auth.uid());
