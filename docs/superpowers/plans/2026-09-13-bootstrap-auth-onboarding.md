# 부트스트랩 + 인증 + 온보딩 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + Supabase 프로젝트를 부트스트랩하고, 회원가입/로그인, "내 정보 입력"(캐릭터 온보딩)까지 마친 유저가 자신의 프로필과 시드된 NPC 로스터를 볼 수 있는 첫 화면을 완성한다. 이 플랜은 전체 멀티플레이 시뮬레이션의 첫 번째 수직 슬라이스이며, 이후 "하루 진행"/일일로그·메신저/대화하기는 별도 플랜으로 이어간다.

**Architecture:** Next.js (App Router, TypeScript) 프론트엔드 + Supabase(Postgres/Auth) 백엔드. 인증은 `@supabase/ssr`로 쿠키 기반 세션을 관리하고, 미들웨어에서 세션을 갱신하며 미설정 프로필은 온보딩으로 리다이렉트한다. UI는 Tailwind + shadcn/ui.

**Tech Stack:** Next.js 15+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest(순수 로직 유닛 테스트), Zod(폼 검증).

## Global Constraints

- 참고 스펙: `docs/superpowers/specs/2026-09-13-multiplayer-office-sim-design.md`
- 원본 파일(`legacy-reference/원본_V31.html`)은 참고용이며 git에 커밋하지 않는다 (`.gitignore`에 이미 등록됨).
- 하나의 공유 회사 공간만 존재한다 (여러 회사/방 생성 기능 없음).
- NPC 프리셋 3명(김팀장/이대리/박과장)은 시드 데이터로 유지한다.
- 커밋은 사용자가 명시적으로 지시할 때만 한다 — 이 플랜의 각 태스크 끝에 있는 "Commit" 스텝은 사용자가 커밋을 요청했을 때만 실행하고, 그 전까지는 변경사항을 스테이징하지 않은 채로 둔다. (단, 이 플랜을 subagent-driven-development로 실행하는 동안에는 태스크당 커밋이 예외적으로 허용됨 — 사용자 승인됨.)
- 패키지 매니저는 npm을 사용한다.
- 이 프로젝트의 Next.js 버전(16.x)은 학습 데이터 시점 이후 API가 바뀌었을 수 있다 — Next.js 관련 파일을 작성하기 전에 `node_modules/next/dist/docs/01-app/`에서 관련 문서를 확인한다. 이미 확인된 것: **미들웨어 파일 컨벤션은 `middleware.ts`가 아니라 `proxy.ts`이고, export하는 함수명도 `middleware`가 아니라 `proxy`다** (`lib/supabase/middleware.ts` 같은 일반 헬퍼 모듈 이름은 영향 없음, 프로젝트 루트의 특수 파일 컨벤션만 해당).

---

## Task 1: Next.js 프로젝트 부트스트랩

**Files:**
- Create: 프로젝트 루트에 Next.js 표준 구조 전체 (`app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind` 설정은 Next.js 15 기본값인 `@tailwindcss/postcss` 사용)
- 기존 파일(`README.md`, `.gitignore`, `docs/`, `legacy-reference/`)은 보존한다.

**Interfaces:**
- Produces: `app/layout.tsx`, `app/page.tsx` — 이후 모든 태스크가 이 App Router 구조 위에 라우트를 추가한다.

- [ ] **Step 1: 임시 디렉터리에 Next.js 프로젝트 생성**

`create-next-app`은 빈 디렉터리가 아니면 실패하므로, 임시 폴더에 만든 뒤 옮긴다.

```bash
cd /Users/hanhyegyeong/Documents/dukun-office-life
npx create-next-app@latest tmp-scaffold \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias "@/*" \
  --use-npm --no-git
```

- [ ] **Step 2: 생성된 파일을 프로젝트 루트로 이동**

```bash
cd /Users/hanhyegyeong/Documents/dukun-office-life
shopt -s dotglob
mv tmp-scaffold/* .
rmdir tmp-scaffold
```

