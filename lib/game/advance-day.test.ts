import { describe, it, expect, vi, afterEach } from 'vitest'
import { advanceDay, type AdvanceDayInput } from './advance-day'
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
    skill: 80,
    sales: 70,
    crisis: 75,
    stress: 30,
    ...overrides,
  }
}

function baseInput(overrides: Partial<AdvanceDayInput> = {}): AdvanceDayInput {
  const lead = member({ id: 'lead', name: '리드' })
  const seller = member({ id: 'seller', name: '영업' })
  const fire = member({ id: 'fire', name: '파이어' })
  const workforce = [lead, seller, fire]
  return {
    currentDay: 1,
    currentDate: '2026-09-10', // 목요일
    companyState: { cash: 30000000, revenue: 0, clients: 5, reputation: 50 },
    salesMode: 'balanced',
    overtimeMode: 'normal',
    workforce,
    protagonists: [],
    lead,
    seller,
    fire,
    relations: new Map(),
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('advanceDay', () => {
  it('produces positive revenue on a weekday with existing clients', () => {
    const result = advanceDay(baseInput())
    expect(result.companyState.revenue).toBeGreaterThan(0)
  })

  it('produces zero revenue and a rest-day event on a weekend', () => {
    const result = advanceDay(baseInput({ currentDate: '2026-09-12' })) // 토요일
    expect(result.companyState.revenue).toBe(0)
    expect(result.events.some((e) => e.text.includes('휴식일'))).toBe(true)
  })

  it('starts with a summary event describing the date/weekday/season', () => {
    const result = advanceDay(baseInput())
    expect(result.events[0].type).toBe('summary')
    expect(result.events[0].text).toContain('2026년 9월 10일')
    expect(result.events[0].text).toContain('목요일')
    expect(result.events[0].text).toContain('가을')
    expect(result.events[1].type).toBe('summary')
  })

  it('emits at least one isProtagonist event when a profile is configured', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 항상 확률 분기를 통과(0.82 미만) — [주인공 업무] 이벤트 확정
    const me = member({ type: 'profile', id: 'me', name: '나', role: 'AM' })
    // workforce를 주인공 1명뿐으로 둬서 generateDailyMessenger/dailySocialEvents의 pickTwo가
    // 호출되지 않게 한다 — 상수로 고정된 Math.random에서 pickTwo의 while 루프는 무한루프에 빠진다.
    const result = advanceDay(
      baseInput({ workforce: [me], protagonists: [me], lead: me, seller: me, fire: me })
    )
    expect(result.events.some((e) => e.isProtagonist)).toBe(true)
  })

  it('changes at least one relationship entry when social/team events run', () => {
    let i = 0
    const values = [0.1, 0.9] // 두 값을 번갈아 반환 — pickTwo가 항상 다른 인덱스를 골라 무한루프를 피한다.
    vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % 2])

    const a = member({ id: 'a', name: 'A', team: '기획1팀' })
    const b = member({ id: 'b', name: 'B', team: '기획1팀' })
    const c = member({ id: 'c', name: 'C', team: '제작팀' })
    const relations: RelationsMap = new Map()
    const snapshot = [
      { ...ensureRelation(relations, a, b) },
      { ...ensureRelation(relations, b, a) },
      { ...ensureRelation(relations, a, c) },
      { ...ensureRelation(relations, c, a) },
      { ...ensureRelation(relations, b, c) },
      { ...ensureRelation(relations, c, b) },
    ]

    advanceDay(baseInput({ workforce: [a, b, c], lead: a, seller: b, fire: c, relations }))

    const after = [
      ensureRelation(relations, a, b),
      ensureRelation(relations, b, a),
      ensureRelation(relations, a, c),
      ensureRelation(relations, c, a),
      ensureRelation(relations, b, c),
      ensureRelation(relations, c, b),
    ]
    const changed = after.some(
      (entry, idx) =>
        entry.affection !== snapshot[idx].affection ||
        entry.trust !== snapshot[idx].trust ||
        entry.conflict !== snapshot[idx].conflict ||
        entry.romantic !== snapshot[idx].romantic
    )
    expect(changed).toBe(true)
  })

  it('never produces NaN even under extreme input (no clients, large workforce)', () => {
    const workforce = Array.from({ length: 10 }, (_, i) => member({ id: `w${i}`, name: `직원${i}` }))
    const result = advanceDay(
      baseInput({
        companyState: { cash: -5000000, revenue: 0, clients: 0, reputation: 50 },
        workforce,
        lead: workforce[0],
        seller: workforce[1],
        fire: workforce[2],
      })
    )
    expect(Number.isNaN(result.companyState.cash)).toBe(false)
    expect(Number.isNaN(result.companyState.revenue)).toBe(false)
    expect(Number.isNaN(result.companyState.clients)).toBe(false)
    expect(Number.isNaN(result.companyState.reputation)).toBe(false)
    for (const v of Object.values(result.workforceStress)) expect(Number.isNaN(v)).toBe(false)
  })
})
