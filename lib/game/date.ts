// 원본 legacy-reference/원본_V31.html 1398행(WEEKDAYS), 1781-1792행(날짜 유틸) 그대로 포팅

export const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

export function parseDate(str: string): Date {
  const [y, m, d] = String(str).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function dateISO(dt: Date): string {
  return dt.toISOString().slice(0, 10)
}

export function addDays(str: string, n: number): string {
  const d = parseDate(str)
  d.setUTCDate(d.getUTCDate() + n)
  return dateISO(d)
}

export function formatDate(str: string): string {
  const d = parseDate(str)
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`
}

export function weekdayIndexFromDate(str: string): number {
  return parseDate(str).getUTCDay()
}

export function weekdayNameFromDate(str: string): string {
  return WEEKDAYS[weekdayIndexFromDate(str)]
}

export function isWeekendDate(str: string): boolean {
  const i = weekdayIndexFromDate(str)
  return i === 0 || i === 6
}

export function isFridayDate(str: string): boolean {
  return weekdayIndexFromDate(str) === 5
}

export function seasonName(str: string): string {
  const m = parseDate(str).getUTCMonth() + 1
  if (m >= 3 && m <= 5) return '봄'
  if (m >= 6 && m <= 8) return '여름'
  if (m >= 9 && m <= 11) return '가을'
  return '겨울'
}

export function isMonthEndDate(str: string): boolean {
  const d = parseDate(str)
  const next = new Date(d)
  next.setUTCDate(d.getUTCDate() + 1)
  return next.getUTCMonth() !== d.getUTCMonth()
}

export function addOneDay(str: string): string {
  const d = parseDate(str)
  d.setUTCDate(d.getUTCDate() + 1)
  return dateISO(d)
}

export function weekendRecovery(str: string): number {
  return weekdayIndexFromDate(str) === 6 ? 6 : 7
}