`README.md`는 create-next-app이 새로 만든 것으로 덮어쓰지 않도록, 이동 전에 기존 `README.md`를 백업했다가 복원한다:

```bash
cp README.md /tmp/dukun-office-life-README.md.bak
# (Step 2의 mv 실행 후, create-next-app이 만든 README.md를 기존 것으로 교체)
cp /tmp/dukun-office-life-README.md.bak README.md
```

- [ ] **Step 3: 개발 서버가 뜨는지 확인**

Run: `npm run dev` (백그라운드 실행 후 아래 curl로 확인, 확인되면 서버 종료)
Expected: `http://localhost:3000` 요청 시 Next.js 기본 페이지 HTML 응답 (200 OK)

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

- [ ] **Step 4: `.gitignore` 병합 확인**

create-next-app이 생성한 `.gitignore`(node_modules, .next 등)와 기존 `.gitignore`(legacy-reference 제외 등)을 합쳐서 둘 다 포함되게 한다. `node_modules/`, `.next/`, `legacy-reference/`가 모두 들어있는지 확인.

- [ ] **Step 5: Commit** (사용자가 커밋을 요청하면 실행)

```bash
git add -A
git commit -m "Bootstrap Next.js (App Router + TypeScript + Tailwind) project"
```

---

## Task 2: shadcn/ui 설정 + 기본 컴포넌트 추가

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/card.tsx`, `components/ui/form.tsx`

**Interfaces:**
- Produces: `cn()` 유틸(`lib/utils.ts`), `Button`/`Input`/`Label`/`Card`/`Form` 컴포넌트 — 이후 모든 폼/화면 태스크가 사용.

- [ ] **Step 1: shadcn 초기화**

```bash
npx shadcn@latest init -d
```

`-d`는 기본값(New York 스타일, Zinc 베이스 컬러, CSS 변수 사용)으로 프롬프트 없이 진행한다.

- [ ] **Step 2: 필요한 컴포넌트 추가**

```bash
npx shadcn@latest add button input label card form
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공 (기본 페이지만 있는 상태)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add shadcn/ui setup with base components"
```

---

## Task 3: Vitest 테스트 러너 설정

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (test 스크립트 추가)
- Create: `lib/sample.test.ts` (설정 확인용, 완료 후 삭제)

**Interfaces:**
- Produces: `npm test` 명령 — 이후 태스크의 순수 로직 유닛 테스트가 이 러너로 실행됨.

- [ ] **Step 1: 패키지 설치**

```bash
npm install -D vitest
```

- [ ] **Step 2: `vitest.config.ts` 작성**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

- [ ] **Step 3: `package.json`에 test 스크립트 추가**

`"scripts"` 객체에 다음을 추가:

```json
"test": "vitest run"
```

- [ ] **Step 4: 설정 확인용 샘플 테스트 작성**

`lib/sample.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: 테스트 실행 확인**

Run: `npm test`
Expected: PASS (1 test)

- [ ] **Step 6: 샘플 테스트 삭제**

```bash
rm lib/sample.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add Vitest test runner"
```

---

## Task 4: Supabase 프로젝트 연결

**사용자 수동 작업 (코드 작성 전 선행):**
1. https://supabase.com 에서 새 프로젝트를 생성한다 (무료 티어).
2. 프로젝트 대시보드 → Project Settings → API에서 `Project URL`과 `anon` / `publishable` key를 확인한다.
3. 이 값을 다음 단계에서 만들 `.env.local`에 넣는다.

**Files:**
- Create: `.env.local` (git에 커밋되지 않아야 함 — create-next-app 기본 `.gitignore`에 이미 `.env*` 포함되어 있는지 확인)
- Create: `.env.local.example` (실제 값 없이 키 이름만, 커밋 대상)
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `proxy.ts` (프로젝트 루트 — Next.js 16의 `middleware.ts` 파일 컨벤션이 deprecated되고 이름이 바뀐 것)

