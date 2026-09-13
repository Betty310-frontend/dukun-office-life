# 하루 진행 + 일일로그 + 메신저 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원본 프로토타입(`legacy-reference/원본_V31.html`)의 "하루 진행" 버튼 한 번으로 굴러가는 전체 시뮬레이션 엔진(회사 스탯 변화, 직원 스트레스, 사회적 이벤트, 관계치 갱신, 메신저 잡담 생성)을 순수 TypeScript 함수로 포팅하고, Supabase 기반 서버 액션으로 감싸서 "시뮬레이션" 탭의 실제 통계와 "일일 로그"/"메신저" 탭을 완성한다. 이 플랜은 [[2026-09-13-bootstrap-auth-onboarding]] 다음 단계이며, "대화하기"(1:1 실시간 대화) 와 "인간관계"(관계 브라우징 UI)는 이번 범위에 넣지 않고 별도 플랜으로 이어간다 — 단, 그 두 탭이 의존할 `relationships` 테이블 자체와 그 갱신 로직은 하루 진행의 일부이므로 이번에 만든다.

**Architecture:** 원본은 전역 가변 상태(`state`, `people`, `protagonist`, `relations`, `dailyLogs`, `messengerLogs`)를 함수들이 직접 mutate하는 구조다. 이를 그대로 옮기면 서버 액션 하나가 여러 테이블에 원자적으로 반영하기 어렵다. 그래서 이식 방식은:
1. 모든 게임 로직을 **순수 함수**로 포팅한다 (`lib/game/*.ts`) — 전역 상태 대신 명시적 입력(스냅샷)을 받아 명시적 결과(diff)를 반환한다. 각 함수의 원본 공식·확률·문구는 **숫자 하나 바꾸지 않고 그대로** 옮긴다.
2. "하루 진행" 서버 액션이 DB에서 현재 스냅샷(company_state, 전체 workforce, 전체 relationships)을 읽어 → 순수 함수들을 호출해 새 상태를 계산 → 결과를 `company_state`/`daily_events`/`relationships`/`messenger_logs`에 반영한다.

## Global Constraints

- 참고 원본: `legacy-reference/원본_V31.html` (커밋 안 됨, `~/Downloads/두근두근_회사생활_시뮬레이션_V31.html`에서 복사됨 — 없으면 재복사). 설계 스펙: `docs/superpowers/specs/2026-09-13-multiplayer-office-sim-design.md`.
- **단일 주인공 → 다중 실유저 일반화.** 원본은 로컬스토리지 기반 싱글플레이어라 "주인공"(protagonist) 한 명만 존재했다. 이 프로젝트는 여러 실유저가 같은 회사를 공유하므로, 원본의 `protagonistRelations`(주인공-직원 관계)와 `relations`(직원-직원 관계)를 **하나의 `relationships` 테이블로 통합**한다 (`actor_type`/`target_type`이 `'profile'|'npc'`인 방향성 있는 쌍, spec 문서의 스키마 그대로). 원본에서 `protagonistEmployeeInteraction`/`protagonistDailyEvent`가 "그 한 명의 주인공"에 대해 하루 1~3회 실행되던 것을, 이 포팅에서는 **`is_configured=true`인 활성 실유저 프로필 각각에 대해 1회씩** 실행한다(= 내정보를 저장한 모든 유저가 매일 자기 몫의 "주인공 상호작용/하루" 이벤트를 받는다). NPC끼리는 이 로직을 타지 않는다 — 원본에서도 NPC는 상호작용의 대상이지 주체가 아니었다.
- **담당자 배정(업무 배정 카드)의 공유화.** 원본은 `<select>`로 리드/영업/파이어파이터 담당자를 골라도 저장은 UI 상태일 뿐이었다. 여러 유저가 같은 회사를 보는 이 버전에서는 `company_state`에 `lead_actor_type/id`, `seller_actor_type/id`, `fire_actor_type/id` 컬럼을 두어 전원이 같은 값을 보고, 누구나 바꿀 수 있게 한다. 비어 있으면 서버 액션이 자동으로(예: skill/sales/crisis 스탯이 가장 높은 workforce 멤버) 배정한다.
- **원본 버그 발견 — `getRelation` 미정의.** 원본 파일에서 `getRelation(a,b)`가 4곳(`relationshipStatusLabel`, `relationshipOverall`, `renderRelationshipList`, `applyTeamShift`)에서 호출되지만 파일 전체에 정의가 없다(콘솔에서 `ReferenceError`가 나는 죽은 코드 경로로 추정). 포팅 시 이 호출은 전부 **`ensureRelation`으로 대체**한다(동일한 `(a, b)` 시그니처, lazy-init 동작도 동일 — 명백히 의도된 함수였다).
- **범위 밖.** "대화하기"(1:1 대화 스레드) 탭, "인간관계" 브라우징 탭(검색/정렬 UI), "즐겨찾기" PNG 내보내기(canvas), "데이터 초기화" 탭, "로그만 초기화" 버튼 — 전부 이번 플랜에 넣지 않는다. 이미 `components/app-shell.tsx`에 스텁으로 자리 잡혀 있다.
- **RNG는 원본과 동일하게 `Math.random()`을 직접 사용한다** (시드 가능한 RNG로 리팩터하지 않는다 — 원본과 나란히 비교 검증하기 쉽게 유지). 유닛 테스트에서 분기를 고정해야 할 때는 `vi.spyOn(Math, 'random').mockReturnValue(n)`으로 제어한다.
- 텍스트 풀(사회적 이벤트 문구, 메신저 대사 뱅크 등)이 매우 방대한 함수는 아래 각 Step에서 **원본의 정확한 줄 범위**를 명시한다 — 그 구간을 열어 문구·확률·구조를 한 글자도 바꾸지 않고 TypeScript로 옮긴다. 이 플랜 문서 자체에는 전부를 다시 옮겨 적지 않는다(원본이 이미 단일 진실 공급원).
- 패키지 매니저 npm, 커밋은 사용자가 명시적으로 요청할 때만(subagent-driven-development로 실행 중이면 태스크당 커밋 예외 허용 — 이미 사용자 승인됨, 이전 플랜과 동일 조건).
- Next.js 16 `proxy.ts`/서버 액션 관련 규칙은 `AGENTS.md` 그대로 적용.

