// 원본 legacy-reference/원본_V31.html 1524-1732행을 그대로 포팅.
// 원본은 전역 단일 protagonist를 대상으로 했지만, 이 프로젝트는 내정보를 저장한 실유저 각각에 대해
// 이 로직을 1회씩 돌린다 (호출부는 Task 6 advanceDay) — Global Constraints 참고.
// protagonistMemories.unshift(...)는 "대화하기"(별도 플랜) 범위이므로 여기서는 저장하지 않고
// 결과의 `memory` 필드로만 얹어 넘긴다.
import { clamp, pick } from './format'
import { hasTrait, mbtiCompatibility, traitPairScore } from './compatibility'
import { ensureRelation, isOppositeGender, type ActorRef, type RelationsMap } from './relations'
import type { WorkforceMember } from './types'

export interface ProtagonistEventResult {
  text: string
  memory?: { target: ActorRef; date: string; topic: string; text: string }
}

const ROLE_SYNERGY_PAIRS: [string, string][] = [
  ['AE', '디자인'], ['AE', '퍼포먼스 마케팅'], ['AM', 'AE'],
  ['전략기획팀', 'AE'], ['전략기획팀', '퍼포먼스 마케팅'],
  ['디자인', '웹페이지 코딩·제작'], ['퍼포먼스 마케팅', '웹페이지 코딩·제작'],
  ['회계담당', '결재담당'], ['인사담당', '결재담당'],
]

export function protagonistRoleSynergy(me: { role: string }, emp: { role: string }): number {
  const myRole = me.role || 'AE'
  const er = emp.role || 'AE'
  return ROLE_SYNERGY_PAIRS.some(([a, b]) => (myRole === a && er === b) || (myRole === b && er === a)) ? 0.45 : 0
}

export function protagonistInteractionScore(map: RelationsMap, me: WorkforceMember, emp: WorkforceMember): number {
  const sameTeam = me.team && emp.team && me.team === emp.team ? 0.55 : 0
  const trait = traitPairScore(me, emp)
  const mbti = mbtiCompatibility(me.mbti, emp.mbti)
  const rel = ensureRelation(map, me, emp)
  const relation = (rel.affection - 50 + (rel.trust - 50) - (rel.conflict - 10) * 0.6) / 100
  const role = protagonistRoleSynergy(me, emp)
  return sameTeam + trait * 0.8 + mbti * 0.35 + relation * 0.55 + role
}

export function pickProtagonistInteractionPerson(
  map: RelationsMap,
  me: WorkforceMember,
  candidates: WorkforceMember[],
  excludeKeys: string[] = []
): WorkforceMember | null {
  const excluded = new Set(excludeKeys)
  let pool = candidates.filter((p) => !excluded.has(`${p.type}:${p.id}`))
  if (!pool.length) pool = candidates
  if (!pool.length) return null

  const weighted = pool.map((emp) => {
    const sameTeam = me.team === emp.team ? 2.8 : 1
    const relation = ensureRelation(map, me, emp)
    const familiarity = 1 + Math.max(0, (relation.affection + relation.trust - 100) / 90)
    const sameRole = me.role && emp.role && me.role === emp.role ? 1.15 : 1
    return { emp, w: Math.max(0.25, sameTeam * familiarity * sameRole) }
  })
  const total = weighted.reduce((s, x) => s + x.w, 0)
  let r = Math.random() * total
  for (const x of weighted) {
    r -= x.w
    if (r <= 0) return x.emp
  }
  return weighted[weighted.length - 1].emp
}

