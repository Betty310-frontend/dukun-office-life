import { describe, it, expect, vi, afterEach } from 'vitest'
import { dailySocialEvents, seasonalSocialEvent, timedSocialEvent } from './social-events'
import type { RelationsMap } from './relations'
import type { WorkforceMember } from './types'

function member(overrides: Partial<WorkforceMember> = {}): WorkforceMember {
  return {
    type: 'npc',
    id: '1',
    name: '테스트',
    team: '기획1팀',
    rank: '사원',
    role: 'AE',
    gender: '여성',
    mbti: 'ENFP',
    workStyle: '협업중시형',
    traits: ['친화적'],
    prefTraits: [],
    skill: 70,
    sales: 50,
    crisis: 60,
    stress: 25,
    ...overrides,
  }
}

// pickTwo()의 while 루프는 `b`가 `a`와 달라질 때까지 계속 뽑는다 — 워크포스가 정확히 2명일 때
// Math.random을 상수로 mock하면 항상 같은 인덱스만 골라 무한루프에 빠진다(값을 소진해 마지막 값에
// 고정되는 시퀀스도 마찬가지). 두 값을 끝없이 번갈아 반환하도록 해서, 연속된 두 호출은 항상 서로
// 달라 pickTwo가 몇 번을 다시 불려도(하루에 여러 슬롯이 각각 pickTwo를 부름) 안전하게 종료되게 한다.
function mockAlternatingRandom(values: [number, number]) {
  let i = 0
  vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % 2])
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dailySocialEvents', () => {
  it('returns no events with fewer than 2 people', () => {
    const map: RelationsMap = new Map()
    expect(dailySocialEvents(map, [member()], false)).toEqual([])
  })

  it('can generate events for a weekday workforce of 2+', () => {
    // pickTwo: 0 -> a=idx0, 0.9 -> b=idx1 (differs, loop exits). 이후 모든 슬롯 확률/분기는 0으로 고정.
    mockAlternatingRandom([0, 0.9])
    const map: RelationsMap = new Map()
    const workforce = [member({ id: '1', name: 'A' }), member({ id: '2', name: 'B' })]
    const events = dailySocialEvents(map, workforce, false)
    expect(events.length).toBeGreaterThan(0)
    expect(events[0]).toContain('[')
  })
})

describe('timedSocialEvent', () => {
  it('returns null when there are fewer than 2 people', () => {
    const map: RelationsMap = new Map()
    expect(timedSocialEvent(map, [member()], '점심시간')).toBeNull()
  })

  it('mutates the relations map for the picked pair', () => {
    mockAlternatingRandom([0, 0.9]) // pickTwo differs, then low roll -> positive branch, first choice
    const map: RelationsMap = new Map()
    const workforce = [member({ id: '1', name: 'A' }), member({ id: '2', name: 'B' })]
    const text = timedSocialEvent(map, workforce, '점심시간')
    expect(text).toMatch(/^\[점심시간\]/)
    expect(map.size).toBeGreaterThan(0)
  })
})

describe('seasonalSocialEvent', () => {
  it('returns null when there are fewer than 2 people', () => {
    const map: RelationsMap = new Map()
    expect(seasonalSocialEvent(map, [member()], '가을', false)).toBeNull()
  })

  it('prefixes the event with the season label', () => {
    mockAlternatingRandom([0, 0.9])
    const map: RelationsMap = new Map()
    const workforce = [member({ id: '1', name: 'A' }), member({ id: '2', name: 'B' })]
    const text = seasonalSocialEvent(map, workforce, '가을', false)
    expect(text).toMatch(/^\[계절 · 가을\]/)
  })
})
