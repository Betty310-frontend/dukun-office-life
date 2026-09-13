import { describe, it, expect } from 'vitest'
import { categorizeLog, normalizeLogText } from './log-category'

describe('categorizeLog', () => {
  it('classifies season events first', () => {
    expect(categorizeLog('[계절] 벚꽃이 흩날린다', false)).toBe('season')
    expect(categorizeLog('크리스마스 파티가 열렸다', false)).toBe('season')
  })

  it('classifies weekend events, including via the isWeekend flag', () => {
    expect(categorizeLog('[주말] 늘어지게 잤다', false)).toBe('weekend')
    expect(categorizeLog('공휴일이라 다들 쉬었다', false)).toBe('weekend')
    expect(categorizeLog('그냥 평범한 하루였다', true)).toBe('weekend')
  })

  it('classifies commute/lunch time-slot events', () => {
    expect(categorizeLog('[출근길] 지하철이 붐볐다', false)).toBe('commute')
    expect(categorizeLog('점심시간에 다같이 식사했다', false)).toBe('commute')
  })

  it('classifies team off-work events', () => {
    expect(categorizeLog('팀 회식이 있었다', false)).toBe('offwork')
    expect(categorizeLog('팀 잡담이 오갔다', false)).toBe('offwork')
  })

  it('classifies work-related events', () => {
    expect(categorizeLog('신규 광고주 수주에 성공했다', false)).toBe('work')
    expect(categorizeLog('이번 달 매출이 올랐다', false)).toBe('work')
  })

  it('falls back to offwork when nothing else matches', () => {
    expect(categorizeLog('아무 일 없이 하루가 지나갔다', false)).toBe('offwork')
  })

  it('respects branch priority order (season > weekend > commute > offwork > work)', () => {
    expect(categorizeLog('[계절] 주말 출근길 팀 회식 매출', false)).toBe('season')
    expect(categorizeLog('[주말] 출근길 팀 회식 매출', false)).toBe('weekend')
    expect(categorizeLog('[출근길] 팀 회식 매출', false)).toBe('commute')
    expect(categorizeLog('팀 회식 매출', false)).toBe('offwork')
  })
})

describe('normalizeLogText', () => {
  it('trims and collapses whitespace/newlines', () => {
    expect(normalizeLogText('  hello   world  ')).toBe('hello world')
    expect(normalizeLogText('line1\n\n\n\nline2')).toBe('line1\n\nline2')
  })

  it('strips control characters and the unicode replacement character', () => {
    expect(normalizeLogText('a\u0000b\u007Fc')).toBe('a b c')
    expect(normalizeLogText('broken\uFFFDtext')).toBe('brokentext')
  })

  it('normalizes escaped \\n \\r \\t sequences and real CRLF newlines', () => {
    expect(normalizeLogText('a\\nb\\tc')).toBe('a b c')
    expect(normalizeLogText('a\r\nb')).toBe('a\nb')
  })

  it('handles nullish input', () => {
    expect(normalizeLogText(null)).toBe('')
    expect(normalizeLogText(undefined)).toBe('')
  })
})
