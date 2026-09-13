// 원본 legacy-reference/원본_V31.html 5011-5019행(normalizeLogText), 5039-5047행(categorizeLog)을 그대로 포팅.

export type LogCategory = 'work' | 'offwork' | 'commute' | 'weekend' | 'season'

export function normalizeLogText(value: unknown): string {
  return String(value ?? '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\\[nrt]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function categorizeLog(text: string, isWeekend = false): LogCategory {
  const t = String(text || '')
  if (/\[계절|봄|여름|가을|겨울|기념일|연말|크리스마스|새해|벚꽃/.test(t)) return 'season'
  if (/\[주말\]|주말|휴식일|공휴일/.test(t) || isWeekend) return 'weekend'
  if (/\[출근 전\]|\[출근길\]|\[점심시간\]|\[퇴근길\]|\[퇴근 후\]|출근 전|출근길|점심시간|퇴근길|퇴근 후/.test(t)) return 'commute'
  if (/팀 회식|팀 점심|팀 잡담/.test(t)) return 'offwork'
  if (/수주|광고주|업무|협업|성과|캠페인|매출|손익|처리 용량|평판|스트레스|월말 정산|인건비|운영비|위기|결재|디자인|전환|실무|팀 회의|팀 협업/.test(t)) return 'work'
  return 'offwork'
}