export function workInteractionText(me: WorkforceMember, emp: WorkforceMember, positive: boolean): string {
  const meName = me.name
  const myRole = me.role || 'AE'
  const er = emp.role || 'AE'
  const sameTeam = me.team === emp.team
  const pairKey = [myRole, er].sort().join('|')

  const special: Record<string, string> = {
    'AE|디자인': positive
      ? pick([
          `${meName}이(가) 광고주 피드백을 정리해 ${emp.name}에게 전달했다. ${emp.name}이(가) 바로 수정 포인트를 잡아 주면서 소재 작업이 빠르게 이어졌다.`,
          `${meName}과(와) ${emp.name}이(가) 신규 소재 방향을 같이 확인했다. 카피와 비주얼 우선순위를 맞추면서 수정 횟수를 줄였다.`,
        ])
      : pick([
          `${meName}이(가) 전달한 광고주 수정 요청과 ${emp.name}의 디자인 해석이 엇갈렸다. 둘은 레퍼런스와 우선순위를 다시 맞췄다.`,
          `${meName}과(와) ${emp.name}이(가) 촉박한 소재 수정 일정 때문에 잠시 의견이 부딪혔다. 최종 마감 기준부터 다시 정리했다.`,
        ]),
    'AE|퍼포먼스 마케팅': positive
      ? pick([
          `${meName}과(와) ${emp.name}이(가) 전환수와 CPC 변화를 같이 확인했다. 성과가 떨어진 구간을 정리해 다음 최적화 액션을 정했다.`,
          `${emp.name}이(가) 캠페인 수치를 공유하자 ${meName}이(가) 광고주 피드백과 연결해 원인을 정리했다. 둘은 보고 방향을 빠르게 맞췄다.`,
          `${meName}과(와) ${emp.name}이(가) 예산 소진 속도와 소재별 CTR을 함께 봤다. 성과가 좋은 세트에 예산을 조금 더 배분하기로 했다.`,
        ])
      : pick([
          `${meName}과(와) ${emp.name}이(가) 성과 하락 원인을 서로 다르게 봤다. 랜딩 문제인지 타깃 문제인지 데이터를 더 확인하기로 했다.`,
          `${meName}이(가) 빠른 예산 조정을 제안했지만 ${emp.name}은(는) 데이터가 더 필요하다고 봤다. 둘은 테스트 기간을 다시 합의했다.`,
        ]),
    '디자인|웹페이지 코딩·제작': positive
      ? `${meName}과(와) ${emp.name}이(가) 시안과 실제 랜딩 화면을 함께 비교했다. 모바일에서 어색한 부분을 바로 잡아 구현 방향을 맞췄다.`
      : `${meName}과(와) ${emp.name} 사이에서 시안 의도와 구현 범위를 두고 의견이 엇갈렸다. 우선 수정할 항목부터 다시 정했다.`,
    '웹페이지 코딩·제작|퍼포먼스 마케팅': positive
      ? `${meName}과(와) ${emp.name}이(가) 전환 데이터를 보며 랜딩 이탈 구간을 확인했다. CTA와 문의 폼을 먼저 개선하기로 했다.`
      : `${meName}과(와) ${emp.name}이(가) 랜딩 수정 우선순위를 두고 의견이 갈렸다. 전환 데이터 기준으로 다시 순서를 정했다.`,
    'AE|AM': positive
      ? pick([
          `${meName}과(와) ${emp.name}이(가) 광고주 요청사항을 함께 정리했다. 외부 커뮤니케이션과 내부 실행 역할이 자연스럽게 나뉘었다.`,
          `${emp.name}이(가) 광고주의 우려를 공유하자 ${meName}이(가) 실행 가능한 개선안을 정리했다. 둘은 답변 내용을 맞춰서 전달했다.`,
        ])
      : `${meName}과(와) ${emp.name} 사이에서 광고주 요청의 우선순위를 두고 의견이 엇갈렸다. 어떤 내용을 먼저 처리할지 다시 정리했다.`,
  }
  if (special[pairKey]) return special[pairKey]

  const positiveSameTeam = [
    `${meName}과(와) 같은 ${me.team}의 ${emp.name}이(가) 오전 업무 우선순위를 같이 확인했다. 서로 맡은 부분을 정리하니 일정이 한결 명확해졌다.`,
    `${emp.name}이(가) 처리 중인 업무를 ${meName}에게 공유했다. ${meName}이(가) 빠진 부분을 보완해주면서 일이 매끄럽게 이어졌다.`,
    `${meName}과(와) ${emp.name}이(가) 광고주 요청 건을 같이 검토했다. 필요한 수정만 추려서 각자 나눠 처리하기로 했다.`,
    `${meName}이(가) 바쁜 ${emp.name}의 업무 일부를 나눠 맡았다. ${emp.name}은(는) 덕분에 마감 시간을 맞출 수 있었다.`,
    `${meName}과(와) ${emp.name}이(가) 오늘 처리한 업무를 서로 확인했다. 작은 실수를 바로 잡으면서 최종 전달을 마쳤다.`,
  ]
  const negativeSameTeam = [
    `${meName}과(와) 같은 ${me.team}의 ${emp.name}이(가) 업무 방식 차이로 잠시 부딪혔다. 일정과 역할을 다시 정리했다.`,
    `${meName}과(와) ${emp.name} 사이에서 업무 공유 시점이 어긋났다. 이미 처리한 내용을 다시 확인하느라 시간이 조금 더 들었다.`,
    `${meName}이(가) 빠른 처리를 원했지만 ${emp.name}은(는) 검수를 더 해야 한다고 봤다. 둘은 마감 기준을 다시 맞췄다.`,
  ]
  const positiveOther = [
    `${meName}이(가) ${emp.team}의 ${emp.name}에게 업무 협조를 요청했다. 필요한 자료를 빠르게 주고받아 요청 건을 바로 마무리했다.`,
    `${emp.name}이(가) ${meName}에게 다른 팀 업무와 연결되는 부분을 확인해달라고 요청했다. 둘은 짧게 논의하고 바로 방향을 정했다.`,
    `${meName}과(와) ${emp.name}이(가) 서로 다른 팀의 진행 상황을 공유했다. 선행 작업을 미리 맞추면서 일정 충돌을 피했다.`,
  ]
  const negativeOther = [
    `${meName}이(가) ${emp.name}과 협업하는 과정에서 전달 방식이 엇갈려 확인 작업이 한 번 더 필요했다.`,
    `${meName}과(와) ${emp.name} 사이에서 필요한 자료의 기준이 달라 재요청이 발생했다. 둘은 항목을 다시 정리해 공유했다.`,
  ]

  return pick(sameTeam ? (positive ? positiveSameTeam : negativeSameTeam) : positive ? positiveOther : negativeOther)
}

