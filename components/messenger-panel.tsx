'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { manualChatAction } from '@/app/actions/manual-chat'
import { formatDate, weekdayNameFromDate } from '@/lib/game/date'
import type { ActorType } from '@/lib/game/relations'
import { TEAMS } from '@/lib/validation/profile'

const MANUAL_CHAT_COOLDOWN_DAYS = 3

export interface MessengerLogRow {
  id: string
  date: string
  scene_type: string
  scene_title: string
  team: string | null
  participant_refs: { type: ActorType; id: string }[]
  lines: { speaker: string; text: string }[]
  forced: boolean
}

interface Person {
  type: ActorType
  id: string
  name: string
  role: string
  rank: string
  team: string
}

export function MessengerPanel({
  me,
  roster,
  profiles,
  logs,
  day,
  lastManualChatDay,
}: {
  me: { id: string; name: string; role: string; rank: string; team: string }
  roster: { id: number; name: string; role: string; rank: string; team: string }[]
  profiles: { id: string; name: string }[]
  logs: MessengerLogRow[]
  day: number
  lastManualChatDay: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const allPeople: Person[] = useMemo(
    () => [
      { type: 'profile', id: me.id, name: me.name, role: me.role, rank: me.rank, team: me.team },
      ...roster.map((npc) => ({ type: 'npc' as const, id: String(npc.id), name: npc.name, role: npc.role, rank: npc.rank, team: npc.team })),
    ],
    [me, roster]
  )
  const peopleByTeam = useMemo(
    () => TEAMS.map((team) => ({ team, people: allPeople.filter((p) => p.team === team) })).filter((g) => g.people.length > 0),
    [allPeople]
  )
  // 하루 진행은 여러 실유저 프로필을 대상으로 씬을 생성할 수 있으므로, 이름 조회는 select 옵션(me+roster)이
  // 아니라 전체 profiles(다른 유저 포함) + roster로 해야 한다.
  const nameByKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of profiles) map.set(`profile:${p.id}`, p.name)
    map.set(`profile:${me.id}`, me.name)
    for (const n of roster) map.set(`npc:${n.id}`, n.name)
    return map
  }, [profiles, roster, me])

  const [personA, setPersonA] = useState(`${allPeople[0]?.type}:${allPeople[0]?.id}`)
  const [personB, setPersonB] = useState(`${allPeople[1]?.type ?? allPeople[0]?.type}:${allPeople[1]?.id ?? allPeople[0]?.id}`)

  const days = useMemo(() => {
    const byDate = new Map<string, MessengerLogRow[]>()
    for (const log of logs) {
      const bucket = byDate.get(log.date)
      if (bucket) bucket.push(log)
      else byDate.set(log.date, [log])
    }
    return Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [logs])

  const activeDate = selectedDate && days.some(([d]) => d === selectedDate) ? selectedDate : (days[0]?.[0] ?? null)
  const activeScenes = days.find(([d]) => d === activeDate)?.[1] ?? []

  const remainDays = Math.max(0, MANUAL_CHAT_COOLDOWN_DAYS - (day - lastManualChatDay))
  const canChat = remainDays <= 0

  function handleManualChat() {
    if (personA === personB) {
      setMessage('서로 다른 직원 두 명을 선택해주세요.')
      setMessageOk(false)
      return
    }
    const [aType, aId] = personA.split(':') as [ActorType, string]
    const [bType, bId] = personB.split(':') as [ActorType, string]
    startTransition(async () => {
      const result = await manualChatAction({ type: aType, id: aId }, { type: bType, id: bId })
      setMessage(result.message)
      setMessageOk(result.ok)
      if (result.ok) {
        setSelectedDate(null)
        router.refresh()
      }
    })
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-bold">💬 메신저</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          매일 직원들의 실무·광고주 고민·회사 일상 대화가 직원 성격과 관계도에 맞춰 자동 생성됩니다.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-accent/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">직원 1</label>
              <select
                value={personA}
                disabled={isPending}
                onChange={(e) => setPersonA(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {peopleByTeam.map(({ team, people }) => (
                  <optgroup key={team} label={team}>
                    {people.map((p) => (
                      <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                        {p.name} · {p.rank || '사원'} · {p.role}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">직원 2</label>
              <select
                value={personB}
                disabled={isPending}
                onChange={(e) => setPersonB(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {peopleByTeam.map(({ team, people }) => (
                  <optgroup key={team} label={team}>
                    {people.map((p) => (
                      <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                        {p.name} · {p.rank || '사원'} · {p.role}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <Button type="button" disabled={isPending || !canChat} onClick={handleManualChat}>
              랜덤 상황 대화 만들기
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {canChat ? '직접 매칭 가능 · 원하는 두 직원을 선택하세요.' : `직접 매칭 재사용까지 ${remainDays}일 남았습니다.`}
          </p>
          {message && (
            <p className={`mt-1 text-xs font-semibold ${messageOk ? 'text-foreground' : 'text-destructive'}`}>{message}</p>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[240px_1fr]">
          <div className="grid gap-2 content-start">
            <p className="text-xs font-semibold text-muted-foreground">대화 기록</p>
            {days.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                아직 대화가 없어요
              </div>
            )}
            {days.map(([date, scenes]) => (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  date === activeDate
                    ? 'border-primary bg-primary/10 font-semibold text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                {formatDate(date)} · {scenes.length}개 대화
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-bold">
              {activeDate ? `${formatDate(activeDate)} · ${weekdayNameFromDate(activeDate)}` : '대화 없음'}
            </div>
            <div className="grid gap-3 p-4">
              {activeScenes.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {days.length === 0 ? '시뮬레이션을 하루 진행하면 직원 대화가 생성돼요.' : '해당 날짜의 대화가 없어요.'}
                </p>
              )}
              {activeScenes.map((scene) => (
                <div key={scene.id} className="grid gap-2">
                  <div className="rounded-lg bg-[var(--cute-blue)] px-3 py-2 text-xs text-muted-foreground">
                    {scene.forced ? '직접 매칭 · ' : ''}
                    {scene.scene_title} ·{' '}
                    {scene.participant_refs.map((ref) => nameByKey.get(`${ref.type}:${ref.id}`) ?? '알 수 없음').join(' ↔ ')}
                  </div>
                  {scene.lines.map((line, i) => (
                    <div
                      key={i}
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        i % 2
                          ? 'ml-auto rounded-tr-sm bg-[#ffe8f1]'
                          : 'rounded-tl-sm bg-[#f8f4f6]'
                      }`}
                    >
                      <span className="mb-0.5 block text-[11px] font-bold text-muted-foreground">{line.speaker}</span>
                      {line.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
