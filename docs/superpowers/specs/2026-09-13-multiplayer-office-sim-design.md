# 두근두근 회사생활 시뮬레이션 — 멀티플레이 전환 설계

## 배경

원본은 단일 HTML 파일(`legacy-reference/원본_V31.html`, 저장소에는 커밋되지 않음, 참고용)로 동작하는 **싱글플레이어** 시뮬레이터다. 플레이어(protagonist) 한 명이 자기 정보를 입력하고, 프리셋 NPC 3명(김팀장/이대리/박과장)과 "하루 진행" 버튼을 눌러가며 특성·케미스트리 기반 랜덤 이벤트, 메신저 대화, 회사 스탯(현금/매출/평판)을 굴리는 구조다. 상태는 `localStorage`에 저장되고 백엔드는 없다.

이번 마이그레이션은 이 게임을 **여러 명이 함께 접속하는 공유 회사 공간**으로 바꾼다: 각자 회원가입 후 자신을 캐릭터로 등록하고, 원본의 프리셋 NPC와 함께 같은 회사에서 지내며, 원본의 대화 구조(일일로그/메신저/대화하기)를 그대로 이용해 대화하고, 원본의 특성/케미/이벤트 시스템이 실제 유저 사이에도 적용된다.

원본에는 대화 관련 기능이 세 갈래로 나뉘어 있다:
- **일일로그**: "하루 진행" 시 생성되는 이벤트를 날짜별로 나열하는 관전용 로그
- **메신저**: 유저의 개입 없이 자동 생성되는 팀/캐릭터 간 잡담 내러티브 로그(`messengerLogs`, 날짜별). 역시 관전용
- **대화하기**: 로스터에서 상대 1명을 선택해 갖는 1:1 대화. 토픽 선택지 + 자유 입력이 가능하고, 상대별로 **하루 1회** 제한이 있음(`talked-today`)

이 세 구조는 그대로 유지하고 포팅한다. UI가 세 탭으로 나뉘어 보기 불편한 점은 인지하고 있으나, 이번 마이그레이션에서는 손대지 않고 기능을 그대로 옮긴 뒤 별도 단계에서 UX를 재설계한다.

## 핵심 결정 사항 (요구사항 정리)

브레인스토밍 과정에서 확정된 사항:

1. **실제 유저 = 캐릭터.** 원본의 특성치·케미스트리·랜덤 이벤트·스탯 관리 시스템은 그대로 실제 유저들 사이의 관계에 적용된다.
2. **하나의 공유 회사.** 여러 회사(방)를 만드는 기능은 없다 — 모든 가입자가 같은 공간에 속한다.
3. **NPC 프리셋 유지.** 원본의 기본 로스터(김팀장/이대리/박과장, 각각의 특성·능력치 포함)를 시드 데이터로 그대로 유지한다. 처음 들어온 유저가 텅 빈 공간을 마주하지 않도록 하기 위함.
4. **"하루 진행"은 아무나 누를 수 있다.** 원본과 동일하게 버튼 기반이며, 하루에 한 번만 진행되도록 서버에서 막는다. 실시간 자동 진행이나 전원 체크인 방식은 채택하지 않음(YAGNI — 구현 복잡도 대비 이득 낮음).
5. **대화 구조는 원본 그대로 유지한다(일일로그/메신저/대화하기).** 공용 채팅방으로 통합하지 않는다. "대화하기"에서 상대(NPC 또는 실제 유저)를 선택해 1:1로 대화하며, NPC는 자동응답한다. 세 탭으로 나뉜 UI가 불편한 점은 인지하되, 이번 마이그레이션에서는 구조를 그대로 옮기고 UX 개선은 이후 별도로 진행한다.
6. **NPC 자동응답은 LLM 없이 원본의 템플릿/랜덤 풀 로직을 재사용한다.** 실제 생성형 AI 연동은 지금 범위에 넣지 않는다(YAGNI, 무료 티어 비용/복잡도 최소화).

## 아키텍처 개요

