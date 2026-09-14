# 인간관계 UI / 데이터 초기화 / 대화하기 (AI 연동)

## Context

`docs/superpowers/plans/2026-09-13-day-progression-logs-messenger.md`의 "다음 단계 (별도 플랜)" 4가지 중 3가지(인간관계, 데이터 초기화, 대화하기)를 이번 플랜에서 다룬다. 즐겨찾기 PNG 내보내기는 원본에서도 "우선순위 낮음"이었고 이번 라운드의 가장 큰 과제(대화하기 AI 연동)가 새로 추가되면서 더 미뤄진다.

리서치 중 확인한 사실:
- **`renderRelationshipList`는 원본에서 죽은 코드다** (`getRelation`이 정의되지 않아 호출되면 `ReferenceError`, 대상 DOM 엘리먼트도 없음). 실제로 화면에 렌더되는 건 검색만 되는 `renderRelations()`다. 포팅 대상은 `renderRelations()` + `relationLabel()`이고, "정렬"은 죽은 코드의 정렬 키 이름만 가져와 새로 만든다.
- **`npcs` 테이블에 UPDATE RLS 정책이 없다.** `app/actions/advance-day.ts`가 매일 `npcs.update({stress})`를 호출하지만 정책이 없어 RLS가 조용히 0행을 반환했을 가능성이 높다 (NPC 스트레스가 계속 안 바뀌고 있었을 수 있음). Task 12에서 같이 고친다.

사용자 결정 사항 (확정):
- 데이터 초기화 범위: **시뮬레이션 진행 기록만.** `company_state`/`daily_events`/`messenger_logs`/`relationships`/NPC 스트레스 리셋. 모든 실유저의 내정보(프로필)와 NPC 명단은 그대로.
- 대화하기: **OpenAI API 연동.** 3개 선택지(플레이어 대사)와 NPC 답변 모두 매번 새로 생성, NPC 성격(traits/mbti/workStyle)과 현재 관계를 반영. 키는 `.env.local`에 이미 설정됨 — 실제 AI 경로로 브라우저 검증 가능. 키 없음/API 실패 시엔 원본에서 포팅한 정적 텍스트 뱅크로 폴백.

Task 11 → 12 → 13 순서(작은 것부터)로 각각 독립적으로 구현·커밋한다.

---

## Task 11: 인간관계 브라우징 UI ✅ (커밋 `7095f5b`)

**Files:**
- Modify: `lib/game/relations.ts`, `app/page.tsx`, `components/relationships-panel.tsx`, `components/app-shell.tsx`

- [x] **Step 1: `relationLabel`/`relationshipOverallScore` 포팅**

`lib/game/relations.ts`에 추가:
- `relationLabel(r: RelationEntry): string` — 원본 1860행 `relationLabel` verbatim (conflict≥70→'갈등 심함', trust≥75&&affection≥70→'매우 가까움', trust≥65→'신뢰함', affection≥65→'호감', conflict≥45→'불편함', else '보통').
- `relationshipOverallScore(map, a, b): number` — 원본 `renderRelations()`의 `Math.round(((relationshipScore(a,b)+relationshipScore(b,a))/2+.5)/1.5*100)`.

- [x] **Step 2: 서버에서 workforce + relationships 조회**

`app/page.tsx`: `profiles`를 `id,name`뿐 아니라 관계 계산에 필요한 전체 컬럼으로 조회(`toWorkforceMember`로 정규화), `relationships` 전체 행 조회. `RelationsMap`은 Map으로 직접 넘기지 않고 원시 행 배열로 넘겨 클라이언트에서 재구성(advance-day.ts의 relKey 패턴).

- [x] **Step 3: `RelationshipsPanel` 컴포넌트**

