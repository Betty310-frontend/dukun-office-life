import { describe, it, expect, vi, afterEach } from 'vitest'
import { teamEvent, pickTeamWithAtLeast, teamMembers } from './team-events'
import { ensureRelation, type RelationsMap } from './relations'
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

afterEach(() => {
  vi.restoreAllMocks()
})

describe('teamMembers / pickTeamWithAtLeast', () => {
  it('groups workforce by team and only picks teams meeting the size threshold', () => {
    const workforce = [
      member({ id: '1', team: '기획1팀' }),
      member({ id: '2', team: '기획1팀' }),
      member({ id: '3', team: '제작팀' }),
    ]
    expect(teamMembers(workforce, '기획1팀')).toHaveLength(2)
    expect(pickTeamWithAtLeast(workforce, 2)).toBe('기획1팀')
    expect(pickTeamWithAtLeast(workforce, 3)).toBeNull()
  })
})

describe('teamEvent', () => {
  it('returns null when no team has at least 2 members', () => {
    const map: RelationsMap = new Map()
    const workforce = [member({ id: '1', team: '기획1팀' }), member({ id: '2', team: '제작팀' })]
    expect(teamEvent(map, workforce, '2026-09-10', false)).toBeNull()
  })

  it('bumps affection for every pair in the picked team on a positive roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // positive roll (< .78), first pool entry each time
    const map: RelationsMap = new Map()
    const workforce = [
      member({ id: '1', name: 'A', team: '기획1팀' }),
      member({ id: '2', name: 'B', team: '기획1팀' }),
    ]
    const result = teamEvent(map, workforce, '2026-09-10', false)
    expect(result).not.toBeNull()
    expect(result?.team).toBe('기획1팀')
    expect(result?.text).toContain('[')
    const rel = ensureRelation(map, workforce[0], workforce[1])
    expect(rel.affection).toBeGreaterThan(50)
  })
})
