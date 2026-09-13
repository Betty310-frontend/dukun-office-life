// 원본 legacy-reference/원본_V31.html 1734-1832행(궁합/성격/업무 스타일 스코어링), 1802-1808행,
// 1810-1822행(workStyleCompatibility)을 그대로 포팅. 숫자·확률은 한 글자도 바꾸지 않음.
import { clamp } from './format'

export const MBTIS = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

export const POSITIVE_PAIRS: [string, string, number][] = [
  ['협업형', '친화적', 0.45],
  ['협업형', '공감형', 0.5],
  ['리더십', '책임감 강함', 0.35],
  ['꼼꼼함', '책임감 강함', 0.4],
  ['창의적', '변화 선호', 0.45],
  ['직설적', '눈치 빠름', 0.25],
  ['독립적', '책임감 강함', 0.25],
  ['경쟁적', '리더십', 0.2],
  ['완벽주의', '꼼꼼함', 0.2],
  ['즉흥적', '창의적', 0.25],
]

export const NEGATIVE_PAIRS: [string, string, number][] = [
  ['직설적', '갈등 회피', -0.65],
  ['경쟁적', '경쟁적', -0.35],
  ['독립적', '협업형', -0.2],
  ['완벽주의', '즉흥적', -0.5],
  ['변화 선호', '안정 선호', -0.55],
  ['리더십', '리더십', -0.2],
  ['감정기복', '직설적', -0.35],
  ['완벽주의', '감정기복', -0.25],
  ['꼼꼼함', '즉흥적', -0.3],
]

export interface TraitBearer {
  traits: string[]
}

export function hasTrait(p: TraitBearer, t: string): boolean {
  return (p.traits || []).includes(t)
}

export function traitPairScore(a: TraitBearer, b: TraitBearer): number {
  let score = 0
  for (const [x, y, v] of POSITIVE_PAIRS) {
    if ((hasTrait(a, x) && hasTrait(b, y)) || (hasTrait(a, y) && hasTrait(b, x))) score += v
  }
  for (const [x, y, v] of NEGATIVE_PAIRS) {
    if (x === y) {
      if (hasTrait(a, x) && hasTrait(b, x)) score += v
    } else if ((hasTrait(a, x) && hasTrait(b, y)) || (hasTrait(a, y) && hasTrait(b, x))) {
      score += v
    }
  }
  return clamp(score, -1.2, 1.2)
}

export function mbtiCompatibility(a: string, b: string): number {
  if (!a || !b) return 0
  let score = 0
  // 게임용 휴리스틱: 공통 선호는 의사소통 안정성, 차이는 관점 다양성으로 소폭 반영
  for (let i = 0; i < 4; i++) score += a[i] === b[i] ? 0.45 : 0.2
  if (a[1] !== b[1]) score += 0.35 // S/N 관점 다양성
  if (a[2] === b[2]) score += 0.25 // 의사결정 방식 일치
  if (a[3] !== b[3]) score += 0.15 // J/P 실행 보완
  return clamp((score - 1.35) / 1.4, -0.6, 0.8)
}

interface WorkStyleBearer {
  workStyle: string
}

export function workStyleCompatibility(a: WorkStyleBearer, b: WorkStyleBearer): number {
  const sa = (a && a.workStyle) || '안정운영형'
  const sb = (b && b.workStyle) || '안정운영형'
  if (sa === sb) return sa === '협업중시형' ? 1.2 : 0.6
  const good: [string, string][] = [
    ['속도중시형', '정확도중시형'], ['협업중시형', '독립처리형'],
    ['문제해결형', '안정운영형'], ['창의탐색형', '정확도중시형'],
    ['성과집착형', '협업중시형'],
  ]
  for (const [x, y] of good) if ((sa === x && sb === y) || (sa === y && sb === x)) return 0.8
  if ((sa === '성과집착형' && sb === '안정운영형') || (sb === '성과집착형' && sa === '안정운영형')) return -0.8
  if ((sa === '속도중시형' && sb === '정확도중시형') || (sb === '속도중시형' && sa === '정확도중시형')) return 0.4
  return 0
}

export interface StyleMod {
  prod: number
  stress: number
  quality: number
  team: number
}