---

## Task 1: DB 스키마 — company_state / relationships / daily_events / messenger_logs

**Files:**
- Create: `supabase/migrations/0002_day_progression.sql`

**Interfaces:**
- Produces: `company_state`(싱글 row, id=1), `relationships`, `daily_events`, `messenger_logs` 테이블 — 이후 모든 Task가 이 스키마를 사용.

- [x] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/0002_day_progression.sql`:

```sql
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
```

`company_state`/`relationships`/`daily_events`/`messenger_logs`는 "인증된 유저 누구나 쓸 수 있음" 정책으로 연다(스펙 문서의 "서버 Service Role 경유 또는 제한된 정책" 중 후자를 택함 — service role 키 관리를 새로 추가하지 않기 위함). 대신 Task 7의 서버 액션이 `last_advanced_date` 조건부 UPDATE로 실제 게이트를 건다.

- [x] **Step 2: 원격 적용**

```bash
npx supabase db push
```

- [x] **Step 3: 확인**

Supabase 대시보드 Table Editor에서 `company_state`에 1개 row(`day=1, cash=30000000...`), 나머지 3개 테이블이 비어 있는지 확인.

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "Add company_state/relationships/daily_events/messenger_logs schema"
```

---

## Task 2: 날짜/포맷/궁합 유틸 포팅

**Files:**
- Create: `lib/game/format.ts`, `lib/game/date.ts`, `lib/game/relations.ts`, `lib/game/compatibility.ts`
- Test: 각 파일당 `*.test.ts`

**Interfaces:**
- Produces: `fmt`, `clamp`(format.ts) / `formatDate`, `weekdayNameFromDate`, `seasonName`, `isWeekendDate`, `isFridayDate`, `isMonthEndDate`, `addOneDay`, `weekendRecovery`(date.ts) / `hasTrait`, `traitPairScore`, `mbtiCompatibility`, `workStyleCompatibility`, `styleMods`, `roleImpactBonus`, `rankLeadershipBonus`, `traitStressMod`, `traitPerformanceMod`(compatibility.ts) / `ActorRef`, `RelationEntry`, `relKey`, `ensureRelation`, `relationshipScore`, `isOppositeGender`, `preferenceMatch`, `romanticPotential`, `applySocialShift`, `applyTeamShift`, `teamChemistry`(relations.ts) — 이후 모든 Task가 사용.

> **구현 시 조정**: `teamChemistry`는 원래 compatibility.ts에 넣을 계획이었지만, `relationshipScore`(relations.ts)에 의존해서 그대로 두면 relations.ts↔compatibility.ts 순환 참조가 생긴다. compatibility.ts를 의존성 없는 leaf 모듈로 유지하기 위해 `teamChemistry`는 relations.ts로 옮겨 구현했다.

- [x] **Step 1: `lib/game/format.ts`**

원본 1373-1374행 그대로:

```typescript
export const fmt = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR')
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
```

- [x] **Step 2: `lib/game/date.ts`**

원본 1781-1792행의 `parseDate`/`addDays`/`dateISO`/`formatDate`/`weekdayIndexFromDate`/`weekdayNameFromDate`/`isWeekendDate`/`isFridayDate`/`seasonName`/`isMonthEndDate`/`addOneDay`/`weekendRecovery`를 그대로 옮긴다. `WEEKDAYS` 배열은 원본에서 `weekdayNameFromDate`가 참조하는 상수를 찾아(`grep -n "WEEKDAYS" 원본_V31.html`) 같이 옮긴다. 날짜 문자열은 원본과 동일하게 `'YYYY-MM-DD'` 포맷의 UTC 기준으로 다룬다(원본이 `Date.UTC`를 쓰는 이유 — 타임존 버그 방지).

- [x] **Step 3: 실패하는 테스트 작성 → 통과 확인**

`lib/game/date.test.ts`에 최소: `seasonName('2026-09-10')==='가을'`, `weekdayNameFromDate('2026-09-10')`가 목요일, `isWeekendDate`가 토/일만 true, `addOneDay('2026-09-10')==='2026-09-11'`, `isMonthEndDate('2026-09-30')===true` 검증.

- [x] **Step 4: `lib/game/relations.ts`**

원본의 `relations`(NPC↔NPC)와 `protagonistRelations`(주인공↔직원)를 하나로 통합한다(Global Constraints 참고). 원본 1834-1857행 + 2660행대 `ensureProtagonistRelation` + 2024-2032행 `applySocialShift` + 2482-2497행 `applyTeamShift`를 참고해 아래 형태로 재작성:

