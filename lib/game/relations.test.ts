import { describe, it, expect } from 'vitest'
import {
  ensureRelation,
  relationshipScore,
  applySocialShift,
  applyTeamShift,
  teamChemistry,
  type RelationsMap,
  type RelatablePerson,
} from './relations'

function person(overrides: Partial<RelatablePerson> = {}): RelatablePerson {
  return {
    type: 'npc',
    id: '1',
    gender: '여성',
    mbti: 'ENFP',
    workStyle: '협업중시형',
    traits: ['친화적'],
    prefTraits: [],
    ...overrides,
  }
}

describe('ensureRelation', () => {
  it('creates a default entry (50/50/10/5) for an unseen pair', () => {
    const map: RelationsMap = new Map()
    const a = { type: 'npc' as const, id: '1' }
    const b = { type: 'npc' as const, id: '2' }
    expect(ensureRelation(map, a, b)).toEqual({ affection: 50, trust: 50, conflict: 10, romantic: 5 })
  })

  it('returns the same mutable object on repeated calls for the same pair', () => {
    const map: RelationsMap = new Map()
    const a = { type: 'npc' as const, id: '1' }
    const b = { type: 'npc' as const, id: '2' }
    const first = ensureRelation(map, a, b)
    first.affection = 80
    const second = ensureRelation(map, a, b)
    expect(second.affection).toBe(80)
  })

  it('keeps a>b and b>a as independent directional entries', () => {
    const map: RelationsMap = new Map()
    const a = { type: 'npc' as const, id: '1' }
    const b = { type: 'npc' as const, id: '2' }
    ensureRelation(map, a, b).affection = 90
    expect(ensureRelation(map, b, a).affection).toBe(50)
  })
})

describe('relationshipScore', () => {
  it('stays within [-0.5, 1]', () => {
    const map: RelationsMap = new Map()
    const a = { type: 'npc' as const, id: '1' }
    const b = { type: 'npc' as const, id: '2' }
    const score = relationshipScore(map, a, b)
    expect(score).toBeGreaterThanOrEqual(-0.5)
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe('applySocialShift', () => {
  it('increases affection and trust for a warm interaction', () => {
    const map: RelationsMap = new Map()
    const a = person({ id: '1', gender: '여성' })
    const b = person({ id: '2', gender: '여성' })
    applySocialShift(map, a, b, 'warm')
    const ab = ensureRelation(map, a, b)
    expect(ab.affection).toBeGreaterThan(50)
    expect(ab.trust).toBeGreaterThan(50)
  })

  it('increases conflict for a conflict interaction', () => {
    const map: RelationsMap = new Map()
    const a = person({ id: '1' })
    const b = person({ id: '2' })
    applySocialShift(map, a, b, 'conflict')
    expect(ensureRelation(map, a, b).conflict).toBeGreaterThan(10)
  })
})

describe('applyTeamShift', () => {
  it('raises affection for every pair on a positive team event', () => {
    const map: RelationsMap = new Map()
    const members = [{ type: 'npc' as const, id: '1' }, { type: 'npc' as const, id: '2' }, { type: 'npc' as const, id: '3' }]
    applyTeamShift(map, members, 'positive')
    expect(ensureRelation(map, members[0], members[1]).affection).toBeGreaterThan(50)
    expect(ensureRelation(map, members[1], members[2]).affection).toBeGreaterThan(50)
  })

  it('does nothing for fewer than 2 members', () => {
    const map: RelationsMap = new Map()
    applyTeamShift(map, [{ type: 'npc', id: '1' }], 'positive')
    expect(map.size).toBe(0)
  })
})

describe('teamChemistry', () => {
  it('returns 0 for fewer than 2 people', () => {
    const map: RelationsMap = new Map()
    expect(teamChemistry(map, [person()])).toBe(0)
  })

  it('returns a finite number for 2+ people', () => {
    const map: RelationsMap = new Map()
    const workforce = [person({ id: '1' }), person({ id: '2' })]
    expect(Number.isFinite(teamChemistry(map, workforce))).toBe(true)
  })
})
