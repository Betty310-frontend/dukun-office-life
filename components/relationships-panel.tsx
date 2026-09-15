'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toWorkforceMember } from '@/lib/game/workforce'
import type { TalkMemoryRow } from '@/components/talk-panel'
import {
  ensureRelation,
  isOppositeGender,
  preferenceMatch,
  relationLabel,
  relationshipOverallScore,
  relKey,
  type ActorType,
  type RelationsMap,
} from '@/lib/game/relations'
import type { WorkforceMember } from '@/lib/game/types'

export interface RelationRow {
  actor_type: ActorType
  actor_id: string
  target_type: ActorType
  target_id: string
  affection: number
  trust: number
  conflict: number
  romantic: number
  last_talked_date?: string | null
  talk_count?: number
}

type SortKey = 'overall' | 'affection' | 'trust' | 'conflict' | 'romantic'

const PAGE_SIZE = 10

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'overall', label: '종합' },
  { id: 'affection', label: '호감도' },
  { id: 'trust', label: '신뢰도' },
  { id: 'conflict', label: '갈등도' },
  { id: 'romantic', label: '이성 관심도' },
]

export function RelationshipsPanel({
  profiles,
  npcs,
  relationships,
  talkMemories,
}: {
  profiles: Record<string, unknown>[]
  npcs: Record<string, unknown>[]
  relationships: RelationRow[]
  talkMemories: TalkMemoryRow[]
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('overall')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  function handleQueryChange(next: string) {
    setQuery(next)
    setVisibleCount(PAGE_SIZE)
  }

  function handleSortChange(next: SortKey) {
    setSortKey(next)
    setVisibleCount(PAGE_SIZE)
  }

  const workforce: WorkforceMember[] = useMemo(
    () => [...profiles.map((p) => toWorkforceMember('profile', p)), ...npcs.map((n) => toWorkforceMember('npc', n))],
    [profiles, npcs]
  )

  const relations: RelationsMap = useMemo(() => {
    const map: RelationsMap = new Map()
    for (const r of relationships) {
      map.set(relKey({ type: r.actor_type, id: r.actor_id }, { type: r.target_type, id: r.target_id }), {
        affection: r.affection,
        trust: r.trust,
        conflict: r.conflict,
        romantic: r.romantic,
      })
    }
    return map
  }, [relationships])

  const trimmedQuery = query.trim().toLocaleLowerCase('ko-KR')

  // 추억(talk_memories)은 항상 actor_type: 'profile', target_type: 'npc'로 쌓인다(대화하기 탭에서 NPC와
  // 대화할 때만 생성됨) — 어느 쪽이 profile/npc인지 몰라도 양방향으로 찾아서 붙인다.
  function memoriesFor(a: WorkforceMember, b: WorkforceMember) {
    return talkMemories
      .filter(
        (m) =>
          (m.actor_type === a.type && m.actor_id === a.id && m.target_type === b.type && m.target_id === b.id) ||
          (m.actor_type === b.type && m.actor_id === b.id && m.target_type === a.type && m.target_id === a.id)
      )
      .slice(0, 3)
  }

  const pairs = useMemo(() => {
    const list: { a: WorkforceMember; b: WorkforceMember; overall: number }[] = []
    for (let i = 0; i < workforce.length; i++) {
      for (let j = i + 1; j < workforce.length; j++) {
        const a = workforce[i]
        const b = workforce[j]
        if (trimmedQuery) {
          const aName = a.name.toLocaleLowerCase('ko-KR')
          const bName = b.name.toLocaleLowerCase('ko-KR')
          if (!aName.includes(trimmedQuery) && !bName.includes(trimmedQuery)) continue
        }
        list.push({ a, b, overall: relationshipOverallScore(relations, a, b) })
      }
    }
    list.sort((x, y) => {
      if (sortKey === 'overall') return y.overall - x.overall
      const abX = ensureRelation(relations, x.a, x.b)
      const baX = ensureRelation(relations, x.b, x.a)
      const abY = ensureRelation(relations, y.a, y.b)
      const baY = ensureRelation(relations, y.b, y.a)
      return (abY[sortKey] + baY[sortKey]) / 2 - (abX[sortKey] + baX[sortKey]) / 2
    })
    return list
  }, [workforce, relations, trimmedQuery, sortKey])

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-bold">💞 인간관계</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          직원 간 친밀도·신뢰도·갈등도는 방향별로 따로 누적돼요. 이름을 검색하면 해당 직원이 포함된 관계만 볼 수 있어요.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-accent/60 p-3">
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="이름으로 검색 (예: 지연)"
            className="min-w-[160px] flex-1"
          />
          <select
            value={sortKey}
            onChange={(e) => handleSortChange(e.target.value as SortKey)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}순
              </option>
            ))}
          </select>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {trimmedQuery ? `'${query.trim()}' 관련 관계 ${pairs.length}건` : `전체 관계 ${pairs.length}건`}
          </span>
        </div>

        {workforce.length < 2 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            [데이터 없음]
            <br />
            <span className="text-xs">활성 직원이 2명 이상일 때 관계도가 생성돼요.</span>
          </div>
        ) : pairs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            [검색 결과 없음]
            <br />
            <span className="text-xs">&apos;{query.trim()}&apos; 이름이 포함된 직원 관계가 없어요.</span>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {pairs.slice(0, visibleCount).map(({ a, b, overall }) => {
              const ab = ensureRelation(relations, a, b)
              const ba = ensureRelation(relations, b, a)
              const opposite = isOppositeGender(a, b)
              const memories = memoriesFor(a, b)
              return (
                <div key={`${a.type}:${a.id}-${b.type}:${b.id}`} className="bg-card px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <b className="truncate text-sm">
                        {a.name} ↔ {b.name}
                      </b>
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {relationLabel(ab)} / {relationLabel(ba)}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {overall} / 100
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <p className="truncate">
                      {a.name}→{b.name}: 호감 {Math.round(ab.affection)} · 신뢰 {Math.round(ab.trust)} · 갈등 {Math.round(ab.conflict)}
                      {opposite && ` · 이성 관심 ${Math.round(ab.romantic)}`}
                    </p>
                    <p className="truncate">
                      {b.name}→{a.name}: 호감 {Math.round(ba.affection)} · 신뢰 {Math.round(ba.trust)} · 갈등 {Math.round(ba.conflict)}
                      {opposite && ` · 이성 관심 ${Math.round(ba.romantic)}`}
                    </p>
                  </div>
                  {opposite && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      선호 일치 {a.name}→{Math.round(preferenceMatch(a, b) * 100)}% · {b.name}→{Math.round(preferenceMatch(b, a) * 100)}%
                    </p>
                  )}
                  {memories.length > 0 && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-[11px] font-bold text-[#a45775]">
                        💗 둘만의 추억 {memories.length}개
                      </summary>
                      <div className="mt-1 grid gap-1 rounded-lg border border-[#efc4d4] bg-[linear-gradient(180deg,#fffafd_0%,#fff6fa_100%)] p-2">
                        {memories.map((m, i) => (
                          <p key={i} className="text-[11px] text-[#7d6570]">
                            {m.text}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {pairs.length > visibleCount && (
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          >
            더 보기 (남은 {pairs.length - visibleCount}건)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
