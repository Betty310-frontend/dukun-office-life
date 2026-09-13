'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RosterCard } from '@/components/roster-card'
import { ComingSoonBadge } from '@/components/coming-soon-badge'
import { advanceDayAction } from '@/app/actions/advance-day'
import { assignRole } from '@/app/actions/company-state'
import { fmt } from '@/lib/game/format'
import { formatDate, seasonName, weekdayNameFromDate } from '@/lib/game/date'
import type { CompanyState } from '@/components/app-shell'
import type { ActorType } from '@/lib/game/relations'

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

export function SimPanel({
  me,
  roster,
  companyState,
}: {
  me: { id: string; name: string; role: string; rank: string; team: string; traits: string[] }
  roster: { id: number; name: string; role: string; rank: string; team: string; traits: string[] }[]
  companyState: CompanyState
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const allPeople: Person[] = [
    { type: 'profile', id: me.id, name: `${me.name} (나)`, role: me.role, rank: me.rank, team: me.team, traits: me.traits },
    ...roster.map((npc) => ({ type: 'npc' as const, id: String(npc.id), name: npc.name, role: npc.role, rank: npc.rank, team: npc.team, traits: npc.traits })),
  ]

  function handleAdvanceDay() {
    startTransition(async () => {
      const result = await advanceDayAction()
      setResultMessage(result.message)
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

        <div aria-hidden className="relative z-[2] h-[145px] min-w-0 sm:h-[170px]">
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

      <section className="grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">📌 오늘의 운영 현황</h2>
                <p className="mt-1 text-xs text-muted-foreground">광고주 수와 팀 처리용량의 균형이 중요해요.</p>
              </div>
              <span className="inline-block rounded-full border border-border px-2.5 py-1.5 text-[13px]">
                {formatDate(companyState.date)} · {weekdayNameFromDate(companyState.date)} · {seasonName(companyState.date)}
              </span>
            </div>
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-bold">🎯 운영 전략</h2>
              <ComingSoonBadge />
            </div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">수주 강도</label>
                <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                  <option>균형 수주</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">야근 정책</label>
                <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                  <option>필요 시 야근</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={isPending}
          onClick={handleAdvanceDay}
          className="h-auto flex-1 py-3.5 text-base font-extrabold"
        >
          🎲 하루 진행
        </Button>
        <Button type="button" variant="secondary" disabled>로그만 초기화</Button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">👥 직원 명단</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RosterCard name={`${me.name} (나)`} role={me.role} rank={me.rank} team={me.team} traits={me.traits} />
          {roster.map((npc) => (
            <RosterCard key={npc.id} name={npc.name} role={npc.role} rank={npc.rank} team={npc.team} traits={npc.traits} />
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
                      {allPeople.map((p) => (
                        <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                          {p.name}
                        </option>
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
              <div className="flex justify-between"><span className="text-muted-foreground">퇴사 처리</span><b>사용자 직접</b></div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent>
          <h3 className="text-base font-bold">📰 오늘의 결과</h3>
          <div className="mt-3 rounded-xl border border-border bg-accent/60 p-3 text-sm text-muted-foreground">
            {resultMessage ?? `${companyState.day}일차 · 아직 오늘의 '하루 진행'을 실행하지 않았어요.`}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
