import { describe, it, expect } from 'vitest'
import {
  fallbackTalkChoices,
  employeeChoiceTone,
  genericChoiceReply,
  relationDeltaForTalkChoice,
  hasTalkedToday,
  stableHash,
  type TalkChoice,
} from './talk'
import type { RelationEntry } from './relations'
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
    traits: [],
    prefTraits: [],
    skill: 70,
    sales: 50,
    crisis: 60,
    stress: 30,
    ...overrides,
  }
}

function relation(overrides: Partial<RelationEntry> = {}): RelationEntry {
  return { affection: 50, trust: 50, conflict: 10, romantic: 5, ...overrides }
}

describe('stableHash', () => {
  it('is deterministic for the same input', () => {
    expect(stableHash('a|b|c')).toBe(stableHash('a|b|c'))
  })
})

describe('fallbackTalkChoices', () => {
  it('returns exactly one choice per group and is deterministic per (npc, date)', () => {
    const a = fallbackTalkChoices('npc:1', '2026-09-10')
    const b = fallbackTalkChoices('npc:1', '2026-09-10')
    expect(a).toEqual(b)
    expect(new Set(a.map((c) => c.group))).toEqual(new Set(['업무', '관계', '일상']))
  })

  it('differs across dates', () => {
    const a = fallbackTalkChoices('npc:1', '2026-09-10')
    const b = fallbackTalkChoices('npc:1', '2026-09-11')
    expect(a).not.toEqual(b)
  })
})

describe('employeeChoiceTone', () => {
  it('maps 직설적 to direct', () => {
    expect(employeeChoiceTone(member({ traits: ['직설적'] }))).toBe('direct')
  })

  it('falls back to neutral with no matching traits/mbti', () => {
    expect(employeeChoiceTone(member({ traits: [], mbti: 'XXXX' }))).toBe('neutral')
  })
})

describe('genericChoiceReply', () => {
  it('returns non-empty text for a known kind', () => {
    const choice: TalkChoice = { group: '업무', kind: 'complete', topic: 'work', text: '완료했어요' }
    const text = genericChoiceReply(member(), choice, relation(), member({ type: 'profile', id: 'me' }))
    expect(text.length).toBeGreaterThan(0)
  })

  it('falls back to a group-level default for an unknown kind', () => {
    const choice: TalkChoice = { group: '업무', kind: 'not_a_real_kind', topic: 'work', text: '?' }
    const text = genericChoiceReply(member(), choice, relation(), member({ type: 'profile', id: 'me' }))
    expect(text).toBe('저는 그 방향 괜찮다고 봐요. 세부 내용만 한번 확인해보죠.')
  })
})

describe('relationDeltaForTalkChoice', () => {
  it('clamps deltas to [-4, 4]', () => {
    const choice: TalkChoice = { group: '관계', kind: 'praise', topic: 'praise', text: '잘하셨어요' }
    const delta = relationDeltaForTalkChoice(member(), choice, relation(), member({ type: 'profile', id: 'me' }))
    expect(delta.affection).toBeGreaterThanOrEqual(-4)
    expect(delta.affection).toBeLessThanOrEqual(4)
    expect(delta.trust).toBeGreaterThanOrEqual(-4)
    expect(delta.conflict).toBeLessThanOrEqual(4)
  })

  it('reduces conflict for an apology', () => {
    const choice: TalkChoice = { group: '관계', kind: 'apology', topic: 'casual', text: '미안해요' }
    const delta = relationDeltaForTalkChoice(member(), choice, relation(), member({ type: 'profile', id: 'me' }))
    expect(delta.conflict).toBeLessThan(0)
  })
})

describe('hasTalkedToday', () => {
  it('is true only when last_talked_date matches the company date', () => {
    expect(hasTalkedToday('2026-09-10', '2026-09-10')).toBe(true)
    expect(hasTalkedToday('2026-09-09', '2026-09-10')).toBe(false)
    expect(hasTalkedToday(null, '2026-09-10')).toBe(false)
  })
})