`renderRelations()`(검색, i<j 미정렬 쌍, 이성일 때만 이성 관심/선호 일치 표시, 빈 상태 문구 verbatim)를 포팅하고, 정렬(`affection|trust|conflict|romantic|overall`, desc)을 새로 추가. `overall`은 `relationshipOverallScore` 사용 (죽은 코드의 `affection*.4+trust*.45-conflict*.35` 공식은 쓰지 않음 — 실제 노출된 적 없는 값).

- [x] **Step 4: `app-shell.tsx` 배선**

- [x] **Step 5: 브라우저로 확인**

검색 필터링, 정렬 각 키, 이성 페어에서만 이성 관심/선호 일치 표시되는지 확인.

- [x] **Step 6: Commit**

---

## Task 12: 데이터 초기화 ✅ (커밋 `0f919aa`, 마이그레이션 적용 완료·전체 검증됨)

**Files:**
- Create: `supabase/migrations/0003_reset_policies.sql`, `app/actions/reset-data.ts`
- Modify: `components/reset-data-panel.tsx`

- [x] **Step 1: RLS 마이그레이션**

```sql
create policy "daily_events deletable by authenticated"
  on daily_events for delete to authenticated using (true);
create policy "messenger_logs deletable by authenticated"
  on messenger_logs for delete to authenticated using (true);
create policy "npcs writable by authenticated"
  on npcs for update to authenticated using (true) with check (true);
```
(`relationships`는 이미 `for all`이라 그대로 사용.) NPC 스트레스 silent-failure 버그도 같이 고침 — 커밋 메시지에 명시.

- [x] **Step 2: 사용자가 Supabase SQL Editor에서 직접 적용** (완료)

- [x] **Step 3: `resetSimulationAction()` 서버 액션**

`daily_events`/`messenger_logs`/`relationships` 전체 delete → `npcs` 스트레스를 seed.sql 리터럴 값(`{1:28,2:34,3:22}`)으로 복원 → `company_state`(id=1)를 스키마 기본값으로 복원(day:1, date:'2026-09-10', cash:30000000, revenue:0, clients:0, reputation:50, sales_mode:'balanced', overtime_mode:'normal', last_advanced_date:null, last_manual_chat_day:-999, lead/seller/fire 배정 null) → `revalidatePath('/')`. `profiles`는 건드리지 않음.

- [x] **Step 4: `ResetDataPanel` UI**

경고 문구를 실제 범위로 수정, 네이티브 confirm/alert 대신 인라인 2단계 확인 카드.

- [x] **Step 5: 브라우저로 확인** (마이그레이션 적용 전/후 모두 확인 완료)

마이그레이션 적용 전: `company_state`는 시드값으로 정확히 복원되고, `daily_events`/`messenger_logs`/npcs 스트레스는 RLS에 막혀 조용히 그대로 남는 것을 확인(로직은 맞고 정책만 없던 상태였음을 검증). 사용자가 마이그레이션 적용 후 재실행 → 일일 로그 탭이 "[전체 · 데이터 없음]"으로 실제로 비워지는 것까지 확인 완료.

이 테스트로 실제 공유 시뮬레이션 진행 상황(day 2 → 1, 인간관계·로그·메신저 전부)이 초기화됨 — 사용자에게 공지함.

- [x] **Step 6: Commit**

---

## Task 13: 대화하기 (OpenAI 연동)

가장 큰 작업 — 여러 커밋으로 나눔.

**Files:**
- Create: `supabase/migrations/0004_conversations.sql`, `lib/ai/openai.ts`, `lib/game/talk.ts`, `app/actions/talk.ts`
- Modify: `components/talk-panel.tsx`, `app-shell.tsx`, `app/page.tsx`, `.env.local.example`

- [ ] **Step 1: 스키마 마이그레이션**