```typescript
export type ActorType = 'profile' | 'npc'
export interface ActorRef { type: ActorType; id: string }
export interface RelationEntry {
  affection: number
  trust: number
  conflict: number
  romantic: number
}
export type RelationsMap = Map<string, RelationEntry>

export function relKey(a: ActorRef, b: ActorRef): string {
  return `${a.type}:${a.id}>${b.type}:${b.id}`
}

export function ensureRelation(map: RelationsMap, a: ActorRef, b: ActorRef): RelationEntry {
  const k = relKey(a, b)
  let entry = map.get(k)
  if (!entry) {
    entry = { affection: 50, trust: 50, conflict: 10, romantic: 5 }
    map.set(k, entry)
  }
  return entry
}

// 원본 relationshipScore — a===protagonist 분기는 제거(둘 다 ActorRef로 통일했으므로 불필요)
export function relationshipScore(map: RelationsMap, a: ActorRef, b: ActorRef): number {
  const r = ensureRelation(map, a, b)
  return clamp((r.affection * 0.35 + r.trust * 0.45 - r.conflict * 0.5) / 100, -0.5, 1)
}

export function isOppositeGender(a: { gender: string }, b: { gender: string }): boolean {
  return (a.gender === '남성' && b.gender === '여성') || (a.gender === '여성' && b.gender === '남성')
}

// preferenceMatch, romanticPotential: 원본 1848-1858행 그대로, ActorRef 기반으로 조정
// applySocialShift: 원본 2024-2032행 그대로 (ensureRelation(map, a, b) 형태로)
// applyTeamShift: 원본 2482-2497행 그대로, 단 getRelation(a.id,b.id) 호출을 ensureRelation(map, {type:'npc'|'profile',id:a.id}, ...)로 교체(위 버그 노트 참고)
```

`preferenceMatch`/`romanticPotential`/`applySocialShift`/`applyTeamShift`는 원본 소스를 그대로 옮기되 함수 시그니처만 `RelationsMap`을 첫 인자로 받도록 조정한다.

- [x] **Step 5: `lib/game/compatibility.ts`**

원본 1793-1832행(`MBTIS`, `hasTrait`, `traitPairScore`, `mbtiCompatibility`) + `POSITIVE_PAIRS`/`NEGATIVE_PAIRS`(1798-1799행, 총 10+9쌍 — 숫자 그대로) + 1748-1779행(`styleMods`, `roleImpactBonus`, `rankLeadershipBonus`, `ROLE_META`) + 1802-1808행(`traitStressMod`, `traitPerformanceMod`) + 1810-1822행(`workStyleCompatibility`) + 4985-4990행(`teamChemistry`)를 그대로 옮긴다. `traitPairScore`/`hasTrait`가 받는 `p`는 `{ traits: string[] }`를 만족하는 아무 타입이나(profiles row, npcs row 둘 다 해당).

`mbtiCompatibility(a, b)`는 원본에서 MBTI 문자열 2개를 받아 4글자를 인덱스별로 비교한다 — 타입 파라미터는 `string`.

- [x] **Step 6: 테스트 작성 → 통과 확인**