- **프론트엔드**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **백엔드/DB**: Supabase (Postgres + Auth + Realtime), 무료 티어 기준으로 설계
- **배포**: Vercel
- **상태 동기화**: "대화하기"의 대화 스레드는 Supabase Realtime(Postgres Changes)으로 구독해 상대가 실제 유저일 때 즉시 반영. 그 외(로스터, 회사 스탯, 일일로그, 메신저 로그)는 서버 액션으로 갱신 후 클라이언트에서 재조회(폴링 불필요, 실시간성이 크게 중요하지 않은 관전용 로그이므로).

## 데이터 모델

```
profiles (실제 유저 캐릭터)
  id            uuid PK, references auth.users
  name          text
  gender        text
  team          text
  rank          text
  role          text
  work_style    text
  mbti          text
  traits        text[]
  pref_traits   text[]
  skill         int
  sales         int
  crisis        int
  stress        int
  is_configured boolean default false
  created_at    timestamptz

npcs (프리셋 시드 데이터, 마이그레이션 스크립트로 3명 삽입)
  id            int PK
  name          text
  role          text
  rank          text
  team          text
  work_style    text
  gender        text
  mbti          text
  traits        text[]
  pref_traits   text[]
  skill         int
  sales         int
  crisis        int
  stress        int
  active        boolean default true

company_state (싱글 row)
  id                 int PK (=1 고정)
  day                int
  date               date
  cash               bigint
  revenue            bigint
  clients            int
  reputation         int
  last_advanced_date date   -- 하루 중복 진행 방지용

relationships (캐릭터 쌍 간 케미/호감도)
  id           uuid PK
  actor_type   text  ('profile' | 'npc')
  actor_id     text  (profiles.id 또는 npcs.id)
  target_type  text
  target_id    text
  affinity     int
  memory_log   jsonb
  updated_at   timestamptz
  unique(actor_type, actor_id, target_type, target_id)

daily_events (하루 진행 결과 로그)
  id         uuid PK
  day        int
  date       date
  summary    text
  tone       text  ('warm' | 'conflict' | 'trust' | ...)
  actor_refs jsonb  -- 관련된 캐릭터들
  created_at timestamptz

messenger_logs (메신저 = 관전용 잡담 내러티브, 원본의 messengerLogs 포팅)
  id         uuid PK
  date       date
  team       text nullable   -- 팀 단체 잡담인 경우
  scene_text text
  actor_refs jsonb           -- 등장한 캐릭터들(관계치 갱신 참고용)
  created_at timestamptz

conversations (대화하기 = 두 캐릭터 간 1:1 스레드)
  id      uuid PK
  a_type  text ('profile' | 'npc')
  a_id    text
  b_type  text ('profile' | 'npc')
  b_id    text
  date    date   -- 대화가 시작된 날짜 (하루 1회 제한 체크용)
  -- unique(정렬된 (a_type,a_id) / (b_type,b_id) 쌍, date) 로 같은 날 같은 페어 중복 시작 방지

conversation_messages (대화하기 스레드 내 메시지)
  id              uuid PK
  conversation_id uuid FK -> conversations.id
  sender_type     text ('profile' | 'npc')
  sender_id       text
  content         text
  topic_key       text nullable  -- 원본의 토픽 선택지 사용 시
  created_at      timestamptz
```

RLS(Row Level Security)는 Supabase 기본 정책을 따른다: `profiles`는 본인만 수정 가능(읽기는 인증된 전원), `daily_events`/`messenger_logs`/`company_state`/`npcs`/`relationships`는 인증된 유저 전원 읽기 가능. `conversations`/`conversation_messages`는 해당 대화의 당사자(`a_id`/`b_id`가 본인인 경우)만 읽기 가능. 쓰기는 서버(Service Role) 경유 또는 제한된 정책으로만 허용한다.

## 핵심 플로우

### 1. 온보딩 / 인증
- Supabase Auth(이메일/비밀번호)로 회원가입·로그인.
- 최초 로그인 시 `profiles` row가 없으면 생성(기본값은 원본의 `protagonist` 기본값 재사용) 후 `is_configured=false` 상태.
- `is_configured=false`인 유저는 "내 정보 입력" 폼을 먼저 완료해야 회사 공간(로스터/대화하기/하루진행)에 접근 가능 — 원본의 `isConfigured` 게이트 로직을 그대로 이전.

