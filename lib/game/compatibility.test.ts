import { describe, it, expect } from 'vitest'
import {
  mbtiCompatibility,
  traitPairScore,
  styleMods,
  workStyleCompatibility,
  rankLeadershipBonus,
  roleImpactBonus,
} from './compatibility'

describe('mbtiCompatibility', () => {
  it('scores an identical MBTI higher than a fully opposite one', () => {
    const same = mbtiCompatibility('ENFP', 'ENFP')
    const opposite = mbtiCompatibility('ENFP', 'ISTJ')
    expect(same).toBeGreaterThan(opposite)
  })

  it('returns 0 when either MBTI is missing', () => {
    expect(mbtiCompatibility('', 'ENFP')).toBe(0)
  })
})

describe('traitPairScore', () => {
  it('is positive for a known POSITIVE_PAIRS combo', () => {
    const a = { traits: ['협업형'] }
    const b = { traits: ['친화적'] }
    expect(traitPairScore(a, b)).toBeGreaterThan(0)
  })

  it('is negative for a known NEGATIVE_PAIRS combo', () => {
    const a = { traits: ['직설적'] }
    const b = { traits: ['갈등 회피'] }
    expect(traitPairScore(a, b)).toBeLessThan(0)
  })

  it('is 0 for traits with no defined relationship', () => {
    const a = { traits: ['야근 내성'] }
    const b = { traits: ['안정 선호'] }
    expect(traitPairScore(a, b)).toBe(0)
  })
})

describe('styleMods', () => {
  it('matches the original literal values for 협업중시형', () => {
    expect(styleMods('협업중시형')).toEqual({ prod: 0.01, stress: -0.02, quality: 0.02, team: 0.05 })
  })

  it('falls back to 안정운영형 for an unknown style', () => {
    expect(styleMods('없는스타일')).toEqual(styleMods('안정운영형'))
  })
})

describe('workStyleCompatibility', () => {
  it('rewards two 협업중시형 more than two mismatched neutral styles', () => {
    const collab = workStyleCompatibility({ workStyle: '협업중시형' }, { workStyle: '협업중시형' })
    expect(collab).toBe(1.2)
  })

  it('penalizes 성과집착형 paired with 안정운영형', () => {
    expect(workStyleCompatibility({ workStyle: '성과집착형' }, { workStyle: '안정운영형' })).toBe(-0.8)
  })
})

describe('rankLeadershipBonus / roleImpactBonus', () => {
  it('gives 대표 the highest leadership bonus and 인턴 a negative one', () => {
    expect(rankLeadershipBonus({ rank: '대표' })).toBe(0.07)
    expect(rankLeadershipBonus({ rank: '인턴' })).toBe(-0.01)
  })

  it('only grants role impact bonus for the matching context', () => {
    expect(roleImpactBonus({ role: 'AE' }, 'execution')).toBeGreaterThan(0)
    expect(roleImpactBonus({ role: 'AE' }, 'creative')).toBe(0)
  })
})