`lib/game/compatibility.test.ts`: `mbtiCompatibility('ENFP','ENFP')`가 `mbtiCompatibility('ENFP','ISTJ')`보다 큰지, `traitPairScore`가 `POSITIVE_PAIRS`/`NEGATIVE_PAIRS`에 정의된 쌍에서 부호가 맞는지(예: 특성 `['협업형','친화적']`을 가진 둘은 양수), `styleMods('협업중시형').team === .05` 같은 리터럴 값 검증.
`lib/game/relations.test.ts`: `ensureRelation`이 없는 키에 기본값(50/50/10/5)을 만드는지, 같은 키로 두 번 부르면 같은 객체 참조를 반환하는지(mutate 가능해야 함), `relationshipScore`가 `-0.5~1` 범위인지.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "Port date/format/compatibility/relations pure logic from legacy prototype"
```

---

## Task 3: 사회적 이벤트 · 주인공 상호작용 · 팀 이벤트 포팅

**Files:**
- Create: `lib/game/social-events.ts`, `lib/game/protagonist-events.ts`, `lib/game/team-events.ts`
- Test: 각 파일당 `*.test.ts`

**Interfaces:**
- Consumes: `lib/game/relations.ts`, `lib/game/compatibility.ts` (Task 2)
- Produces: `dailySocialEvents`, `seasonalSocialEvent`(social-events.ts) / `protagonistEmployeeInteraction`, `protagonistDailyEvent`(protagonist-events.ts) / `teamEvent`(team-events.ts) — Task 6(advanceDay)이 사용.

- [x] **Step 1: `lib/game/social-events.ts`**

원본 2019-2113행(`pickTwo`, `applySocialShift`는 이미 Task 2에서 옮김 — 여기선 재사용, `timedSocialEvent`, `dailySocialEvents`)와 2090-2101행(`seasonalSocialEvent`)을 그대로 옮긴다. 각 슬롯(`출근 전`/`출근길`/`점심시간`/`퇴근길`/`퇴근 후`/`주말`)과 계절(`봄`/`여름`/`가을`/`겨울`)별 문구·확률·`type`(`warm`/`trust`/`awkward`/`conflict`)을 한 글자도 바꾸지 않는다. `pickTwo`는 `activePeople()`(원본) 대신 `workforce: WorkforceMember[]` 배열을 인자로 받도록 시그니처를 조정한다(Task 6에서 workforce를 명시적으로 넘겨야 하므로).

- [x] **Step 2: `lib/game/protagonist-events.ts`**

원본 1524-1533행(`protagonistRoleSynergy`) + 1534-1560행(`protagonistInteractionScore`, `pickProtagonistInteractionPerson`) + 1561-1666행(`workInteractionText`, `socialInteractionText` — 특수 페어 텍스트 `special{}` 포함) + 1667-1732행(`protagonistEmployeeInteraction`, `protagonistDailyEvent`)을 그대로 옮긴다.

이 함수들은 원본에서 전역 `protagonist` 하나를 암묵적으로 참조한다 — 포팅 시 첫 인자로 `me: WorkforceMember`(내정보를 저장한 실유저 1명)를 명시적으로 받도록 시그니처를 바꾼다. `ensureProtagonistRelation(emp.id)` 호출은 `ensureRelation(relationsMap, {type:'profile',id:me.id}, {type: emp가 npc인지 profile인지, id: emp.id})`로 교체한다(Global Constraints의 통합 relations 설계). `protagonistMemories.unshift(...)`(1708, 1730행)는 이번 플랜 범위 밖("대화하기"의 기억 시스템)이므로 **호출을 제거**하고 대신 반환값에 `{ memory?: {personId, topic, text} }`를 얹어 추후 Task가 원하면 쓸 수 있게만 해둔다(저장은 하지 않는다).

- [x] **Step 3: `lib/game/team-events.ts`**

원본 2474-2532행(`teamMembers`, `pickTeamWithAtLeast`, `teamEvent` — `applyTeamShift`는 Task 2에서 이미 옮김)을 그대로 옮긴다. `teamEvent`가 내부에서 `addLogEvent(text,'event')`를 직접 호출하던 것(전역 `currentDayEvents` push)은 제거하고, 대신 함수가 `{ team, members, text, positive } | null`을 반환하도록 한다(원본과 동일 반환값 + 호출부인 Task 6에서 이벤트 배열에 직접 push).

- [x] **Step 4: 테스트 작성 → 통과 확인**

RNG가 섞인 함수들이라 "정확히 어떤 문구가 나오는가"보다 "구조가 맞는가"를 검증한다:
- `dailySocialEvents(weekend, workforce)`가 배열을 반환하고, 각 원소가 비어있지 않은 문자열인지.
- `Math.random`을 `vi.spyOn`으로 0과 0.99에 고정해 `timedSocialEvent`가 각각 good/bad 분기의 문구를 내는지.
- `protagonistEmployeeInteraction`이 호출 후 `relationsMap`의 해당 엔트리를 실제로 변경하는지(affection/trust/conflict 중 하나 이상 원래 값과 달라짐).
- `teamEvent`가 팀원이 2명 미만인 팀만 있을 때 `null`을 반환하는지.

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "Port social/protagonist/team event generators from legacy prototype"
```

---

## Task 4: 메신저 씬 생성기 포팅

**Files:**
- Create: `lib/game/messenger.ts`
- Test: `lib/game/messenger.test.ts`

**Interfaces:**
- Consumes: `lib/game/relations.ts`, `lib/game/compatibility.ts`, `lib/game/team-events.ts`(팀 멤버 조회)
- Produces: `generateDailyMessenger(map, workforce, dateStr): MessengerScene[]` — Task 6과 Task 10(메신저 탭)이 사용.

> **구현 시 조정 2건**: (1) `shortLine`은 원본 파일 전체에서 정의만 되고 어디서도 호출되지 않는 죽은 코드로 확인되어 포팅하지 않았다. (2) `MessengerScene.participants`는 계획 당시 `string[]`(id만)로 적었지만, Task 1에서 `messenger_logs.participant_refs`를 `{type,id,name}` 구조로 설계해둔 것과 맞춰 `ActorRef[]`(`{type,id}`)로 구현했다 — profile/npc가 같은 id 공간을 쓰지 않는다고 보장할 수 없어 type 태그가 필요하다.

- [x] **Step 1: 톤/분위기 유틸 포팅**

원본 2115-2168행(`messengerTone`, `pairMood`, `messengerCloseness`)을 그대로 옮긴다.

- [x] **Step 2: 응답 뱅크 포팅**

원본에서 `messengerWorkReply`(2169행~, budget/conversion/ctr/cpc/creative/tracking 등 주제별 톤 대사), `messengerClientReply`, `messengerCasualReply`를 찾아(`grep -n "^function messenger"`) 전부 그대로 옮긴다 — 각각 톤 5종 × 주제별 대사 배열이며 분량이 크다. 정확한 줄 범위는 grep 결과로 확인해서 그 구간을 통째로 옮길 것(요약하지 말 것).

- [x] **Step 3: 씬 생성기 포팅**

원본 2302-2317행(`performanceMessengerSceneType`) + 2318-2431행(`performanceMessengerLines` — 20개 `sceneType`별 대사, `add(speaker, text)` 헬퍼 포함) + 2433-2457행(`messengerSceneTitle`) + 2459-2472행(`generateMessengerScene`)을 그대로 옮긴다.