**Interfaces:**
- Produces: `createClient()` (브라우저용, `lib/supabase/client.ts`), `createClient()` (서버용, `lib/supabase/server.ts`, `Promise<SupabaseClient>` 반환), `updateSession(request: NextRequest)` (`lib/supabase/middleware.ts`, `Promise<NextResponse>` 반환) — 이후 모든 인증/DB 접근 태스크가 이 함수들을 사용.

- [ ] **Step 1: 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: 환경변수 파일 작성**

`.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` (사용자가 실제 값 채워넣음, 커밋 안 함):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
```

`.gitignore`에 `.env.local`이 이미 포함되어 있는지 확인하고, 없으면 추가한다.

- [ ] **Step 3: 브라우저 클라이언트 작성**

`lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

- [ ] **Step 4: 서버 클라이언트 작성**

`lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출된 경우 무시 (미들웨어가 세션을 갱신함)
          }
        },
      },
    }
  )
}
```

- [ ] **Step 5: 미들웨어 세션 갱신 로직 작성**

`lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { claims } } = await supabase.auth.getClaims()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup')

  if (!claims && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 6: 루트 Proxy 등록**

이 프로젝트가 쓰는 Next.js 16부터 `middleware.ts` 파일 컨벤션은 deprecated이고 `proxy.ts`로 이름이 바뀌었다(export하는 함수명도 `middleware`→`proxy`). 반드시 `proxy.ts`로 만든다 — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` 참고.

`proxy.ts` (프로젝트 루트):

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

(`lib/supabase/middleware.ts`는 헬퍼 모듈일 뿐 Next.js의 특수 파일 컨벤션이 아니므로 이름을 바꿀 필요 없다. Next.js가 특수하게 인식하는 건 프로젝트 루트의 `proxy.ts`뿐이다.)

- [ ] **Step 7: 로그인 없이 접근 시 `/login`으로 리다이렉트되는지 수동 확인**

```bash
npm run dev
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/
```

Expected: 307/308 리다이렉트, `redirect_url`이 `/login`을 가리킴.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Connect Supabase (SSR client/server/middleware helpers)"
```

---

## Task 5: DB 스키마 마이그레이션 (profiles, npcs) + NPC 시드

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces: `profiles` 테이블 (컬럼: `id uuid PK references auth.users`, `name text`, `gender text`, `team text`, `rank text`, `role text`, `work_style text`, `mbti text`, `traits text[]`, `pref_traits text[]`, `skill int`, `sales int`, `crisis int`, `stress int`, `is_configured boolean`, `created_at timestamptz`), `npcs` 테이블 (동일 스탯 컬럼 + `active boolean`) — 이후 온보딩/로스터 태스크가 이 스키마를 사용.

- [ ] **Step 1: Supabase CLI 설치 및 로그인**

```bash
npm install -D supabase
npx supabase login
```

(브라우저가 열리며 사용자가 직접 로그인)

- [ ] **Step 2: 로컬 프로젝트와 원격 Supabase 프로젝트 연결**

```bash
npx supabase link --project-ref <Task 4에서 만든 프로젝트의 ref, 대시보드 URL의 프로젝트 ID>
```

- [ ] **Step 3: 마이그레이션 파일 작성**

`supabase/migrations/0001_init.sql`:

```sql
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
```

- [ ] **Step 4: NPC 시드 데이터 작성**

`supabase/seed.sql` (원본 `legacy-reference/원본_V31.html`의 `people` 초기값 그대로 이전):

```sql
insert into npcs (id, name, role, rank, team, work_style, gender, mbti, traits, pref_traits, skill, sales, crisis, stress, active) values
  (1, '김팀장', 'AE', '팀장', '기획1팀', '협업중시형', '남성', 'ENTJ',
    array['리더십', '직설적', '책임감 강함'], array['친화적', '책임감 강함'], 82, 62, 88, 28, true),
  (2, '이대리', '퍼포먼스 마케팅', '대리', '기획2팀', '정확도중시형', '여성', 'ISTJ',
    array['꼼꼼함', '책임감 강함', '독립적'], array['리더십', '눈치 빠름'], 76, 45, 70, 34, true),
  (3, '박과장', '디자인', '과장', '제작팀', '창의탐색형', '여성', 'INFP',
    array['창의적', '공감형', '협업형'], array['친화적', '창의적'], 85, 30, 60, 22, true)
