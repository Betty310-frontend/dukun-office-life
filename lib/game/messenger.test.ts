import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateMessengerScene,
  generateDailyMessenger,
  messengerSceneTitle,
  performanceMessengerSceneType,
} from './messenger'
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
    traits: [],
    prefTraits: [],
    skill: 70,
    sales: 50,
    crisis: 60,
    stress: 25,
    ...overrides,
  }
}

// 워크포스가 정확히 2명일 때 pickTwo()가 무한루프에 빠지지 않도록(lib/game/social-events.test.ts 참고)
// 두 값을 끝없이 번갈아 반환하는 mock을 쓴다.
function mockAlternatingRandom(values: [number, number]) {
  let i = 0
  vi.spyOn(Math, 'random').mockImplementation(() => values[i++ % 2])
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('performanceMessengerSceneType', () => {
  it('always returns one of the 20 known scene types', () => {
    const known = new Set([
      'budget', 'conversion', 'ctr', 'cpc', 'creative', 'tracking',
      'client_flipflop', 'client_pressure', 'client_urgent', 'client_report',
      'keyword', 'landing', 'report_deadline', 'test_result',
      'lunch', 'coffee', 'leave', 'weekend', 'snack', 'commute',
    ])
    for (let i = 0; i < 30; i++) {
      expect(known.has(performanceMessengerSceneType(Math.random() < 0.5))).toBe(true)
    }
  })
})

describe('messengerSceneTitle', () => {
  it('gives every known scene type a non-empty title', () => {
    const types = [
      'budget', 'conversion', 'ctr', 'cpc', 'creative', 'tracking',
      'client_flipflop', 'client_pressure', 'client_urgent', 'client_report',
      'keyword', 'landing', 'report_deadline', 'test_result',
      'lunch', 'coffee', 'leave', 'weekend', 'snack', 'commute',
    ]
    for (const t of types) expect(messengerSceneTitle(t).length).toBeGreaterThan(0)
  })

  it('falls back to a generic title for an unknown type', () => {
    expect(messengerSceneTitle('없는타입')).toBe('메신저 대화')
  })
})

describe('generateMessengerScene', () => {
  it('always produces at least 2 lines', () => {
    const map: RelationsMap = new Map()
    const a = member({ id: '1', name: 'A' })
    const b = member({ id: '2', name: 'B' })
    for (let i = 0; i < 10; i++) {
      const scene = generateMessengerScene(map, a, b, '2026-09-10')
      expect(scene.lines.length).toBeGreaterThanOrEqual(2)
      expect(scene.participants).toEqual([{ type: 'npc', id: '1' }, { type: 'npc', id: '2' }])
      expect(scene.names).toEqual(['A', 'B'])
    }
  })
})

describe('generateDailyMessenger', () => {
  it('returns no scenes with fewer than 2 people', () => {
    const map: RelationsMap = new Map()
    expect(generateDailyMessenger(map, [member()], '2026-09-10')).toEqual([])
  })

  it('produces at least one scene for a workforce of 2', () => {
    mockAlternatingRandom([0, 0.9])
    const map: RelationsMap = new Map()
    const workforce = [member({ id: '1', name: 'A' }), member({ id: '2', name: 'B' })]
    const scenes = generateDailyMessenger(map, workforce, '2026-09-10')
    expect(scenes.length).toBeGreaterThan(0)
  })
})
