'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RosterCard } from '@/components/roster-card'
import { NpcEditor } from '@/components/npc-editor'
import { DailyFortuneCard } from '@/components/daily-fortune-card'
import { advanceDayAction } from '@/app/actions/advance-day'
import { assignRole, setOvertimeMode, setSalesMode } from '@/app/actions/company-state'
import { fmt } from '@/lib/game/format'
import type { CompanyState } from '@/components/app-shell'
import type { ActorType } from '@/lib/game/relations'
import type { OvertimeMode, SalesMode } from '@/lib/game/advance-day'
import { TEAMS } from '@/lib/validation/profile'

const SALES_MODES: { value: SalesMode; label: string }[] = [
  { value: 'safe', label: '보수적 수주' },
  { value: 'balanced', label: '균형 수주' },
  { value: 'aggressive', label: '공격적 수주' },
]
const OVERTIME_MODES: { value: OvertimeMode; label: string }[] = [
  { value: 'none', label: '야근 최소화' },
  { value: 'normal', label: '필요 시 야근' },
  { value: 'hard', label: '성과 우선' },
]

interface Person {
  type: ActorType
  id: string
  name: string
  role: string
  rank: string
  team: string
  traits: string[]
}

const ASSIGNMENTS: { role: 'lead' | 'seller' | 'fire'; label: string; typeKey: keyof CompanyState; idKey: keyof CompanyState }[] = [
  { role: 'lead', label: '핵심 광고주 담당자', typeKey: 'lead_actor_type', idKey: 'lead_actor_id' },
  { role: 'seller', label: '신규 영업 담당자', typeKey: 'seller_actor_type', idKey: 'seller_actor_id' },
  { role: 'fire', label: '긴급 이슈 대응 담당자', typeKey: 'fire_actor_type', idKey: 'fire_actor_id' },
]

interface RosterStats {
  name: string
  role: string
  rank: string
  team: string
  traits: string[]
  pref_traits: string[]
  gender: string
  mbti: string
  work_style: string
  skill: number
  sales: number
  crisis: number
  stress: number
}