export function socialInteractionText(map: RelationsMap, me: WorkforceMember, emp: WorkforceMember, positive: boolean): string {
  const meName = me.name
  const rel = ensureRelation(map, me, emp)
  const stress = Number(emp.stress) || 0

  if (positive) {
    if (rel.affection >= 75 || rel.trust >= 75) {
      return pick([
        `${emp.name}이(가) 먼저 ${meName}의 자리로 와 잠깐 말을 걸었다. 둘은 업무 얘기에서 시작해 점심 메뉴와 주말 이야기까지 자연스럽게 이어갔다.`,
        `점심시간에 ${meName}과(와) ${emp.name}이(가) 함께 앉았다. 광고주 이야기를 하다가 어느새 회사 밖의 소소한 얘기까지 나눴다.`,
        `퇴근 직전 ${emp.name}이(가) ${meName}에게 오늘 고생했다고 말을 건넸다. 둘은 엘리베이터를 기다리며 하루를 가볍게 정리했다.`,
        `${meName}이(가) 커피를 사러 나가자 ${emp.name}이(가) 같이 따라나섰다. 짧은 시간이었지만 편하게 사적인 이야기를 나눴다.`,
      ])
    }
    if (stress >= 70) {
      return pick([
        `${meName}이(가) 지쳐 보이는 ${emp.name}에게 괜찮냐고 물었다. ${emp.name}은(는) 요즘 광고주 대응이 조금 버겁다고 털어놨다.`,
        `${emp.name}이(가) 잠깐 쉬면서 ${meName}에게 최근 업무가 많이 몰렸다고 말했다. ${meName}은(는) 필요한 일이 있으면 나눠달라고 했다.`,
      ])
    }
    if (hasTrait(me, '친화적') || hasTrait(emp, '친화적')) {
      return pick([
        `${meName}과(와) ${emp.name}이(가) 탕비실에서 마주쳐 가볍게 농담을 주고받았다. 이전보다 대화가 편해졌다.`,
        `${emp.name}이(가) ${meName}에게 점심 메뉴를 먼저 물었다. 둘은 근처 식당 이야기를 하며 잠깐 웃었다.`,
        `${meName}과(와) ${emp.name}이(가) 커피를 기다리며 주말 계획을 이야기했다. 짧은 잡담이었지만 분위기가 한결 편해졌다.`,
      ])
    }
    return pick([
      `${meName}과(와) ${emp.name}이(가) 점심시간에 잠깐 함께 앉아 오늘 업무 이야기를 나눴다.`,
      `${emp.name}이(가) ${meName}에게 오늘 많이 바쁘냐고 물었다. 둘은 잠깐 서로의 업무 상황을 공유했다.`,
      `${meName}과(와) ${emp.name}이(가) 퇴근 시간을 기다리며 가볍게 오늘 하루 이야기를 나눴다.`,
    ])
  }
  return pick([
    `${meName}과(와) ${emp.name}이(가) 짧게 대화를 나눴지만 서로 컨디션이 좋지 않아 분위기가 다소 딱딱했다.`,
    `${meName}이(가) ${emp.name}에게 말을 걸었지만 ${emp.name}은(는) 마감 때문에 여유가 없었다. 둘은 필요한 얘기만 짧게 나눴다.`,
    `${meName}과(와) ${emp.name}이(가) 업무 중 잠깐 의견을 주고받았지만 서로 피곤해 대화가 조금 건조하게 끝났다.`,
  ])
}

