create table conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a_type text not null check (participant_a_type in ('profile','npc')),
  participant_a_id text not null,
  participant_b_type text not null check (participant_b_type in ('profile','npc')),
  participant_b_id text not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (participant_a_type, participant_a_id, participant_b_type, participant_b_id)
);

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('profile','npc')),
  sender_id text not null,
  text text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index conversation_messages_conversation_idx on conversation_messages (conversation_id, created_at);

create table talk_memories (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('profile','npc')),
  actor_id text not null,
  target_type text not null check (target_type in ('profile','npc')),
  target_id text not null,
  date date not null,
  topic text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index talk_memories_actor_target_idx on talk_memories (actor_type, actor_id, target_type, target_id);

-- 원본 protagonistRelations의 talkCount/lastTalkDate를 통합 relationships 모델로 옮김
-- (하루 1회 대화 제한 체크에 사용 — lib/game/talk.ts의 hasTalkedToday 참고).
alter table relationships
  add column last_talked_date date,
  add column talk_count int not null default 0;

alter table conversations enable row level security;
create policy "conversations readable by authenticated"
  on conversations for select to authenticated using (true);
create policy "conversations writable by authenticated"
  on conversations for all to authenticated using (true) with check (true);

alter table conversation_messages enable row level security;
create policy "conversation_messages readable by authenticated"
  on conversation_messages for select to authenticated using (true);
-- profile 명의 메시지는 본인만 보낼 수 있음(사칭 방지). npc 명의는 서버 액션이 대신 생성하므로 제한 없음.
create policy "conversation_messages insertable by authenticated"
  on conversation_messages for insert to authenticated
  with check (sender_type = 'npc' or sender_id = auth.uid()::text);

alter table talk_memories enable row level security;
create policy "talk_memories readable by authenticated"
  on talk_memories for select to authenticated using (true);
create policy "talk_memories insertable by authenticated"
  on talk_memories for insert to authenticated with check (true);