`conversations`(참가자 쌍당 1개, canonical key), `conversation_messages`(sender_type/id, text, meta jsonb), `talk_memories`(actor/target, date, topic, text), `relationships`에 `last_talked_date date`/`talk_count int default 0` 컬럼 추가. RLS: 기존 테이블과 같은 "인증되면 전부 읽기/쓰기" 철학이되 `conversation_messages` insert는 `sender_type='npc' or sender_id=auth.uid()::text`로 사칭 방지.

- [ ] **Step 2: `lib/game/talk.ts` — fallback + 관계 로직 (verbatim 포팅)**

`WORKPLACE_TALK_CHOICES`(업무/관계/일상), `stableHash`/`seededUnit`/`shuffledBySeed`(결정적 fallback 선택), `genericChoiceReply`(실제로 실행되는 코드 — `employeeReplyForWorkplaceChoice`의 `switch(choice.id)`는 원본에서도 안 맞는 죽은 코드라 포팅 안 함), `employeeChoiceTone`, `relationDeltaForTalkChoice`(`relationDeltaForWorkplaceChoice` verbatim), `maybeCreateTalkMemory`(`maybeCreateMemory` 포팅 + group/kind→topic 매핑 신규 설계), daily limit(`relation.last_talked_date === companyState.date`).

- [ ] **Step 3: Commit (스키마 + fallback 로직)**

- [ ] **Step 4: `lib/ai/openai.ts`**

`generateTalkChoices(npc, relation)`, `generateNpcReply(npc, relation, choice)`. 키 없음/fetch 실패/timeout/zod 검증 실패 시 `null` 반환(throw 안 함). `kind`는 `genericChoiceReply`가 쓰는 어휘 그대로 zod enum 검증. 프롬프트에 NPC의 name/team/rank/role/mbti/workStyle/traits + 현재 relation 수치 포함. 모델 `gpt-4o-mini`, 선택지는 `json_schema` 구조화 출력.

- [ ] **Step 5: `app/actions/talk.ts`**

`startNpcTalkAction(npcId)`(오늘 이미 대화했는지 체크 → AI 시도 → 실패 시 fallback 3개, DB 쓰기 없음), `sendNpcTalkAction(npcId, choice)`(동시성 재체크 → AI 답변 시도/fallback → conversations/conversation_messages insert → relationDeltaForTalkChoice 적용해 relationships upsert(+last_talked_date, talk_count+1) → maybeCreateTalkMemory → talk_memories insert → revalidatePath), `sendConversationMessageAction(otherActor, text)`(실유저↔실유저, AI 없음, conversation upsert + message insert + last_message_at 갱신).

- [ ] **Step 6: Commit (OpenAI 연동 + 서버 액션)**

- [ ] **Step 7: `TalkPanel` 컴포넌트**

좌측 목록(profiles 본인 제외 + npcs, NPC는 오늘 대화 완료 배지+relationLabel). 우측 — NPC: 관계 미터 + 선택지 로딩 → 3개 버튼 → 결과(말풍선 + 관계 변화 + 추억 박스, 최근 5개). 오늘 이미 했으면 원본 문구 그대로. 우측 — 실유저: 자유 텍스트 입력 + 말풍선 리스트 + Supabase Realtime(`postgres_changes` on `conversation_messages`)로 실시간 반영, 하루 제한 없음.

`.env.local.example`에 `OPENAI_API_KEY=` 추가(값 없이).

- [ ] **Step 8: `app-shell.tsx`/`page.tsx` 배선**

- [ ] **Step 9: 브라우저로 확인**

실제 AI 경로로 확인(선택지가 NPC 성격에 맞는지, 답변 자연스러운지, 관계 수치 변화, 오늘 재시도 시 제한 문구, 실유저 채팅 동작). fallback 경로는 코드 리뷰 수준 확인(필요하면 키를 임시로 틀리게 바꿔 한 번 확인 후 원복).

- [ ] **Step 10: Commit (UI + 배선)**

---

## 다음 단계 (별도 플랜)

- **즐겨찾기 PNG 내보내기**: 계속 낮은 우선순위로 보류.