on conflict (id) do nothing;
```

- [ ] **Step 5: 마이그레이션 + 시드 원격 적용**

```bash
npx supabase db push
psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2)" -f supabase/seed.sql
```

(위 psql 명령이 로컬 환경에 따라 안 되면, Supabase 대시보드의 SQL Editor에 `supabase/seed.sql` 내용을 붙여넣어 실행해도 동일하다.)

- [ ] **Step 6: 적용 확인**

Supabase 대시보드 → Table Editor에서 `npcs` 테이블에 3행이 보이는지 확인.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add profiles/npcs schema migration and NPC seed data"
```

---

## Task 6: 프로필 유효성 검증 로직 (Zod 스키마) + 유닛 테스트

**Files:**
- Create: `lib/validation/profile.ts`
- Test: `lib/validation/profile.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 로직)
- Produces: `profileSchema: ZodSchema`, `ProfileInput` 타입, `JOB_RANKS: readonly string[]`, `DEFAULT_PROFILE: ProfileInput` — Task 9(온보딩 폼)가 이 스키마와 기본값을 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/validation/profile.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { profileSchema, DEFAULT_PROFILE, JOB_RANKS } from './profile'

describe('profileSchema', () => {
  it('accepts a valid profile', () => {
    const result = profileSchema.safeParse({
      ...DEFAULT_PROFILE,
      name: '홍길동',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = profileSchema.safeParse({
      ...DEFAULT_PROFILE,
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a rank not in JOB_RANKS', () => {
    const result = profileSchema.safeParse({
      ...DEFAULT_PROFILE,
      name: '홍길동',
      rank: '없는직급',
    })
    expect(result.success).toBe(false)
  })

  it('exposes the original job rank list', () => {
    expect(JOB_RANKS).toEqual(['대표', '팀장', '과장', '차장', '파트장', '대리', '사원', '인턴'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/validation/profile.test.ts`
Expected: FAIL (`Cannot find module './profile'`)

- [ ] **Step 3: 구현 작성**

`lib/validation/profile.ts` (원본 `legacy-reference/원본_V31.html`의 `protagonist` 기본값과 `JOB_RANKS` 배열을 그대로 이전):

```typescript
import { z } from 'zod'

export const JOB_RANKS = [
  '대표', '팀장', '과장', '차장', '파트장', '대리', '사원', '인턴',
] as const

export const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  gender: z.string().min(1),
  team: z.string().min(1),
  rank: z.enum(JOB_RANKS),
  role: z.string().min(1),
  work_style: z.string().min(1),
  mbti: z.string().min(1),
  traits: z.array(z.string()),
  pref_traits: z.array(z.string()),
  skill: z.number().int().min(0).max(100),
  sales: z.number().int().min(0).max(100),
  crisis: z.number().int().min(0).max(100),
  stress: z.number().int().min(0).max(100),
})

export type ProfileInput = z.infer<typeof profileSchema>

export const DEFAULT_PROFILE: ProfileInput = {
  name: '',
  gender: '여성',
  team: '기획1팀',
  rank: '사원',
  role: 'AE',
  work_style: '협업중시형',
  mbti: 'ENFP',
  traits: ['친화적', '공감형'],
  pref_traits: [],
  skill: 70,
  sales: 50,
  crisis: 60,
  stress: 25,
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/validation/profile.test.ts`
Expected: PASS (4 tests)

