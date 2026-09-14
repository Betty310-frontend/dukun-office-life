// 원본 legacy-reference/원본_V31.html 1833-1858행(activePeople/relKey/ensureRelation/seedRelations/
// relationshipScore/isOppositeGender/preferenceMatch/romanticPotential), 2024-2032행(applySocialShift),
// 2482-2497행(applyTeamShift), 4985-4990행(teamChemistry)을 그대로 포팅.
//
// 원본은 NPC↔NPC 관계(relations)와 주인공↔직원 관계(protagonistRelations)를 별도 저장소로 나눴지만,
// 이 프로젝트는 여러 실유저가 회사를 공유하므로 하나의 RelationsMap으로 통합한다
// (docs/superpowers/plans/2026-09-13-day-progression-logs-messenger.md Global Constraints 참고).
//
// 원본 버그 노트: applyTeamShift가 호출하던 getRelation()은 파일 전체에 정의가 없는 죽은 코드였다
// (ReferenceError가 나는 경로). 여기서는 전부 ensureRelation으로 대체했다.
import { clamp } from './format'
import { mbtiCompatibility, traitPairScore, workStyleCompatibility } from './compatibility'

export type ActorType = 'profile' | 'npc'

export interface ActorRef {
  type: ActorType
  id: string
}

export interface RelationEntry {
  affection: number
  trust: number
  conflict: number
  romantic: number
}

export type RelationsMap = Map<string, RelationEntry>

export interface RelatablePerson extends ActorRef {
  gender: string
  mbti: string
  workStyle: string
  traits: string[]
  prefTraits: string[]
}

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

export function seedRelations(map: RelationsMap, people: ActorRef[]): void {
  for (const a of people) {
    for (const b of people) {
      if (a.type !== b.type || a.id !== b.id) ensureRelation(map, a, b)
    }
  }
}

export function relationshipScore(map: RelationsMap, a: ActorRef, b: ActorRef): number {
  const r = ensureRelation(map, a, b)
  return clamp((r.affection * 0.35 + r.trust * 0.45 - r.conflict * 0.5) / 100, -0.5, 1)
}

export function isOppositeGender(a: { gender: string }, b: { gender: string }): boolean {
  return (a.gender === '남성' && b.gender === '여성') || (a.gender === '여성' && b.gender === '남성')
}

export function preferenceMatch(a: RelatablePerson, b: RelatablePerson): number {
  if (!isOppositeGender(a, b)) return 0
  const prefs = a.prefTraits || []
  if (!prefs.length) return 0
  const hit = prefs.filter((t) => (b.traits || []).includes(t)).length
  return hit / prefs.length
}

export function romanticPotential(map: RelationsMap, a: RelatablePerson, b: RelatablePerson): number {
  if (!isOppositeGender(a, b)) return 0
  const r = ensureRelation(map, a, b)
  const match = preferenceMatch(a, b)
  return clamp(match * 0.55 + (r.affection / 100) * 0.25 + (r.trust / 100) * 0.15 - (r.conflict / 100) * 0.25, 0, 1)
}

// 원본 1860행(relationLabel) verbatim 포팅.
export function relationLabel(r: RelationEntry): string {
  if (r.conflict >= 70) return '갈등 심함'
  if (r.trust >= 75 && r.affection >= 70) return '매우 가까움'
  if (r.trust >= 65) return '신뢰함'
  if (r.affection >= 65) return '호감'
  if (r.conflict >= 45) return '불편함'
  return '보통'
}

// 원본 renderRelations()(~1968행)가 화면에 쓰는 쌍방 평균 관계 점수(0~100) 공식 verbatim 포팅.
export function relationshipOverallScore(map: RelationsMap, a: ActorRef, b: ActorRef): number {
  const score = (relationshipScore(map, a, b) + relationshipScore(map, b, a)) / 2
  return Math.round(((score + 0.5) / 1.5) * 100)
}

