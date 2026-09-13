create table company_state (
  id int primary key default 1,
  day int not null default 1,
  date date not null default '2026-09-10',
  cash bigint not null default 30000000,
  revenue bigint not null default 0,
  clients int not null default 0,
  reputation numeric not null default 50,
  sales_mode text not null default 'balanced',
  overtime_mode text not null default 'normal',
  lead_actor_type text,
  lead_actor_id text,
  seller_actor_type text,
  seller_actor_id text,
  fire_actor_type text,
  fire_actor_id text,
  last_advanced_date date,
  last_manual_chat_day int not null default -999,
  updated_at timestamptz not null default now(),
  constraint company_state_singleton check (id = 1)
);
insert into company_state (id) values (1);

alter table company_state enable row level security;
create policy "company_state readable by authenticated"
  on company_state for select to authenticated using (true);
create policy "company_state writable by authenticated"
  on company_state for update to authenticated using (true) with check (id = 1);

create table relationships (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('profile','npc')),
  actor_id text not null,
  target_type text not null check (target_type in ('profile','npc')),
  target_id text not null,
  affection numeric not null default 50,
  trust numeric not null default 50,
  conflict numeric not null default 10,
  romantic numeric not null default 5,
  updated_at timestamptz not null default now(),
  unique (actor_type, actor_id, target_type, target_id)
);

alter table relationships enable row level security;
create policy "relationships readable by authenticated"
  on relationships for select to authenticated using (true);
create policy "relationships writable by authenticated"
  on relationships for all to authenticated using (true) with check (true);

create table daily_events (
  id uuid primary key default gen_random_uuid(),
  day int not null,
  date date not null,
  text text not null,
  type text not null default 'event',
  category text,
  is_protagonist boolean not null default false,
  actor_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index daily_events_date_idx on daily_events (date);

alter table daily_events enable row level security;
create policy "daily_events readable by authenticated"
  on daily_events for select to authenticated using (true);
create policy "daily_events insertable by authenticated"
  on daily_events for insert to authenticated with check (true);

create table messenger_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  scene_type text not null,
  scene_title text not null,
  team text,
  participant_refs jsonb not null default '[]'::jsonb,
  lines jsonb not null default '[]'::jsonb,
  forced boolean not null default false,
  created_at timestamptz not null default now()
);
create index messenger_logs_date_idx on messenger_logs (date);

alter table messenger_logs enable row level security;
create policy "messenger_logs readable by authenticated"
  on messenger_logs for select to authenticated using (true);
create policy "messenger_logs insertable by authenticated"
  on messenger_logs for insert to authenticated with check (true);