export function SimPanel({
  me,
  roster,
  allRoster,
  companyState,
}: {
  me: RosterStats & { id: string; fortune_date: string | null; fortune_text: string | null }
  roster: (RosterStats & { id: number; active: boolean })[]
  allRoster: (RosterStats & { id: number; active: boolean })[]
  companyState: CompanyState
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [resultOk, setResultOk] = useState(true)

  const allPeople: Person[] = [
    { type: 'profile', id: me.id, name: `${me.name} (나)`, role: me.role, rank: me.rank, team: me.team, traits: me.traits },
    ...roster.map((npc) => ({ type: 'npc' as const, id: String(npc.id), name: npc.name, role: npc.role, rank: npc.rank, team: npc.team, traits: npc.traits })),
  ]
  const peopleByTeam = TEAMS.map((team) => ({ team, people: allPeople.filter((p) => p.team === team) })).filter(
    (g) => g.people.length > 0
  )

  function handleAdvanceDay() {
    startTransition(async () => {
      const result = await advanceDayAction()
      setResultMessage(result.message)
      setResultOk(result.ok)
      if (result.ok) router.refresh()
    })
  }

  function handleAssign(role: 'lead' | 'seller' | 'fire', value: string) {
    const [type, id] = value.split(':') as [ActorType, string]
    startTransition(async () => {
      await assignRole(role, type, id)
      router.refresh()
    })
  }

  function handleSalesMode(value: string) {
    startTransition(async () => {
      await setSalesMode(value as SalesMode)
      router.refresh()
    })
  }

  function handleOvertimeMode(value: string) {
    startTransition(async () => {
      await setOvertimeMode(value as OvertimeMode)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      <section
        className="relative grid gap-4 overflow-hidden rounded-3xl border border-[#f0d8e3] p-5 shadow-[0_16px_40px_rgba(182,93,128,0.09)] sm:grid-cols-[1.2fr_.8fr] sm:items-center sm:gap-[18px] sm:p-[26px]"
        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,.98) 0%,#fff2f7 54%,#fde7f0 100%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[60px] -right-[60px] h-[160px] w-[160px] rounded-full bg-[rgba(255,197,219,.38)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[25px] bottom-[14px] text-2xl tracking-[10px] text-[rgba(225,112,157,.16)]"
        >
          ♡ ✦ ♡
        </div>

        <div className="relative z-[2]">
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#c46f91]">OFFICE ROMANCE LIFE SIMULATION</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#4b3740] [text-shadow:0_2px_0_#fff] sm:text-4xl">
            두근두근 회사생활 시뮬레이션
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            같은 회사, 다른 마음. 매일의 대화와 작은 선택이 직원들과의 관계를 바꿉니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['💗 조금씩 가까워지는 사이', '💌 대화 속에 쌓이는 추억', '🌸 평범한 회사생활 속 설렘'].map((tag) => (
              <span key={tag} className="rounded-full border border-[#efd9e2] bg-[rgba(255,255,255,.9)] px-2.5 py-1.5 text-xs text-[#795e6a]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div aria-hidden className="relative z-[2] hidden h-[170px] min-w-0 sm:block">
          <div className="absolute top-3 left-2 flex -rotate-3 items-center gap-1.5 rounded-xl border border-[#efdbe4] bg-[#fffafd] px-2.5 py-2 text-[11px] shadow-[0_8px_20px_rgba(181,93,128,0.08)]">
            <span>📊</span>
            <b className="font-bold">성과 보고서</b>
          </div>
          <div className="absolute bottom-[15px] left-[30px] flex rotate-2 items-center gap-1.5 rounded-xl border border-[#efdbe4] bg-[#fffafd] px-2.5 py-2 text-[11px] shadow-[0_8px_20px_rgba(181,93,128,0.08)]">
            <span>💬</span>
            <b className="font-bold">광고주 메시지</b>
          </div>
          <div className="absolute right-2.5 bottom-2 flex -rotate-2 items-center gap-1.5 rounded-xl border border-[#efdbe4] bg-[#fffafd] px-2.5 py-2 text-[11px] shadow-[0_8px_20px_rgba(181,93,128,0.08)]">
            <span>☕</span>
            <b className="font-bold">카페인 충전</b>
          </div>
          <div className="absolute top-[42px] right-[70px] flex h-[78px] w-[78px] rotate-3 items-center justify-center rounded-3xl border border-[#f0d0dd] bg-[linear-gradient(145deg,#fff,#ffe7f0)] text-[38px] text-[#df729e] shadow-[0_12px_30px_rgba(204,105,144,0.12)]">
            💗
          </div>
          <div className="absolute top-1 right-0 rounded-[15px_15px_4px_15px] border border-[#efd6e1] bg-[#fffafd] px-[11px] py-[9px] text-[11px] leading-[1.4] text-[#7d6570]">
            오늘은 누구와
            <br />
            가까워질까?
          </div>
        </div>
      </section>

      <DailyFortuneCard cachedDate={me.fortune_date} cachedFortune={me.fortune_text} companyDate={companyState.date} />

      <section className="grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardContent>
            <h2 className="text-base font-bold">📌 오늘의 운영 현황</h2>
            <p className="mt-1 text-xs text-muted-foreground">광고주 수와 팀 처리용량의 균형이 중요해요.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: '현금', value: fmt(companyState.cash) },
                { label: '오늘 매출', value: fmt(companyState.revenue) },
                { label: '광고주', value: `${companyState.clients}곳` },
                { label: '회사 평판', value: `${Math.round(companyState.reputation)}` },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border p-3"
                  style={{ background: ['var(--cute-mint)', 'var(--cute-yellow)', 'var(--cute-blue)', 'var(--cute-purple)'][i] }}
                >
                  <small className="text-xs text-muted-foreground">{stat.label}</small>
                  <p className="mt-1.5 text-base font-bold">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-base font-bold">🎯 운영 전략</h2>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">수주 강도</label>
                <select
                  value={companyState.sales_mode}
                  disabled={isPending}
                  onChange={(e) => handleSalesMode(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SALES_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">야근 정책</label>
                <select
                  value={companyState.overtime_mode}
                  disabled={isPending}
                  onChange={(e) => handleOvertimeMode(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {OVERTIME_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Button
          type="button"
          disabled={isPending}
          onClick={handleAdvanceDay}
          className="h-auto w-full py-3.5 text-base font-extrabold"
        >
          🎲 하루 진행
        </Button>
      </section>

      <Card>
        <CardContent>
          <h3 className="text-base font-bold">📰 오늘의 결과</h3>
          <div
            className={`mt-3 rounded-xl border p-3 text-sm ${
              resultMessage && !resultOk
                ? 'border-destructive/30 bg-destructive/5 font-semibold text-destructive'
                : 'border-border bg-accent/60 text-muted-foreground'
            }`}
          >
            {resultMessage ?? `${companyState.day}일차 · 아직 오늘의 '하루 진행'을 실행하지 않았어요.`}
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">👥 직원 명단</h2>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <RosterCard
            name={`${me.name} (나)`}
            role={me.role}
            rank={me.rank}
            team={me.team}
            traits={me.traits}
            gender={me.gender}
            mbti={me.mbti}
            workStyle={me.work_style}
            skill={me.skill}
            sales={me.sales}
            crisis={me.crisis}
            stress={me.stress}
            compact
          />
          {allRoster.map((npc) => (
            <RosterCard
              key={npc.id}
              name={npc.name}
              role={npc.role}
              rank={npc.rank}
              team={npc.team}
              traits={npc.traits}
              gender={npc.gender}
              mbti={npc.mbti}
              workStyle={npc.work_style}
              skill={npc.skill}
              sales={npc.sales}
              crisis={npc.crisis}
              stress={npc.stress}
              active={npc.active}
              compact
              footer={
                <NpcEditor
                  npc={{
                    id: npc.id,
                    name: npc.name,
                    gender: npc.gender,
                    team: npc.team,
                    rank: npc.rank,
                    role: npc.role,
                    work_style: npc.work_style,
                    mbti: npc.mbti,
                    traits: npc.traits,
                    pref_traits: npc.pref_traits,
                    skill: npc.skill,
                    sales: npc.sales,
                    crisis: npc.crisis,
                    stress: npc.stress,
                    active: npc.active,
                  }}
                />
              }
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="text-base font-bold">🗂️ 업무 배정</h3>
            <div className="mt-4 grid gap-3">
              {ASSIGNMENTS.map(({ role, label, typeKey, idKey }) => {
                const currentType = companyState[typeKey]
                const currentId = companyState[idKey]
                const value = currentType && currentId ? `${currentType}:${currentId}` : ''
                return (
                  <div key={role} className="grid gap-1.5">
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <select
                      value={value}
                      disabled={isPending}
                      onChange={(e) => handleAssign(role, e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="" disabled>
                        담당자를 선택하세요
                      </option>
                      {peopleByTeam.map(({ team, people }) => (
                        <optgroup key={team} label={team}>
                          {people.map((p) => (
                            <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-base font-bold">📋 운영 기준</h3>
            <div className="mt-4 grid gap-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">일 목표 매출</span><b>₩1,500,000</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">권장 광고주 수</span><b>4~7곳</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">위험 스트레스</span><b>80 이상</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">퇴사 처리</span><b>직원 카드에서 가능</b></div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