`z.enum(JOB_RANKS)`에 빈 문자열 `name: ''`을 넣는 첫 테스트 케이스는 `name`이 아니라 `rank`가 원인이 되지 않도록, `DEFAULT_PROFILE.rank`가 `JOB_RANKS`에 포함된 값(`'사원'`)인지 재확인한다 — 포함되어 있으므로 통과해야 정상이다.

- [ ] **Step 5: `zod` 설치 확인**

`npm test` 실행 전에 `zod`가 설치되어 있지 않다면:

```bash
npm install zod
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add profile validation schema with unit tests"
```

---

## Task 7: 회원가입 / 로그인 페이지

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`
- Create: `app/signup/page.tsx`
- Create: `app/signup/actions.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 4)
- Produces: `/login`, `/signup` 라우트 — Task 8(라우트 보호)이 이 경로들을 인증 예외 경로로 참조.

- [ ] **Step 1: 로그인 서버 액션 작성**

`app/login/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
```

- [ ] **Step 2: 로그인 페이지 작성**

`app/login/page.tsx`:

```tsx
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>}
            <Button type="submit" className="w-full">로그인</Button>
          </form>
          <p className="mt-4 text-center text-sm">
            계정이 없으신가요? <Link href="/signup" className="underline">회원가입</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: 회원가입 서버 액션 작성**

`app/signup/actions.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/login')
}
```

- [ ] **Step 4: 회원가입 페이지 작성**

`app/signup/page.tsx` (Step 2의 로그인 페이지와 동일한 레이아웃, `login` → `signup` 액션으로 교체):

```tsx
import { signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            {error && <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>}
            <Button type="submit" className="w-full">회원가입</Button>
          </form>
          <p className="mt-4 text-center text-sm">
            이미 계정이 있으신가요? <Link href="/login" className="underline">로그인</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: `middleware.ts`의 인증 예외 경로에 `/signup` 포함 확인**

Task 4 Step 5에서 작성한 `isAuthRoute` 체크가 이미 `/login`, `/signup` 둘 다 포함하고 있는지 확인 (포함되어 있음).

- [ ] **Step 6: 실행 화면으로 직접 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000/signup`으로 이동해 실제 이메일/비밀번호로 가입 → `/login`으로 리다이렉트 → 로그인 → `/`로 리다이렉트되는지 확인. (Supabase 프로젝트의 이메일 확인 설정에 따라 "이메일 확인" 안내가 뜰 수 있음 — 대시보드 Authentication → Providers → Email에서 "Confirm email"을 꺼두면 로컬 개발이 편함.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add signup and login pages with Supabase Auth"
```

---

## Task 8: 라우트 보호 — 온보딩 미완료 유저 리다이렉트

**Files:**
- Modify: `lib/supabase/middleware.ts`
- Create: `lib/auth/redirect-decision.ts`
- Test: `lib/auth/redirect-decision.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 로직 함수로 분리해 미들웨어에서 사용)
- Produces: `decideRedirect(input: { pathname: string; isAuthenticated: boolean; isConfigured: boolean }): string | null` — `null`이면 리다이렉트 없음, 문자열이면 그 경로로 리다이렉트.

미들웨어 자체(`NextRequest`/`NextResponse` 의존)는 유닛 테스트하기 번거로우므로, 리다이렉트 판단 로직만 순수 함수로 뽑아 테스트한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/auth/redirect-decision.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { decideRedirect } from './redirect-decision'

describe('decideRedirect', () => {
  it('sends unauthenticated users to /login', () => {
    expect(decideRedirect({ pathname: '/', isAuthenticated: false, isConfigured: false }))
      .toBe('/login')
  })

  it('does not redirect unauthenticated users already on /login', () => {
    expect(decideRedirect({ pathname: '/login', isAuthenticated: false, isConfigured: false }))
      .toBeNull()
  })

  it('does not redirect unauthenticated users already on /signup', () => {
    expect(decideRedirect({ pathname: '/signup', isAuthenticated: false, isConfigured: false }))
      .toBeNull()
  })

  it('sends authenticated but unconfigured users to /onboarding', () => {
    expect(decideRedirect({ pathname: '/', isAuthenticated: true, isConfigured: false }))
      .toBe('/onboarding')
  })

  it('does not redirect unconfigured users already on /onboarding', () => {
    expect(decideRedirect({ pathname: '/onboarding', isAuthenticated: true, isConfigured: false }))
      .toBeNull()
  })

  it('does not redirect fully configured users', () => {
    expect(decideRedirect({ pathname: '/', isAuthenticated: true, isConfigured: true }))
      .toBeNull()
  })

  it('sends configured users away from /onboarding back to home', () => {
    expect(decideRedirect({ pathname: '/onboarding', isAuthenticated: true, isConfigured: true }))
      .toBe('/')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/auth/redirect-decision.test.ts`
Expected: FAIL (`Cannot find module './redirect-decision'`)

- [ ] **Step 3: 구현 작성**

`lib/auth/redirect-decision.ts`:

```typescript
const PUBLIC_PATHS = ['/login', '/signup']

export function decideRedirect(input: {
  pathname: string
  isAuthenticated: boolean
  isConfigured: boolean
}): string | null {
  const { pathname, isAuthenticated, isConfigured } = input

  if (!isAuthenticated) {
    return PUBLIC_PATHS.includes(pathname) ? null : '/login'
  }

  if (!isConfigured) {
    return pathname === '/onboarding' ? null : '/onboarding'
  }

  return pathname === '/onboarding' ? '/' : null
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/auth/redirect-decision.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 미들웨어에서 이 함수 사용하도록 교체**

`lib/supabase/middleware.ts`의 `isAuthRoute` 체크와 리다이렉트 부분을 다음으로 교체 (claims 확인 이후, `profiles.is_configured` 조회 추가):

```typescript
  const { data: { claims } } = await supabase.auth.getClaims()

  let isConfigured = false
  if (claims) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_configured')
      .eq('id', claims.sub)
      .maybeSingle()
    isConfigured = profile?.is_configured ?? false
  }

  const target = decideRedirect({
    pathname: request.nextUrl.pathname,
    isAuthenticated: Boolean(claims),
    isConfigured,
  })

  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url)
  }

  return supabaseResponse
