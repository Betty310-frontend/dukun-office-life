'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toWorkforceMember } from '@/lib/game/workforce'
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
}

type SortKey = 'overall' | 'affection' | 'trust' | 'conflict' | 'romantic'

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
}: {
  profiles: Record<string, unknown>[]
  npcs: Record<string, unknown>[]
  relationships: RelationRow[]
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('overall')

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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 지연" className="max-w-xs" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}순
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
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
          <div className="mt-4 grid gap-3">
            {pairs.map(({ a, b, overall }) => {
              const ab = ensureRelation(relations, a, b)
              const ba = ensureRelation(relations, b, a)
              const opposite = isOppositeGender(a, b)
              return (
                <div key={`${a.type}:${a.id}-${b.type}:${b.id}`} className="rounded-2xl border border-border bg-[#fafafa] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-sm">
                      {a.name} ↔ {b.name}
                    </b>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">
                      {relationLabel(ab)} / {relationLabel(ba)}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <span>
                        {a.name} → {b.name}
                      </span>
                      <p className="mt-0.5 font-bold text-foreground">
                        호감 {Math.round(ab.affection)} · 신뢰 {Math.round(ab.trust)} · 갈등 {Math.round(ab.conflict)}
                        {opposite && ` · 이성 관심 ${Math.round(ab.romantic)}`}
                      </p>
                    </div>
                    <div>
                      <span>
                        {b.name} → {a.name}
                      </span>
                      <p className="mt-0.5 font-bold text-foreground">
                        호감 {Math.round(ba.affection)} · 신뢰 {Math.round(ba.trust)} · 갈등 {Math.round(ba.conflict)}
                        {opposite && ` · 이성 관심 ${Math.round(ba.romantic)}`}
                      </p>
                    </div>
                    <div>
                      <span>쌍방 평균 관계</span>
                      <p className="mt-0.5 font-bold text-foreground">{overall} / 100</p>
                      {opposite && (
                        <p className="mt-0.5 text-[11px]">
                          선호 일치 {a.name}→{Math.round(preferenceMatch(a, b) * 100)}% · {b.name}→
                          {Math.round(preferenceMatch(b, a) * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