export function protagonistEmployeeInteraction(
  map: RelationsMap,
  me: WorkforceMember,
  candidates: WorkforceMember[],
  dateStr: string,
  weekend = false,
  excludeKeys: string[] = []
): ProtagonistEventResult | null {
  const emp = pickProtagonistInteractionPerson(map, me, candidates, excludeKeys)
  if (!emp) return null

  const rel = ensureRelation(map, me, emp)
  const score = protagonistInteractionScore(map, me, emp)
  const stressFactor = ((Number(me.stress) || 0) + (Number(emp.stress) || 0)) / 200
  const positiveChance = clamp(0.58 + score * 0.16 - stressFactor * 0.16, 0.18, 0.9)
  const positive = Math.random() < positiveChance

  let text: string
  if (weekend) {
    text = positive
      ? `${me.name}과(와) ${emp.name}이(가) 쉬는 날 가볍게 안부를 주고받았다. 회사 밖 이야기까지 조금 이어졌다.`
      : `${me.name}과(와) ${emp.name}이(가) 짧게 연락했지만 서로 바빠 대화는 금방 끝났다.`
  } else {
    text = Math.random() < 0.72 ? workInteractionText(me, emp, positive) : socialInteractionText(map, me, emp, positive)
  }

  if (positive) {
    const sameTeam = me.team === emp.team
    rel.affection = clamp(rel.affection + (sameTeam ? 2 : 1) + (score > 0.7 ? 1 : 0), 0, 100)
    rel.trust = clamp(rel.trust + 2 + (score > 0.8 ? 1 : 0), 0, 100)
    rel.conflict = clamp(rel.conflict - 1, 0, 100)
    me.stress = clamp((Number(me.stress) || 0) - 1, 0, 100)
    emp.stress = clamp((Number(emp.stress) || 0) - 0.5, 0, 100)
  } else {
    rel.trust = clamp(rel.trust - 1, 0, 100)
    rel.conflict = clamp(rel.conflict + 2, 0, 100)
    me.stress = clamp((Number(me.stress) || 0) + 1.5, 0, 100)
    emp.stress = clamp((Number(emp.stress) || 0) + 1, 0, 100)
  }

  const prefs = me.prefTraits || []
  const hits = prefs.filter((t) => (emp.traits || []).includes(t)).length
  if (positive && hits > 0) {
    rel.affection = clamp(rel.affection + Math.min(2, hits), 0, 100)
    if (isOppositeGender(me, emp)) rel.romantic = clamp(rel.romantic + 1, 0, 100)
  }

  const result: ProtagonistEventResult = { text: `나 ↔ ${emp.name}: ${text}` }
  if (positive && rel.affection >= 70 && Math.random() < 0.22) {
    result.memory = { target: { type: emp.type, id: emp.id }, date: dateStr, topic: 'dailyInteraction', text }
  }
  return result
}

