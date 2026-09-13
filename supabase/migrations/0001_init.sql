create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  gender text not null default '여성',
  team text not null default '기획1팀',
  rank text not null default '사원',
  role text not null default 'AE',
  work_style text not null default '협업중시형',
  mbti text not null default 'ENFP',
  traits text[] not null default array['친화적', '공감형'],
  pref_traits text[] not null default array[]::text[],
  skill int not null default 70,
  sales int not null default 50,
  crisis int not null default 60,
  stress int not null default 25,
  is_configured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

create table npcs (
  id int primary key,
  name text not null,
  role text not null,
  rank text not null,
  team text not null,
  work_style text not null,
  gender text not null,
  mbti text not null,
  traits text[] not null default array[]::text[],
  pref_traits text[] not null default array[]::text[],
  skill int not null,
  sales int not null,
  crisis int not null,
  stress int not null,
  active boolean not null default true
);

alter table npcs enable row level security;

create policy "npcs are viewable by authenticated users"
  on npcs for select
  to authenticated
  using (true);
