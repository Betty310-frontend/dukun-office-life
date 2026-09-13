import { describe, it, expect } from 'vitest'
import {
  seasonName,
  weekdayNameFromDate,
  isWeekendDate,
  isFridayDate,
  addOneDay,
  isMonthEndDate,
  formatDate,
  weekendRecovery,
} from './date'

describe('date utils', () => {
  it('classifies 2026-09-10 as 가을 · 목요일 · 평일', () => {
    expect(seasonName('2026-09-10')).toBe('가을')
    expect(weekdayNameFromDate('2026-09-10')).toBe('목요일')
    expect(isWeekendDate('2026-09-10')).toBe(false)
    expect(isFridayDate('2026-09-10')).toBe(false)
  })

  it('identifies weekends and Fridays correctly', () => {
    expect(isWeekendDate('2026-09-12')).toBe(true) // 토요일
    expect(isWeekendDate('2026-09-13')).toBe(true) // 일요일
    expect(isFridayDate('2026-09-11')).toBe(true) // 금요일
  })

  it('advances one day, including across month boundaries', () => {
    expect(addOneDay('2026-09-10')).toBe('2026-09-11')
    expect(addOneDay('2026-09-30')).toBe('2026-10-01')
  })

  it('detects month-end dates', () => {
    expect(isMonthEndDate('2026-09-30')).toBe(true)
    expect(isMonthEndDate('2026-09-29')).toBe(false)
  })

  it('formats dates in Korean', () => {
    expect(formatDate('2026-09-10')).toBe('2026년 9월 10일')
  })

  it('gives Saturday a shorter weekend recovery than Sunday', () => {
    expect(weekendRecovery('2026-09-12')).toBe(6) // 토요일
    expect(weekendRecovery('2026-09-13')).toBe(7) // 일요일
  })
})