```

파일 상단에 `import { decideRedirect } from '@/lib/auth/redirect-decision'` 추가.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add onboarding redirect gate to middleware"
```

---

## Task 9: 온보딩("내 정보 입력") 페이지

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `app/onboarding/actions.ts`

**Interfaces:**
- Consumes: `profileSchema`, `DEFAULT_PROFILE`, `JOB_RANKS` (Task 6), `createClient()` from `lib/supabase/server.ts` (Task 4)
- Produces: `/onboarding` 라우트 — `profiles` row를 생성/갱신하고 `is_configured=true`로 표시.

- [ ] **Step 1: 온보딩 서버 액션 작성**

`app/onboarding/actions.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validation/profile'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    gender: formData.get('gender'),
    team: formData.get('team'),
    rank: formData.get('rank'),
    role: formData.get('role'),
    work_style: formData.get('work_style'),
    mbti: formData.get('mbti'),
    traits: [],
    pref_traits: [],
    skill: 70,
    sales: 50,
    crisis: 60,
    stress: 25,
  })

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'
    redirect(`/onboarding?error=${encodeURIComponent(message)}`)
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data, is_configured: true })

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}
```

- [ ] **Step 2: 온보딩 페이지 작성**

`app/onboarding/page.tsx` (원본의 "내정보" 입력 폼 필드를 그대로 반영: 이름/성별/팀/직급/직무/업무스타일/MBTI):