```typescript
export interface MessengerLine { speaker: string; text: string }
export interface MessengerScene {
  date: string
  scene: string
  sceneType: string
  participants: string[] // actor id 문자열
  names: string[]
  lines: MessengerLine[]
  forced: boolean
  team?: string
}

export function generateMessengerScene(
  a: WorkforceMember, b: WorkforceMember, dateStr: string, forced = false
): MessengerScene { /* 원본 그대로 */ }
```

- [x] **Step 4: 일일 메신저 오케스트레이터 포팅**

원본 2535-2590행(`generateDailyMessenger`)을 그대로 옮긴다 — 씬 개수 결정(workforce 2명이면 1개, 4명 이상 2개, 7명 이상 45% 확률로 3개), 중복 페어 방지, 34% 확률로 팀 단위 대화 추가(3인일 때 `third` 대사 로직 포함). `activePeople()`은 `workforce` 파라미터로 교체한다. **원본과의 의도적 차이**: 원본은 NPC끼리만 페어링했지만(`people` 배열 = NPC뿐), 이 포팅에서는 `workforce`에 실유저 프로필도 포함되므로 자연스럽게 실유저도 메신저에 등장할 수 있다(spec 문서에 명시된 의도된 확장).

- [x] **Step 5: 테스트 작성 → 통과 확인**

`generateMessengerScene`이 항상 `lines.length >= 2`인지, `messengerSceneTitle`이 20개 `sceneType` 전부에 대해 빈 문자열이 아닌 제목을 반환하는지, `generateDailyMessenger`가 workforce 1명일 때 빈 배열을 반환하는지, workforce 4명일 때 씬이 최소 1개 이상 생기는지(`Math.random` 목킹으로 팀 대화 분기 끄고 검증).

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "Port messenger scene generator from legacy prototype"
```

---

## Task 5: 일일 로그 카테고리 분류 포팅

**Files:**
- Create: `lib/game/log-category.ts`
- Test: `lib/game/log-category.test.ts`

**Interfaces:**
- Produces: `categorizeLog(text, isWeekend): LogCategory`, `normalizeLogText(text): string` — Task 6과 Task 9(일일 로그 탭)가 사용.

- [x] **Step 1: 구현**

원본 5011-5021행(`normalizeLogText`) + 5039-5047행(`categorizeLog`)을 정규식까지 그대로 옮긴다:

```typescript
export type LogCategory = 'work' | 'offwork' | 'commute' | 'weekend' | 'season'

