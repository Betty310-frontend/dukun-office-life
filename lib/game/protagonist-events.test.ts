import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  protagonistDailyEvent,
  protagonistEmployeeInteraction,
  protagonistRoleSynergy,
} from './protagonist-events'
import { ensureRelation, type RelationsMap } from './relations'
import type { WorkforceMember } from './types'

function member(overrides: Partial<WorkforceMember> = {}): WorkforceMember {
  return {
    type: 'npc',
    id: '1',
    name: '김팀장',
    team: '기획1팀',
    rank: '팀장',
    role: 'AE',
    gender: '남성',
    mbti: 'ENTJ',
    workStyle: '협업중시형',
    traits: ['리더십'],
    prefTraits: [],
    skill: 82,
    sales: 62,
    crisis: 88,
    stress: 28,
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('protagonistRoleSynergy', () => {
  it('rewards a known synergy pair regardless of order', () => {
    expect(protagonistRoleSynergy({ role: 'AE' }, { role: '디자인' })).toBeGreaterThan(0)
    expect(protagonistRoleSynergy({ role: '디자인' }, { role: 'AE' })).toBeGreaterThan(0)
  })

  it('returns 0 for an unrelated pair', () => {
    expect(protagonistRoleSynergy({ role: 'AE' }, { role: '회계담당' })).toBe(0)
  })
})

describe('protagonistEmployeeInteraction', () => {
  it('returns null when there are no candidates', () => {
    const map: RelationsMap = new Map()
    const me = member({ type: 'profile', id: 'me' })
    expect(protagonistEmployeeInteraction(map, me, [], '2026-09-10')).toBeNull()
  })

  it('prefixes the returned text with "나 ↔" and updates the relation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // low roll -> positive branch throughout
    const map: RelationsMap = new Map()
    const me = member({ type: 'profile', id: 'me', name: '나' })
    const emp = member({ type: 'npc', id: '1', name: '김팀장' })
    const result = protagonistEmployeeInteraction(map, me, [emp], '2026-09-10')
    expect(result?.text).toMatch(/^나 ↔ 김팀장:/)
    const rel = ensureRelation(map, me, emp)
    expect(rel.affection).toBeGreaterThan(50)
  })
})

describe('protagonistDailyEvent', () => {
  it('returns null when there are no candidates', () => {
    const map: RelationsMap = new Map()
    const me = member({ type: 'profile', id: 'me' })
    expect(protagonistDailyEvent(map, me, [], '2026-09-10')).toBeNull()
  })

  it('prefixes the returned text with "나의 하루:"', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always passes the chance roll, picks first pool entry
    const map: RelationsMap = new Map()
    const me = member({ type: 'profile', id: 'me', name: '나' })
    const emp = member({ type: 'npc', id: '1', name: '김팀장' })
    const result = protagonistDailyEvent(map, me, [emp], '2026-09-10')
    expect(result?.text).toMatch(/^나의 하루:/)
  })
})
