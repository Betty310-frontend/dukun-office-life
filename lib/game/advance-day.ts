// 원본 legacy-reference/원본_V31.html 5605-5717행(runDay)을 순수 함수로 포팅.
// DOM/alert/localStorage/렌더링 호출은 전부 제거하고, 명시적 입력(스냅샷)을 받아 명시적 결과(diff)를 반환한다.
// getPerson/$(...).value 같은 DOM 읽기는 input.lead/seller/fire/salesMode/overtimeMode로 대체했다.
// alert(...)/openMeTab()(원본 5606-5611행, 미설정 주인공 경고)은 호출부(서버 액션)의 책임이므로 없다.
import { clamp, fmt, josa } from './format'
import {
  formatDate,
  isFridayDate,
  isMonthEndDate,
  isWeekendDate,
  seasonName,
  weekdayNameFromDate,
  weekendRecovery,
} from './date'
import {
  hasTrait,
  mbtiCompatibility,
  roleImpactBonus,
  styleMods,
  traitPairScore,
  traitPerformanceMod,
  traitStressMod,
} from './compatibility'
import { relationshipScore, teamChemistry, type RelationsMap } from './relations'
import { dailySocialEvents, seasonalSocialEvent } from './social-events'
import { protagonistDailyEvent, protagonistEmployeeInteraction } from './protagonist-events'
import { teamEvent } from './team-events'
import { generateDailyMessenger, type MessengerScene } from './messenger'
import type { WorkforceMember } from './types'

export type SalesMode = 'safe' | 'balanced' | 'aggressive'
export type OvertimeMode = 'none' | 'normal' | 'hard'

export interface CompanyStateSnapshot {
  cash: number
  revenue: number
  clients: number
  reputation: number
}

export interface AdvanceDayInput {
  currentDay: number
  currentDate: string // 'YYYY-MM-DD'
  companyState: CompanyStateSnapshot
  salesMode: SalesMode
  overtimeMode: OvertimeMode
  workforce: WorkforceMember[] // 활성 npc + is_configured 실유저 전원
  protagonists: WorkforceMember[] // workforce의 부분집합 — actorType==='profile'인 것들
  lead: WorkforceMember
  seller: WorkforceMember
  fire: WorkforceMember
  relations: RelationsMap // Task 2에서 DB로부터 미리 로드해 넘김 — 이 함수가 in-place mutate
}

export interface AdvanceDayEvent {
  text: string
  type: 'summary' | 'event'
  isProtagonist: boolean
}

export interface AdvanceDayResult {
  events: AdvanceDayEvent[]
  companyState: CompanyStateSnapshot
  workforceStress: Record<string, number> // actorId -> 새 stress
  messengerScenes: MessengerScene[]
}

const ROLE_TEXT: Record<string, string> = {
  AM: '광고주 커뮤니케이션을 맡아 관계 관리에 힘을 보탰다.',
  AE: '캠페인 운영과 일정 조율을 도왔다.',
  '퍼포먼스 마케팅': '광고 데이터를 점검하고 성과 개선안을 제안했다.',
  '디자인': '광고 소재 제작과 비주얼 검수를 도왔다.',
  '웹페이지 코딩·제작': '랜딩페이지와 전환 요소를 점검했다.',
  '전략기획팀': '시장과 데이터를 정리해 전략 방향을 제안했다.',
  '인사담당': '직원들의 업무 컨디션과 조직 이슈를 살폈다.',
  '회계담당': '비용과 매출 흐름을 점검했다.',
  '결재담당': '업무 요청과 예산 결재를 검토했다.',
}