export function categorizeLog(text: string, isWeekend = false): LogCategory {
  const t = String(text || '')
  if (/\[계절|봄|여름|가을|겨울|기념일|연말|크리스마스|새해|벚꽃/.test(t)) return 'season'
  if (/\[주말\]|주말|휴식일|공휴일/.test(t) || isWeekend) return 'weekend'
  if (/\[출근 전\]|\[출근길\]|\[점심시간\]|\[퇴근길\]|\[퇴근 후\]|출근 전|출근길|점심시간|퇴근길|퇴근 후/.test(t)) return 'commute'
  if (/팀 회식|팀 점심|팀 잡담/.test(t)) return 'offwork'
  if (/수주|광고주|업무|협업|성과|캠페인|매출|손익|처리 용량|평판|스트레스|월말 정산|인건비|운영비|위기|결재|디자인|전환|실무|팀 회의|팀 협업/.test(t)) return 'work'
  return 'offwork'
}
```

`normalizeLogText`도 원본의 제어문자 제거/개행 정리 정규식 그대로.

- [x] **Step 2: 테스트 작성 → 통과 확인**

원본 순서(계절 → 주말 → 출퇴근 → 팀 오프워크 → 업무 → 기본값 offwork)가 그대로 지켜지는지 확인하는 케이스를 각 분기당 1개 이상 작성(예: `categorizeLog('[출근길] ...', false)==='commute'`, `categorizeLog('아무 일 없었다', false)==='offwork'`).

- [x] **Step 3: Commit**

```bash
git add -A
git commit -m "Port daily log categorization logic from legacy prototype"
```

---

## Task 6: `advanceDay` 오케스트레이터 포팅 (하루 진행 핵심 로직)

**Files:**
- Create: `lib/game/advance-day.ts`
- Test: `lib/game/advance-day.test.ts`

**Interfaces:**
- Consumes: Task 2~5의 모든 `lib/game/*.ts`
- Produces: `advanceDay(input: AdvanceDayInput): AdvanceDayResult` — Task 7(서버 액션)이 사용. 이 함수는 **DB도, DOM도 모른다** — 순수 계산만.

- [x] **Step 1: 입출력 타입 정의**

```typescript
export interface WorkforceMember {
  actorType: 'profile' | 'npc'
  actorId: string
  name: string
  team: string
  rank: string
  role: string
  workStyle: string
  gender: string
  mbti: string
  traits: string[]
  prefTraits: string[]
  skill: number
  sales: number
  crisis: number
  stress: number
}

export interface AdvanceDayInput {
  currentDay: number
  currentDate: string // 'YYYY-MM-DD'
  companyState: { cash: number; revenue: number; clients: number; reputation: number }
  salesMode: 'safe' | 'balanced' | 'aggressive'
  overtimeMode: 'none' | 'normal' | 'hard'
  workforce: WorkforceMember[] // 활성 npc + is_configured 실유저 전원
  protagonists: WorkforceMember[] // workforce의 부분집합 — actorType==='profile'인 것들
  lead: WorkforceMember
  seller: WorkforceMember
  fire: WorkforceMember
  relations: RelationsMap // Task 2에서 DB로부터 미리 로드해 넘김 — 이 함수가 in-place mutate
}

export interface AdvanceDayResult {
  events: { text: string; type: 'summary' | 'event'; isProtagonist: boolean }[]
  companyState: { cash: number; revenue: number; clients: number; reputation: number }
  workforceStress: Record<string, number> // actorId -> 새 stress
  messengerScenes: MessengerScene[]
}
```

- [x] **Step 2: 원본 로직 이식**

원본 5605-5717행(`runDay`)을 위 입출력 구조에 맞게 옮긴다. 대응 관계:
- `activePeople()`/`[...ap, protagonist]` → `input.workforce`
- `state.cash`/`revenue`/`clients`/`reputation` mutate → 지역 변수로 복사해 계산 후 `result.companyState`로 반환(원본 공식 그대로: payroll/overhead/주말 분기/평일 매출·평판·위기 이벤트 로직 전부 5623-5670행 그대로)
- `workforce.forEach(p=>{...p.stress=clamp(...)})` → `result.workforceStress[p.actorId] = ...` 로 모아서 반환(원본 공식 그대로, `relAvg` 계산에 `relationshipScore(input.relations, ...)` 사용)
- `dailySocialEvents(weekend)` 호출(원본 5672행) → Task 3의 `dailySocialEvents(weekend, input.workforce, input.relations)`
- `isProtagonistConfigured()` 분기(원본 5658-5661, 5673-5696행) → **`input.protagonists` 배열을 순회하며 프로필 각각에 대해** `protagonistEmployeeInteraction`/`protagonistDailyEvent`/역할 텍스트 이벤트를 실행(Global Constraints의 다중 실유저 일반화)
- `if(Math.random()<...)teamEvent(...)` (원본 5712행) → Task 3의 `teamEvent(input.workforce, input.relations, currentDate, weekend)`, 반환값이 있으면 `events`에 push
- `generateDailyMessenger(currentDate)` (원본 5714행) → Task 4의 `generateDailyMessenger(input.workforce, input.relations, currentDate)` 호출 결과를 `result.messengerScenes`로
- `currentDayEvents=[...]` 조립(원본 5706-5711행: summary 2줄 + protagonistEvents + events) 그대로 `result.events` 배열 구성. `saveCurrentDayLog`가 하던 `category`/`protagonist` 태깅은 여기서 하지 않는다 — Task 7이 DB insert 시점에 `categorizeLog`(Task 5)를 적용한다.

`getPerson`/`$(id).value` 같은 DOM 읽기는 전부 제거하고 `input.lead`/`input.seller`/`input.fire`/`input.salesMode`/`input.overtimeMode`로 대체한다. `alert(...)`/`openMeTab()`(원본 5606-5611행, 미설정 주인공 경고)은 **호출부(서버 액션)의 책임**이므로 이 함수에는 없다 — advanceDay는 항상 workforce가 유효하다고 가정.

- [x] **Step 3: 테스트 작성 → 통과 확인**

`lib/game/advance-day.test.ts`:
- 평일 입력 시 `result.companyState.revenue`가 0보다 큰지(광고주 0곳이 아닌 fixture 기준), 주말 입력 시 `revenue===0`이고 이벤트에 "휴식일" 문구가 포함되는지.
- `result.events[0].type==='summary'`이고 날짜/요일/계절 텍스트를 포함하는지.
- `protagonists`에 유저 1명을 넣으면 `events`에 `isProtagonist:true`인 항목이 최소 1개 이상 나오는지(`Math.random`을 0으로 고정해 확률 분기를 강제 통과시켜 검증).
- 3명 workforce로 `relations` 맵을 사전에 채워둔 뒤 호출하면, 최소 하나의 관계 엔트리 값이 호출 전후로 달라지는지(사회적 이벤트 또는 팀 이벤트가 반드시 하나는 굴러가도록 `Math.random` 고정).
- `cash`가 음수로 갈 수 있는 극단 입력(광고주 0, 인원 많음)에서도 `NaN`이 나오지 않는지.

- [x] **Step 4: Commit**

```bash
git add -A
git commit -m "Port runDay orchestrator as pure advanceDay function"
```

---

## Task 7: "하루 진행" 서버 액션

**Files:**
- Create: `app/actions/advance-day.ts`

**Interfaces:**
- Consumes: `lib/game/advance-day.ts`(Task 6), `lib/game/log-category.ts`(Task 5), `lib/supabase/server.ts`
- Produces: `advanceDayAction(): Promise<{ ok: boolean; message: string }>` — Task 8(시뮬레이션 탭)의 "하루 진행" 버튼이 호출.

> **구현 시 조정**: 위 스켈레톤의 `WorkforceMember`는 `@/lib/game/advance-day`가 아니라 `@/lib/game/types`에서 export된다.
> 또한 필드명은 `w.actorType`이 아니라 `w.type`(`ActorRef`를 상속하는 `RelatablePerson`의 필드명 그대로)이다 — 스켈레톤 코드를 그대로 베끼면 타입 에러가 난다.

- [x] **Step 1: 동시성 게이트 + 데이터 조회 + 호출 + 반영**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { advanceDay, type WorkforceMember } from '@/lib/game/advance-day'
import { categorizeLog } from '@/lib/game/log-category'
import type { RelationsMap } from '@/lib/game/relations'
import { revalidatePath } from 'next/cache'

export async function advanceDayAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { data: cs } = await supabase.from('company_state').select('*').eq('id', 1).single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  // 동시성 가드: 오늘 이미 진행됐으면 조건부 업데이트가 0행 반환
  const { data: gated } = await supabase
    .from('company_state')
    .update({ last_advanced_date: cs.date })
    .eq('id', 1)
    .neq('last_advanced_date', cs.date) // last_advanced_date가 오늘이 아닐 때만
    .select()
    .maybeSingle()
  if (!gated) return { ok: false, message: '오늘은 이미 진행되었습니다.' }

  const [{ data: profiles }, { data: npcs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('is_configured', true),
    supabase.from('npcs').select('*').eq('active', true),
  ])

  const workforce: WorkforceMember[] = [
    ...(profiles ?? []).map(p => toWorkforceMember('profile', p)),
    ...(npcs ?? []).map(n => toWorkforceMember('npc', n)),
  ]
  const protagonists = workforce.filter(w => w.actorType === 'profile')
  if (workforce.length === 0) return { ok: false, message: '진행할 인력이 없습니다.' }

  const { data: relRows } = await supabase.from('relationships').select('*')
  const relations: RelationsMap = new Map(
    (relRows ?? []).map(r => [`${r.actor_type}:${r.actor_id}>${r.target_type}:${r.target_id}`, r])
  )

  const lead = pickAssigned(workforce, cs.lead_actor_type, cs.lead_actor_id, 'skill')
  const seller = pickAssigned(workforce, cs.seller_actor_type, cs.seller_actor_id, 'sales')
  const fire = pickAssigned(workforce, cs.fire_actor_type, cs.fire_actor_id, 'crisis')

  const result = advanceDay({
    currentDay: cs.day,
    currentDate: cs.date,
    companyState: cs,
    salesMode: cs.sales_mode,
    overtimeMode: cs.overtime_mode,
    workforce, protagonists, lead, seller, fire, relations,
  })

  // 반영: company_state, workforce stress(profiles/npcs), relationships, daily_events, messenger_logs
  // ... (세부 upsert는 구현 시 배치로 — Supabase 다중 row upsert 활용)

  revalidatePath('/')
  return { ok: true, message: '하루가 진행되었습니다.' }
}
```

세부 반영 로직(구현 시 채울 것):
- `company_state`: `cash/revenue/clients/reputation/day/date` 갱신 + `date = addOneDay(cs.date)`(Task 2의 `addOneDay`).
- `profiles`/`npcs`의 `stress` 컬럼을 `result.workforceStress`로 개별 update(또는 `upsert` 배치).
- `relations` Map 전체를 `relationships` 테이블에 batch upsert(변경분만 추려도 되고, 간단히 전체 재upsert해도 워크포스 규모상 무방).
- `result.events`를 `daily_events`에 insert — 각 항목에 `day: cs.day, date: cs.date, category: categorizeLog(text, isWeekendDate(cs.date)), is_protagonist`를 채워서.
- `result.messengerScenes`를 `messenger_logs`에 insert.

- [x] **Step 2: 브라우저로 수동 검증** (Task 8 Step 5에서 함께 수행 — 그 과정에서 발견/수정한 버그 2건은 Task 8 Step 5 기록 참고)

`npm run dev` → 로그인 → 시뮬레이션 탭에서 하루 진행 → Supabase 대시보드에서 `company_state.day`가 2로, `daily_events`/`messenger_logs`에 row가 생겼는지 확인. 연속 두 번 호출해서 두 번째는 "오늘은 이미 진행되었습니다"가 뜨는지 확인.

- [x] **Step 3: Commit**

```bash
git add -A
git commit -m "Add advanceDay server action wiring the day-progression engine to Supabase"
```

---

## Task 8: 시뮬레이션 탭 — 실제 통계 + 하루 진행 버튼 + 담당자 배정

**Files:**
- Modify: `app/page.tsx`, `components/app-shell.tsx`
- Create: `app/actions/company-state.ts`(담당자 배정 저장용 서버 액션)

**Interfaces:**
- Consumes: `company_state` 테이블, Task 7의 `advanceDayAction`
- Produces: 시뮬레이션 탭에 실통계/하루 진행 버튼이 연결됨 — `components/app-shell.tsx`의 "준비 중" 자리를 대체.

- [ ] **Step 1: `app/page.tsx`에서 `company_state` 조회 추가**

`profile`/`npcs`와 함께 `company_state` row를 조회해 `AppShell`에 prop으로 내려준다.

- [ ] **Step 2: 통계 카드를 실데이터로 교체**

`components/app-shell.tsx`의 현금/오늘 매출/광고주/회사 평판 4개 카드(현재 "준비 중" 고정 텍스트)를 `fmt(companyState.cash)`/`fmt(companyState.revenue)`/`${companyState.clients}곳`/`Math.round(companyState.reputation)`로 교체(Task 2의 `fmt` 사용).

- [ ] **Step 3: "하루 진행" 버튼 연결**

"준비 중" 안내 문구를 제거하고 원본처럼 primary 버튼(`🎲 하루 진행`)을 추가, 클릭 시 `advanceDayAction()` 서버 액션 호출 → 결과 메시지를 토스트/인라인으로 표시 → 성공 시 `router.refresh()`로 최신 통계 반영. 로딩 중 중복 클릭 방지(버튼 `disabled` + `useTransition`).

- [ ] **Step 4: 업무 배정 카드 추가**

원본의 "🗂️ 업무 배정" 카드(핵심 광고주 담당자/신규 영업 담당자/긴급 이슈 대응 담당자 3개 select, 원본 1182행)를 이식한다. `workforce`(profiles+npcs) 목록으로 옵션을 채우고, 선택 시 `company-state.ts`의 서버 액션으로 `company_state.lead_actor_type/id` 등을 저장한다.

- [ ] **Step 5: 브라우저로 확인**

로그인 → 시뮬레이션 탭에서 담당자 배정 → 하루 진행 클릭 → 통계가 실제로 바뀌는지, 두 번째 클릭 시 "오늘은 이미 진행되었습니다" 안내가 뜨는지 확인. 모바일 뷰(390px)에서도 버튼/카드가 깨지지 않는지 확인.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Wire simulation tab to real company_state and advance-day action"
```

---

## Task 9: 일일 로그 탭

**Files:**
- Modify: `components/app-shell.tsx`
- Create: `components/daily-log-panel.tsx`

**Interfaces:**
- Consumes: `daily_events` 테이블
- Produces: 일일 로그 탭에서 날짜별/카테고리별 로그 열람.

- [ ] **Step 1: 서버에서 최근 로그 조회**

`app/page.tsx`(또는 로그 탭 전용 서버 컴포넌트)에서 `daily_events`를 `date desc, created_at asc`로 조회(최근 N일 또는 전체 — 우선 전체, 필요시 이후 페이지네이션).

- [ ] **Step 2: `DailyLogPanel` 컴포넌트**

원본의 `renderLogViewer`(날짜 필터 + 카테고리 필터: 전체/업무/업무외 이벤트/출퇴근·점심·퇴근후/주말·공휴일/계절·기념일 이벤트)를 참고해 날짜별로 묶어 카드 리스트로 렌더링. 카테고리 필터는 클라이언트 상태(`useState`)로 처리(이미 로드된 전체 로그를 필터링 — 서버 재조회 불필요). `is_protagonist` 항목은 원본처럼 살짝 다른 배경색(핑크 톤)으로 강조.

- [ ] **Step 3: `app-shell.tsx`의 로그 스텁을 `DailyLogPanel`로 교체**

- [ ] **Step 4: 브라우저로 확인**

하루 진행을 2~3회 실행한 뒤 일일 로그 탭에서 날짜별로 잘 묶이는지, 카테고리 필터가 동작하는지, 모바일에서도 읽기 편한지 확인.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add daily log tab reading from daily_events"
```

---

## Task 10: 메신저 탭

**Files:**
- Modify: `components/app-shell.tsx`
- Create: `components/messenger-panel.tsx`, `app/actions/manual-chat.ts`

**Interfaces:**
- Consumes: `messenger_logs` 테이블, `lib/game/messenger.ts`(Task 4)의 `generateMessengerScene`
- Produces: 메신저 탭에서 날짜별 대화 열람 + "랜덤 상황 대화 만들기"(3일 쿨다운) 수동 트리거.

- [ ] **Step 1: 서버에서 메신저 로그 조회**

`messenger_logs`를 `date desc`로 조회.

- [ ] **Step 2: `MessengerPanel` 컴포넌트**

원본의 `messenger-grid`(좌측 날짜 리스트 + 우측 채팅창) 레이아웃을 이식. 날짜 클릭 시 그 날의 씬들을 채팅 버블(`speaker`별 좌/우 정렬, 원본 `.bubble`/`.bubble.me` 스타일 참고)로 표시. 모바일에서는 1열로 스택.

- [ ] **Step 3: 수동 매칭 서버 액션**

`app/actions/manual-chat.ts`: `company_state.last_manual_chat_day`와 `company_state.day`를 비교해 3일 쿨다운 체크(원본 2640행 `canManualChat` 그대로: `day - lastManualChatDay >= 3`), 통과하면 두 workforce 멤버를 받아 `generateMessengerScene(a, b, today, true)` 호출 후 `messenger_logs`에 insert, `company_state.last_manual_chat_day = day` 갱신.

- [ ] **Step 4: `app-shell.tsx`의 메신저 스텁을 `MessengerPanel`로 교체**

두 직원 선택 select + "랜덤 상황 대화 만들기" 버튼(쿨다운 안내 텍스트 포함, 원본 1236-1243행 참고) 포함.

- [ ] **Step 5: 브라우저로 확인**

하루 진행 후 메신저 탭에서 자동 생성된 씬이 보이는지, 수동 매칭이 쿨다운 규칙대로 동작하는지(3일 이내 재시도 시 버튼 비활성/안내 문구) 확인.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add messenger tab with auto-generated scenes and manual matching"
```

---

## 다음 단계 (별도 플랜)

- **대화하기**: 실유저-실유저/실유저-NPC 1:1 대화 스레드(`conversations`/`conversation_messages`, Supabase Realtime 구독), NPC 자동응답, 하루 1회 제한.
- **인간관계**: 관계 브라우징 UI(검색/정렬, 원본의 `renderRelationshipList` 포팅) — 이번 플랜이 만든 `relationships` 테이블을 읽기만 하면 되므로 백엔드 작업은 거의 없음.
- **데이터 초기화**: 시뮬레이션 진행 기록(로그/관계/회사 상태) 리셋 플로우.
- **즐겨찾기 PNG 내보내기**: 우선순위 낮음(원본에서도 `localStorage` 기반 부가 기능).
