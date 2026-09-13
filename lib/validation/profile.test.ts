import { describe, it, expect } from 'vitest'
import { profileSchema, DEFAULT_PROFILE, JOB_RANKS } from './profile'

describe('profileSchema', () => {
  it('accepts a valid profile', () => {
    const result = profileSchema.safeParse({
      ...DEFAULT_PROFILE,
      name: '홍길동',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = profileSchema.safeParse({
      ...DEFAULT_PROFILE,
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a rank not in JOB_RANKS', () => {
    const result = profileSchema.safeParse({
      ...DEFAULT_PROFILE,
      name: '홍길동',
      rank: '없는직급',
    })
    expect(result.success).toBe(false)
  })

  it('exposes the original job rank list', () => {
    expect(JOB_RANKS).toEqual(['대표', '팀장', '과장', '차장', '파트장', '대리', '사원', '인턴'])
  })
})