export function advanceDay(input: AdvanceDayInput): AdvanceDayResult {
  const { currentDay, currentDate, salesMode, overtimeMode, workforce, protagonists, lead, seller, fire, relations } = input
  const cash0 = input.companyState.cash
  const clients0 = input.companyState.clients
  const reputation0 = input.companyState.reputation

  const wName = weekdayNameFromDate(currentDate)
  const season = seasonName(currentDate)
  const weekend = isWeekendDate(currentDate)
  const friday = isFridayDate(currentDate)

  const salesBoost = { safe: -1, balanced: 0, aggressive: 2 }[salesMode]
  const overtimeBoost = { none: -0.05, normal: 0.05, hard: 0.14 }[overtimeMode]
  const overtimeStress = { none: -6, normal: 5, hard: 14 }[overtimeMode]

  const avgSkill = workforce.reduce((a, p) => a + (Number(p.skill) || 0), 0) / Math.max(1, workforce.length)
  const capacity = Math.max(1, Math.floor(workforce.length * 1.8))
  const chemistry = teamChemistry(relations, workforce)
  const trioMbti =
    (mbtiCompatibility(lead.mbti, seller.mbti) + mbtiCompatibility(lead.mbti, fire.mbti) + mbtiCompatibility(seller.mbti, fire.mbti)) / 3
  const trioTraits = (traitPairScore(lead, seller) + traitPairScore(lead, fire) + traitPairScore(seller, fire)) / 3
  const trioChem = trioMbti * 0.35 + trioTraits * 0.65

  const events: string[] = []
  const protagonistEvents: string[] = []
  let wins = 0
  const payroll = (workforce.length * 4200000) / 30
  let overhead = (7000000 + clients0 * 700000) / 30

  let cash = cash0
  let revenue = 0
  let clients = clients0
  let reputation = reputation0

  if (weekend) {
    revenue = 0
    cash -= payroll + overhead
    for (const p of workforce) {
      let recovery = weekendRecovery(currentDate)
      if (hasTrait(p, '야근 내성')) recovery += 1
      if (hasTrait(p, '감정기복')) recovery -= 0.5
      if (hasTrait(p, '완벽주의')) recovery -= 0.5
      p.stress = clamp(p.stress - recovery, 0, 100)
    }
    events.push(`${wName}은 기본 휴식일입니다. 신규 수주와 일반 업무는 진행되지 않습니다.`)
    events.push('직원들이 휴식하며 스트레스가 회복되었습니다. 고정 인건비와 운영비는 계속 발생합니다.')
  } else {
    const monthlyWins = Math.max(0, seller.sales / 35 + reputation / 60 + salesBoost + traitPerformanceMod(seller, 'sales') * 3)
    const dailyWinChance = clamp(monthlyWins / 22, 0, 0.65)
    wins = Math.random() < dailyWinChance ? 1 : 0
    const dailyChurnChance = 1 - Math.pow(1 - 0.22, 1 / 22)
    clients = Math.max(0, clients + wins - (Math.random() < dailyChurnChance ? 1 : 0))

    const overload = Math.max(0, clients - capacity)
    const quality = (avgSkill * 0.45 + lead.skill * 0.35 + fire.crisis * 0.2) / 100
    // 원본은 전역 protagonist(1명) 기준으로 playerWorkBonus를 계산했다 — 다중 실유저 일반화에서는
    // 활성 프로필들의 평균으로 대체한다(프로필이 없으면 0).
    const playerWorkBonus = protagonists.length
      ? protagonists.reduce((sum, me) => {
          return (
            sum +
            ((styleMods(me.workStyle).prod || 0) +
              roleImpactBonus(me, 'execution') * 0.35 +
              roleImpactBonus(me, 'performance') * 0.35 +
              roleImpactBonus(me, 'creative') * 0.25 +
              roleImpactBonus(me, 'client') * 0.25)
          )
        }, 0) / protagonists.length
      : 0
    const revenuePerClient =
      6500000 *
      (0.85 +
        quality * 0.35 +
        overtimeBoost +
        chemistry * 0.04 +
        trioChem * 0.035 +
        traitPerformanceMod(lead, 'lead') +
        traitPerformanceMod(fire, 'fire') * 0.6 +
        playerWorkBonus * 0.22)
    revenue = (clients * revenuePerClient) / 22
    overhead = (7000000 + clients * 700000) / 30
    cash += revenue - payroll - overhead

    const clientStress = (clients * 2.8 + overload * 8) / 22
    for (const p of workforce) {
      let d = clientStress / Math.max(1, workforce.length) + overtimeStress / 22
      if (p.type === lead.type && p.id === lead.id) d += 5 / 22
      if (p.type === seller.type && p.id === seller.id) d += 4 / 22
      if (p.type === fire.type && p.id === fire.id) d += 6 / 22
      d -= p.crisis / 550
      const peers = workforce.filter((q) => q !== p)
      const peerAvg = peers.length ? peers.reduce((a, q) => a + mbtiCompatibility(p.mbti, q.mbti), 0) / peers.length : 0
      const traitAvg = peers.length ? peers.reduce((a, q) => a + traitPairScore(p, q), 0) / peers.length : 0
      const relAvg = peers.length ? peers.reduce((a, q) => a + relationshipScore(relations, p, q), 0) / peers.length : 0
      d -= (peerAvg * 0.6) / 22 + (traitAvg * 2.5) / 22 + (relAvg * 1.8) / 22
      d += traitStressMod(p) / 22
      if (friday) d += 1.4
      p.stress = clamp(p.stress + d, 0, 100)
    }
    if (friday) events.push('금요일 피로 누적으로 전 직원 스트레스가 소폭 추가되었습니다.')

    for (const me of protagonists) {
      if (Math.random() < 0.82) {
        const roleText = ROLE_TEXT[me.role] || '팀 업무를 도왔다.'
        protagonistEvents.push(`[주인공 업무] ${me.name}${josa(me.name, '은', '는')} ${roleText}`)
      }
    }

    if (trioChem > 0.38) events.push('핵심 담당자들의 성격·업무 스타일 조합이 좋아 협업 시너지가 발생했습니다.')
    if (trioChem < -0.18) events.push('핵심 담당자들의 성격·업무 스타일 충돌로 커뮤니케이션 비용이 커졌습니다.')
    const pairs: [WorkforceMember, WorkforceMember][] = [
      [lead, seller],
      [lead, fire],
      [seller, fire],
    ]
    for (const [a, b] of pairs) {
      const ts = traitPairScore(a, b)
      if (ts > 0.55) events.push(`${a.name} ↔ ${b.name}: 성격 특성이 잘 맞아 협업 보너스가 발생했습니다.`)
      else if (ts < -0.55) events.push(`${a.name} ↔ ${b.name}: 성격 특성 충돌로 스트레스가 상승했습니다.`)
    }
    if (chemistry > 0.35) reputation = clamp(reputation + 1.2 / 22, 0, 100)
    if (chemistry < -0.1) reputation = clamp(reputation - 0.8 / 22, 0, 100)

    const monthlyCrisisChance = clamp(0.16 + overload * 0.09 - reputation / 700, 0.05, 0.65)
    const crisisChance = 1 - Math.pow(1 - monthlyCrisisChance, 1 / 22)
    if (Math.random() < crisisChance) {
      if (Math.random() < clamp(fire.crisis / 110 + traitPerformanceMod(fire, 'fire'), 0.05, 0.95)) {
        reputation = clamp(reputation + 4, 0, 100)
        events.push(`긴급 광고주 이슈가 발생했지만 ${fire.name}이(가) 수습했습니다.`)
      } else {
        reputation = clamp(reputation - 9, 0, 100)
        cash -= 2500000
        events.push('광고주 이슈 대응 실패로 평판과 비용 손실이 발생했습니다.')
      }
    }
    if (overload > 0) {
      reputation = clamp(reputation - (overload * 2) / 22, 0, 100)
      events.push('수주량이 팀 처리 용량을 초과했습니다. 품질 저하 위험이 커졌습니다.')
    } else {
      reputation = clamp(reputation + 1.5 / 22, 0, 100)
    }
  }

  for (const se of dailySocialEvents(relations, workforce, weekend)) events.push('인간관계: ' + se)
  if (Math.random() < (weekend ? 0.55 : 0.34)) {
    const seasonal = seasonalSocialEvent(relations, workforce, season, weekend)
    if (seasonal) events.push('인간관계: ' + seasonal)
  }

  for (const me of protagonists) {
    const candidates = workforce.filter((p) => !(p.type === me.type && p.id === me.id))
    const interactedKeys: string[] = []
    if (!weekend) {
      const staffCount = candidates.length
      let targetCount = staffCount >= 2 ? 2 : 1
      if (staffCount >= 3 && Math.random() < 0.72) targetCount++
      if (staffCount >= 5 && Math.random() < 0.38) targetCount++
      targetCount = Math.min(targetCount, Math.max(1, staffCount))

      for (let i = 0; i < targetCount; i++) {
        const interaction = protagonistEmployeeInteraction(relations, me, candidates, currentDate, false, interactedKeys)
        if (interaction) {
          protagonistEvents.push('[주인공 상호작용] ' + interaction.text)
          const matched = candidates.find((emp) => interaction.text.includes('↔ ' + emp.name + ':'))
          if (matched) interactedKeys.push(`${matched.type}:${matched.id}`)
        }
      }
    } else if (Math.random() < 0.68) {
      const interaction = protagonistEmployeeInteraction(relations, me, candidates, currentDate, true, interactedKeys)
      if (interaction) protagonistEvents.push('[주인공 상호작용] ' + interaction.text)
    }

    const myEvent = protagonistDailyEvent(relations, me, candidates, currentDate, weekend)
    if (myEvent) protagonistEvents.push('[주인공 일상] ' + myEvent.text.replace(/^나의 하루:\s*/, ''))
  }

  const avgStress = workforce.length
    ? workforce.reduce((a, p) => a + (Number(p.stress) || 0), 0) / workforce.length
    : 100
  if (avgStress > 80) events.push('팀 평균 스트레스가 위험 구간입니다.')
  if (cash < 0) events.push('현금이 마이너스입니다. 자금경색 상태입니다.')
  if (!weekend && revenue >= 1500000) events.push('일 목표 매출을 달성했습니다.')
  if (isMonthEndDate(currentDate)) {
    const status = cash >= 0 ? '현금 흐름이 유지되고 있습니다.' : '현금 흐름이 적자 상태입니다.'
    events.push(`월말 정산: ${formatDate(currentDate)} 기준 광고주 ${clients}곳 · 평판 ${Math.round(reputation)}점 · ${status}`)
  }

  const dayProfit = revenue - payroll - overhead
  const resultEvents: AdvanceDayEvent[] = [
    { text: `${formatDate(currentDate)} · ${wName} · ${season} · ${weekend ? '휴식일' : '근무일'} · ${currentDay}일차`, type: 'summary', isProtagonist: false },
    {
      text: `신규 수주 ${wins}곳 · 처리 용량 ${capacity}곳 · 평균 스트레스 ${Math.round(avgStress)} · 일 손익 ${fmt(dayProfit)}`,
      type: 'summary',
      isProtagonist: false,
    },
    ...protagonistEvents.map((text) => ({ text, type: 'event' as const, isProtagonist: true })),
    ...events.map((text) => ({ text, type: 'event' as const, isProtagonist: false })),
  ]

  const teamEventResult = Math.random() < (weekend ? 0.28 : 0.52) ? teamEvent(relations, workforce, currentDate, weekend) : null
  if (teamEventResult) resultEvents.push({ text: teamEventResult.text, type: 'event', isProtagonist: false })

  const messengerScenes = generateDailyMessenger(relations, workforce, currentDate)

  const workforceStress: Record<string, number> = {}
  for (const p of workforce) workforceStress[p.id] = p.stress

  return {
    events: resultEvents,
    companyState: { cash, revenue, clients, reputation },
    workforceStress,
    messengerScenes,
  }
}