```tsx
import { saveProfile } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JOB_RANKS, DEFAULT_PROFILE } from '@/lib/validation/profile'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>내 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveProfile} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">성별</Label>
              <Input id="gender" name="gender" defaultValue={DEFAULT_PROFILE.gender} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team">소속팀</Label>
              <Input id="team" name="team" defaultValue={DEFAULT_PROFILE.team} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rank">직급</Label>
              <select
                id="rank"
                name="rank"
                defaultValue={DEFAULT_PROFILE.rank}
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                {JOB_RANKS.map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">직무</Label>
              <Input id="role" name="role" defaultValue={DEFAULT_PROFILE.role} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="work_style">업무 스타일</Label>
              <Input id="work_style" name="work_style" defaultValue={DEFAULT_PROFILE.work_style} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mbti">MBTI</Label>
              <Input id="mbti" name="mbti" defaultValue={DEFAULT_PROFILE.mbti} />
            </div>
            {error && <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>}
            <Button type="submit" className="w-full">저장하고 시작하기</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: 실행 화면으로 확인**

```bash
npm run dev
```

로그인 상태에서 `/onboarding`으로 접근 → 폼 제출 → `/`로 리다이렉트되는지, Supabase 대시보드 Table Editor에서 `profiles` 테이블에 row가 생기고 `is_configured=true`인지 확인.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add onboarding page for character setup"
```

---

## Task 10: 회사 홈 화면 (내 프로필 + NPC 로스터)

**Files:**
- Modify: `app/page.tsx`
- Create: `components/roster-card.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 4), `profiles`/`npcs` 테이블 (Task 5)
- Produces: `RosterCard` 컴포넌트(`{ name, role, rank, team, traits }` props) — 이후 "하루 진행"/로스터 상세 플랜이 이 화면을 확장.

- [ ] **Step 1: 로스터 카드 컴포넌트 작성**

`components/roster-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RosterCard({
  name,
  role,
  rank,
  team,
  traits,
}: {
  name: string
  role: string
  rank: string
  team: string
  traits: string[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{team} · {rank} · {role}</p>
        {traits.length > 0 && <p className="mt-2">{traits.join(', ')}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 홈 페이지에서 내 프로필 + NPC 로스터 조회 및 렌더**

`app/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { RosterCard } from '@/components/roster-card'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()
  const { data: npcs } = await supabase
    .from('npcs')
    .select('*')
    .eq('active', true)
    .order('id')

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">두근두근 회사생활</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {profile?.team} · {profile?.rank} {profile?.name}님, 환영합니다.
      </p>

      <h2 className="mt-6 text-lg font-semibold">직원 명단</h2>
      <div className="mt-3 grid gap-3">
        {profile && (
          <RosterCard
            name={`${profile.name} (나)`}
            role={profile.role}
            rank={profile.rank}
            team={profile.team}
            traits={profile.traits}
          />
        )}
        {npcs?.map((npc) => (
          <RosterCard
            key={npc.id}
            name={npc.name}
            role={npc.role}
            rank={npc.rank}
            team={npc.team}
            traits={npc.traits}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 실행 화면으로 최종 확인**

```bash
npm run dev
```

브라우저에서 회원가입 → 로그인 → 온보딩 → 홈 화면까지 전체 흐름을 직접 타보면서, 내 프로필 카드와 NPC 3명(김팀장/이대리/박과장) 카드가 모두 보이는지 확인한다. 이 화면을 같이 보면서 다음 이터레이션(하루 진행/일일로그/메신저/대화하기)을 무엇부터 다듬을지 정한다.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add company home screen with profile and NPC roster"
```

---

## 다음 단계 (별도 플랜)

이 플랜 완료 후, 스펙의 나머지 부분을 별도 플랜으로 이어간다:
- "하루 진행" 로직 (company_state, daily_events, relationships)
- 일일로그 / 메신저 탭 (관전용 로그 렌더링)
- 대화하기 (NPC 자동응답 + 실제 유저 간 실시간 스레드)