export function styleMods(style: string): StyleMod {
  const m: Record<string, StyleMod> = {
    '속도중시형': { prod: 0.05, stress: 0.02, quality: -0.015, team: 0 },
    '정확도중시형': { prod: -0.01, stress: 0.01, quality: 0.06, team: 0.005 },
    '협업중시형': { prod: 0.01, stress: -0.02, quality: 0.02, team: 0.05 },
    '독립처리형': { prod: 0.035, stress: -0.01, quality: 0.01, team: -0.02 },
    '문제해결형': { prod: 0.025, stress: 0.005, quality: 0.025, team: 0.015 },
    '안정운영형': { prod: 0, stress: -0.03, quality: 0.015, team: 0.01 },
    '성과집착형': { prod: 0.07, stress: 0.06, quality: 0.01, team: -0.01 },
    '창의탐색형': { prod: 0.02, stress: 0.015, quality: 0.035, team: 0.015 },
  }
  return m[style] || m['안정운영형']
}

export const ROLE_META: Record<string, { label: string; impact: string }> = {
  'AM': { label: '광고주 커뮤니케이션·관계관리', impact: 'client' },
  'AE': { label: '캠페인 운영·매체 실행·성과관리', impact: 'execution' },
  '퍼포먼스 마케팅': { label: '데이터 분석·입찰·전환 최적화', impact: 'performance' },
  '디자인': { label: '광고 소재·브랜드 비주얼 제작', impact: 'creative' },
  '웹페이지 코딩·제작': { label: '랜딩페이지·전환 페이지 구현', impact: 'web' },
  '전략기획팀': { label: '시장·데이터 분석 및 전략 설계', impact: 'strategy' },
  '인사담당': { label: '채용·조직관리·직원 컨디션 관리', impact: 'people' },
  '회계담당': { label: '비용·매출·현금흐름 관리', impact: 'finance' },
  '결재담당': { label: '예산·의사결정 승인 및 병목 관리', impact: 'approval' },
}

export function roleImpactBonus(p: { role: string }, ctx: string): number {
  const r = p.role
  let b = 0
  if (r === 'AM' && ctx === 'client') b += 0.07
  if (r === 'AE' && ctx === 'execution') b += 0.06
  if (r === '퍼포먼스 마케팅' && ctx === 'performance') b += 0.08
  if (r === '디자인' && ctx === 'creative') b += 0.07
  if (r === '웹페이지 코딩·제작' && ctx === 'web') b += 0.07
  if (r === '전략기획팀' && ctx === 'strategy') b += 0.075
  if (r === '인사담당' && ctx === 'people') b += 0.07
  if (r === '회계담당' && ctx === 'finance') b += 0.075
  if (r === '결재담당' && ctx === 'approval') b += 0.065
  return b
}

export function rankLeadershipBonus(p: { rank: string }): number {
  const m: Record<string, number> = { 대표: 0.07, 팀장: 0.05, 차장: 0.04, 파트장: 0.035, 과장: 0.025, 대리: 0.012, 사원: 0, 인턴: -0.01 }
  return m[p.rank] || 0
}

export function traitStressMod(p: TraitBearer & { workStyle: string }): number {
  let m = 0
  if (hasTrait(p, '야근 내성')) m -= 4
  if (hasTrait(p, '책임감 강함')) m -= 1.5
  if (hasTrait(p, '감정기복')) m += 3
  if (hasTrait(p, '완벽주의')) m += 2
  if (hasTrait(p, '갈등 회피')) m += 1
  if (hasTrait(p, '친화적')) m -= 1
  m += styleMods(p.workStyle).stress * 10
  return m
}

export function traitPerformanceMod(
  p: TraitBearer & { workStyle: string; role: string; rank: string },
  role: 'sales' | 'lead' | 'fire' | string
): number {
  let m = 0
  if (hasTrait(p, '책임감 강함')) m += 0.025
  if (hasTrait(p, '꼼꼼함')) m += 0.02
  if (role === 'sales' && hasTrait(p, '친화적')) m += 0.035
  if (role === 'sales' && hasTrait(p, '경쟁적')) m += 0.025
  if (role === 'lead' && hasTrait(p, '리더십')) m += 0.04
  if (role === 'fire' && hasTrait(p, '눈치 빠름')) m += 0.03
  if (role === 'fire' && hasTrait(p, '직설적')) m += 0.015
  if (hasTrait(p, '완벽주의')) m += 0.01
  if (hasTrait(p, '즉흥적')) m += (Math.random() - 0.5) * 0.05

  const sm = styleMods(p.workStyle)
  m += sm.prod
  if (role === 'lead') m += rankLeadershipBonus(p) + roleImpactBonus(p, 'client') + roleImpactBonus(p, 'strategy')
  if (role === 'sales') m += roleImpactBonus(p, 'client') + roleImpactBonus(p, 'performance')
  if (role === 'fire') m += rankLeadershipBonus(p) + roleImpactBonus(p, 'approval') + roleImpactBonus(p, 'execution')
  return m
}