export function applySocialShift(
  map: RelationsMap,
  a: RelatablePerson,
  b: RelatablePerson,
  type: 'warm' | 'trust' | 'awkward' | 'conflict' | 'repair',
  scale = 1
): void {
  const ab = ensureRelation(map, a, b)
  const ba = ensureRelation(map, b, a)
  const compat = mbtiCompatibility(a.mbti, b.mbti) + workStyleCompatibility(a, b) * 0.3 + traitPairScore(a, b) * 0.7

  const opposite = isOppositeGender(a, b)
  const potAB = romanticPotential(map, a, b)
  const potBA = romanticPotential(map, b, a)
  if (opposite) {
    ab.romantic = clamp(ab.romantic + (potAB - 0.35) * 0.9 * scale + (Math.random() - 0.5) * 0.5, 0, 100)
    ba.romantic = clamp(ba.romantic + (potBA - 0.35) * 0.9 * scale + (Math.random() - 0.5) * 0.5, 0, 100)
  }
  if (type === 'warm') {
    ab.affection = clamp(ab.affection + (3 + compat * 2) * scale, 0, 100)
    ba.affection = clamp(ba.affection + (2.5 + compat * 1.5) * scale, 0, 100)
    ab.trust = clamp(ab.trust + 1.5 * scale, 0, 100)
    ba.trust = clamp(ba.trust + 1.5 * scale, 0, 100)
  }
  if (type === 'trust') {
    ab.trust = clamp(ab.trust + 4 * scale, 0, 100)
    ba.trust = clamp(ba.trust + 2 * scale, 0, 100)
    ab.affection = clamp(ab.affection + 1.5 * scale, 0, 100)
  }
  if (type === 'awkward') {
    ab.conflict = clamp(ab.conflict + (5 - compat) * scale, 0, 100)
    ab.affection = clamp(ab.affection - 2 * scale, 0, 100)
  }
  if (type === 'conflict') {
    ab.conflict = clamp(ab.conflict + 6 * scale, 0, 100)
    ba.conflict = clamp(ba.conflict + 4 * scale, 0, 100)
    ab.trust = clamp(ab.trust - 3 * scale, 0, 100)
  }
  if (type === 'repair') {
    ab.conflict = clamp(ab.conflict - 5 * scale, 0, 100)
    ba.conflict = clamp(ba.conflict - 4 * scale, 0, 100)
    ab.trust = clamp(ab.trust + 2 * scale, 0, 100)
    ba.trust = clamp(ba.trust + 2 * scale, 0, 100)
  }
}

export function applyTeamShift(map: RelationsMap, members: ActorRef[], kind: 'positive' | 'negative'): void {
  if (members.length < 2) return
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i]
      const b = members[j]
      const ab = ensureRelation(map, a, b)
      const ba = ensureRelation(map, b, a)
      if (kind === 'positive') {
        ab.affection = clamp(ab.affection + 2, 0, 100)
        ba.affection = clamp(ba.affection + 2, 0, 100)
        ab.trust = clamp(ab.trust + 1.5, 0, 100)
        ba.trust = clamp(ba.trust + 1.5, 0, 100)
        ab.conflict = clamp(ab.conflict - 1, 0, 100)
        ba.conflict = clamp(ba.conflict - 1, 0, 100)
      } else {
        ab.conflict = clamp(ab.conflict + 1.5, 0, 100)
        ba.conflict = clamp(ba.conflict + 1.5, 0, 100)
      }
    }
  }
}

export function teamChemistry(map: RelationsMap, workforce: RelatablePerson[]): number {
  if (workforce.length < 2) return 0
  let total = 0
  let n = 0
  for (let i = 0; i < workforce.length; i++) {
    for (let j = i + 1; j < workforce.length; j++) {
      const a = workforce[i]
      const b = workforce[j]
      const rel = (relationshipScore(map, a, b) + relationshipScore(map, b, a)) / 2
      total += mbtiCompatibility(a.mbti, b.mbti) * 0.25 + traitPairScore(a, b) * 0.45 + rel * 0.3
      n++
    }
  }
  return n ? total / n : 0
}