### 2. "하루 진행"
- 아무 로그인 유저나 버튼 클릭 → 서버 액션 호출.
- 서버 액션은 트랜잭션 내에서 `company_state.last_advanced_date`가 오늘이면 즉시 중단(에러 없이 "오늘은 이미 진행됨" 응답).
- 아니라면: 원본의 이벤트 생성 로직(랜덤 이벤트 풀, 케미 계산, 관계치 갱신)을 TypeScript로 포팅한 순수 함수를 실행 → `daily_events`, `relationships`, `company_state`(day/date/cash 등)를 갱신.
- 같은 로직의 일부로 원본처럼 확률적으로 메신저 "잡담" 시나리오를 생성해 `messenger_logs`에 적재한다(팀 단위 또는 캐릭터 쌍 단위, 실제 유저도 등장 가능).

### 3. 일일로그 / 메신저 (관전용 로그)
- 원본과 동일하게 별도 탭으로 유지: 일일로그는 `daily_events`를, 메신저는 `messenger_logs`를 날짜별로 그룹핑해 보여준다.
- 둘 다 유저가 직접 쓰는 게 아니라 "하루 진행" 시 자동 생성되는 결과물이므로, 실시간 구독 없이 페이지 진입/하루 진행 후 재조회로 충분하다.

### 4. 대화하기 (1:1 대화)
- 유저가 로스터에서 상대(NPC 또는 다른 실제 유저)를 한 명 선택.
- 서버 액션이 오늘 날짜로 그 페어의 `conversations` row가 있는지 조회 → 없으면 생성(원본의 "하루 1회 제한" = 하루에 한 페어당 대화 세션 1개 시작 가능, 그대로 포팅), 있으면 기존 스레드를 이어서 사용.
- 대화 패널은 원본처럼 토픽 선택지 + 자유 입력을 제공한다.
  - **상대가 NPC**: 원본의 대사 풀/선택지 응답 로직을 그대로 포팅해 자동으로 `conversation_messages`에 NPC 응답을 삽입.
  - **상대가 실제 유저**: 상대방이 같은 `conversation_messages`에 메시지를 보낼 수 있다. 이 스레드에 한해 Supabase Realtime을 구독해 상대의 메시지가 즉시 반영되게 한다.
- 인터랙션 모델 자체(하루 1회 제한, 토픽 선택지 UI 등)는 원본을 그대로 따른다. 실사용자 간 자연스러운 채팅으로 개선하는 건 이번 범위에 넣지 않고, 구조를 우선 이전한 뒤 별도 UX 개선 단계에서 다룬다.

## 에러 처리

- "하루 진행" 중복 클릭(레이스 컨디션): DB 트랜잭션 + `last_advanced_date` 체크로 방지. 두 유저가 동시에 눌러도 하루는 한 번만 진행됨.
- `is_configured=false` 유저가 회사 공간 API를 직접 호출: 서버 액션에서 재검증 후 거부.
- Supabase 무료 프로젝트의 "1주일 비활성 시 자동 일시정지": README에 안내 문구 추가, 필요 시 수동으로 Supabase 대시보드에서 재개.

## 테스트 전략

- 포팅된 순수 함수(이벤트 생성, 케미 계산, NPC 대사 선택 로직)는 유닛 테스트로 커버 — 원본 로직을 그대로 옮기는 부분이라 회귀 방지가 중요.
- "하루 진행" 중복 방지 로직은 통합 테스트(같은 날짜에 두 번 호출 시 두 번째는 no-op인지 확인).
- "대화하기" 실시간 동기화(실제 유저 간)는 수동 QA(브라우저 2개 세션)로 검증.

## 범위 밖 (지금은 안 함)

- 여러 회사(방) 생성 기능
- NPC 응답에 실제 LLM 연동
- 전원 출근 체크인 방식의 날짜 진행
- 결제/과금, 알림(푸시/이메일)

## 다음 단계

이 설계를 바탕으로 구현 계획(writing-plans)을 작성한다.