export function protagonistDailyEvent(
  map: RelationsMap,
  me: WorkforceMember,
  candidates: WorkforceMember[],
  dateStr: string,
  weekend = false
): ProtagonistEventResult | null {
  if (!candidates.length) return null
  const chance = weekend ? 0.42 : 0.72
  if (Math.random() > chance) return null

  const p = candidates[Math.floor(Math.random() * candidates.length)]
  const r = ensureRelation(map, me, p)
  const n = me.name
  const high = r.affection >= 68 || r.trust >= 70
  const low = r.affection < 38 || r.trust < 38

  let pool: string[]
  if (weekend) {
    pool = high
      ? [
          `${n}은 우연히 ${p.name}과 회사 근처에서 마주쳐 한동안 함께 걸었다.`,
          `쉬는 날, ${p.name}이 ${n}에게 먼저 가벼운 메시지를 보냈다.`,
          `${n}과 ${p.name}은 업무와 상관없는 이야기를 나누며 평소보다 편하게 웃었다.`,
        ]
      : [
          `${n}은 쉬는 날 ${p.name}과 짧게 안부를 주고받았다.`,
          `우연히 ${p.name}과 마주친 ${n}은 가볍게 인사를 나눴다.`,
        ]
  } else if (low) {
    pool = [
      `${n}이 ${p.name}에게 업무 관련 질문을 건넸지만 아직 대화는 조금 어색했다.`,
      `${p.name}과 ${n}은 복도에서 마주쳐 짧게 인사만 나눴다.`,
      `${n}이 ${p.name}의 업무를 잠깐 도왔고, ${p.name}은 조심스럽게 고맙다고 말했다.`,
    ]
  } else if (high) {
    pool = [
      `${p.name}이 ${n}의 자리로 와 먼저 말을 걸었다. 둘은 한동안 사소한 이야기를 나눴다.`,
      `${n}과 ${p.name}은 점심을 함께 먹으며 회사 밖 이야기까지 자연스럽게 이어갔다.`,
      `퇴근 무렵 ${p.name}이 ${n}을 기다렸다. 둘은 같은 방향으로 걸으며 하루 이야기를 나눴다.`,
      `${n}이 바쁜 ${p.name}의 일을 도와주자 ${p.name}이 유난히 반가운 표정을 보였다.`,
    ]
  } else {
    pool = [
      `${n}과 ${p.name}은 탕비실에서 커피를 마시며 잠깐 이야기를 나눴다.`,
      `${p.name}이 ${n}에게 점심 메뉴를 물어보며 자연스럽게 대화를 시작했다.`,
      `${n}과 ${p.name}은 업무를 함께 확인하며 조금 더 익숙하게 말을 주고받았다.`,
      `${n}은 퇴근 직전 ${p.name}과 엘리베이터를 기다리며 오늘 있었던 일을 이야기했다.`,
    ]
  }

  const text = pick(pool)
  const aff = high ? 2 : 1
  const trust = low ? 2 : 1
  r.affection = clamp(r.affection + aff, 0, 100)
  r.trust = clamp(r.trust + trust, 0, 100)

  const result: ProtagonistEventResult = { text: `나의 하루: ${text}` }
  if (high && Math.random() < 0.28) {
    result.memory = { target: { type: p.type, id: p.id }, date: dateStr, topic: 'daily', text }
  }
  return result
}
