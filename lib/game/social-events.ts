// 원본 legacy-reference/원본_V31.html 2019-2023행(pickTwo), 2034-2101행(timedSocialEvent,
// seasonalSocialEvent, dailySocialEvents)을 그대로 포팅. 문구·확률·가중치를 한 글자도 바꾸지 않음.
import { clamp } from './format'
import { mbtiCompatibility, traitPairScore, workStyleCompatibility } from './compatibility'
import { applySocialShift, relationshipScore, type RelationsMap } from './relations'
import type { WorkforceMember } from './types'

export function pickTwo(workforce: WorkforceMember[]): [WorkforceMember, WorkforceMember] | null {
  if (workforce.length < 2) return null
  const a = workforce[Math.floor(Math.random() * workforce.length)]
  let b = a
  while (b.type === a.type && b.id === a.id) {
    b = workforce[Math.floor(Math.random() * workforce.length)]
  }
  return [a, b]
}

type SocialShiftType = 'warm' | 'trust' | 'awkward' | 'conflict'

export function timedSocialEvent(
  map: RelationsMap,
  workforce: WorkforceMember[],
  slot: string,
  weekend = false
): string | null {
  const pair = pickTwo(workforce)
  if (!pair) return null
  const [a, b] = pair

  const rel = (relationshipScore(map, a, b) + relationshipScore(map, b, a)) / 2
  const compat = mbtiCompatibility(a.mbti, b.mbti) + workStyleCompatibility(a, b) * 0.3 + traitPairScore(a, b) * 0.7
  const positiveBias = clamp(0.48 + rel * 0.22 + compat * 0.12, 0.18, 0.82)
  const good = Math.random() < positiveBias

  const choicesGood: Record<string, [string, SocialShiftType][]> = {
    '출근 전': [
      [`${a.name}이(가) 출근 전에 ${b.name}에게 먼저 안부 메시지를 보냈습니다.`, 'warm'],
      [`${a.name}과(와) ${b.name}이(가) 오늘 일정에 대해 짧게 메시지를 주고받았습니다.`, 'trust'],
    ],
    '출근길': [
      [`${a.name}과(와) ${b.name}이(가) 우연히 출근길이 겹쳐 함께 걸으며 대화했습니다.`, 'warm'],
      [`${a.name}이(가) 출근길에 ${b.name}의 커피를 같이 사왔습니다.`, 'warm'],
    ],
    '점심시간': [
      [`${a.name}과(와) ${b.name}이(가) 점심을 같이 먹으며 사적인 이야기를 나눴습니다.`, 'warm'],
      [`${a.name}이(가) ${b.name}에게 개인적인 고민을 털어놓았습니다.`, 'trust'],
      [`${a.name}과(와) ${b.name}이(가) 점심 메뉴 취향이 비슷하다는 걸 발견했습니다.`, 'warm'],
    ],
    '퇴근길': [
      [`${a.name}과(와) ${b.name}이(가) 퇴근길에 함께 이동하며 하루 이야기를 나눴습니다.`, 'warm'],
      [`${a.name}이(가) 지친 ${b.name}의 이야기를 퇴근길에 들어줬습니다.`, 'trust'],
    ],
    '퇴근 후': [
      [`${a.name}과(와) ${b.name}이(가) 퇴근 후 저녁을 함께 먹었습니다.`, 'warm'],
      [`${a.name}과(와) ${b.name}이(가) 메신저로 취미 이야기를 하며 가까워졌습니다.`, 'warm'],
      [`${a.name}이(가) 퇴근 후 ${b.name}에게 고마웠던 일을 따로 이야기했습니다.`, 'trust'],
    ],
    '주말': [
      [`${a.name}과(와) ${b.name}이(가) 주말에 개인적으로 만나 식사했습니다.`, 'warm'],
      [`${a.name}과(와) ${b.name}이(가) 주말에 공통 취미 이야기를 길게 나눴습니다.`, 'warm'],
      [`${a.name}이(가) 주말에 힘들어하던 ${b.name}의 이야기를 들어줬습니다.`, 'trust'],
    ],
  }
  const choicesBad: Record<string, [string, SocialShiftType][]> = {
    '출근 전': [
      [`${a.name}의 이른 연락을 ${b.name}이(가) 부담스럽게 느꼈습니다.`, 'awkward'],
      [`${a.name}과(와) ${b.name}이(가) 출근 전 메시지의 표현을 다르게 받아들였습니다.`, 'conflict'],
    ],
    '출근길': [
      [`${a.name}과(와) ${b.name}이(가) 출근길에 마주쳤지만 어색한 침묵이 이어졌습니다.`, 'awkward'],
      [`${a.name}이(가) 출근길 대화 중 ${b.name}의 말을 오해했습니다.`, 'conflict'],
    ],
    '점심시간': [
      [`${a.name}이(가) 점심 자리에서 ${b.name}의 말투에 서운함을 느꼈습니다.`, 'awkward'],
      [`${a.name}과(와) ${b.name}이(가) 점심 중 사소한 의견 차이로 분위기가 식었습니다.`, 'conflict'],
    ],
    '퇴근길': [
      [`${a.name}과(와) ${b.name}이(가) 퇴근길에 업무 이야기를 이어가다 감정이 상했습니다.`, 'conflict'],
      [`${a.name}이(가) 퇴근길에 ${b.name}과 거리를 두려는 듯한 태도를 보였습니다.`, 'awkward'],
    ],
    '퇴근 후': [
      [`${a.name}이(가) 퇴근 후 ${b.name}의 뒷말을 전해 듣고 기분이 상했습니다.`, 'conflict'],
      [`${a.name}과(와) ${b.name} 사이에 퇴근 후 연락 빈도를 두고 미묘한 불편함이 생겼습니다.`, 'awkward'],
    ],
    '주말': [
      [`${a.name}이(가) 주말 단체 대화방에서 ${b.name}의 반응을 오해했습니다.`, 'awkward'],
      [`${a.name}과(와) ${b.name}이(가) 주말 약속 문제로 서로 조금 불편해졌습니다.`, 'conflict'],
    ],
  }

  const choices = good ? choicesGood : choicesBad
  const arr = choices[slot] || choices['점심시간']
  const [text, type] = arr[Math.floor(Math.random() * arr.length)]
  applySocialShift(map, a, b, type, weekend ? 1.2 : 1)
  if (type === 'warm') {
    a.stress = clamp(a.stress - 0.4, 0, 100)
    b.stress = clamp(b.stress - 0.4, 0, 100)
  }
  if (type === 'conflict' || type === 'awkward') {
    a.stress = clamp(a.stress + 0.6, 0, 100)
    b.stress = clamp(b.stress + 0.35, 0, 100)
  }
  return `[${slot}] ${text}`
}

export function dailySocialEvents(map: RelationsMap, workforce: WorkforceMember[], weekend: boolean): string[] {
  const events: string[] = []
  if (workforce.length < 2) return events
  if (weekend) {
    const count = Math.random() < 0.55 ? 1 : Math.random() < 0.2 ? 2 : 0
    for (let i = 0; i < count; i++) {
      const e = timedSocialEvent(map, workforce, '주말', true)
      if (e) events.push(e)
    }
    return events
  }
  const schedule: [string, number][] = [
    ['출근 전', 0.28], ['출근길', 0.34], ['점심시간', 0.58], ['퇴근길', 0.34], ['퇴근 후', 0.4],
  ]
  for (const [slot, chance] of schedule) {
    if (Math.random() < chance) {
      const e = timedSocialEvent(map, workforce, slot, false)
      if (e) events.push(e)
    }
  }
  return events
}

export function seasonalSocialEvent(
  map: RelationsMap,
  workforce: WorkforceMember[],
  season: string,
  weekend: boolean
): string | null {
  const pair = pickTwo(workforce)
  if (!pair) return null
  const [a, b] = pair
  const score = (relationshipScore(map, a, b) + relationshipScore(map, b, a)) / 2 + traitPairScore(a, b) * 0.35
  const good = score > -0.05 || Math.random() < 0.55

  const pool: Record<string, [string, SocialShiftType][]> = good
    ? {
        '봄': [
          [`${a.name}과(와) ${b.name}이(가) 점심시간에 벚꽃이 핀 길을 같이 걸었습니다.`, 'warm'],
          [`${a.name}과(와) ${b.name}이(가) 봄 날씨 이야기를 하다 주말 약속을 잡았습니다.`, 'trust'],
        ],
        '여름': [
          [`${a.name}이(가) 더위에 지친 ${b.name}에게 시원한 음료를 건넸습니다.`, 'warm'],
          [`${a.name}과(와) ${b.name}이(가) 여름 휴가 이야기를 하며 가까워졌습니다.`, 'trust'],
        ],
        '가을': [
          [`${a.name}과(와) ${b.name}이(가) 퇴근길 선선한 날씨에 한참 이야기를 나눴습니다.`, 'warm'],
          [`${a.name}과(와) ${b.name}이(가) 가을 축제와 여행 이야기를 나누며 공통 관심사를 발견했습니다.`, 'trust'],
        ],
        '겨울': [
          [`${a.name}이(가) 추운 출근길에 ${b.name}에게 따뜻한 음료를 챙겨줬습니다.`, 'warm'],
          [`${a.name}과(와) ${b.name}이(가) 연말 분위기 속에서 개인적인 이야기를 나눴습니다.`, 'trust'],
        ],
      }
    : {
        '봄': [[`${a.name}과(와) ${b.name}이(가) 봄맞이 회식 일정 문제로 사소하게 신경전을 벌였습니다.`, 'awkward']],
        '여름': [[`${a.name}과(와) ${b.name}이(가) 냉방 온도 문제로 은근한 갈등을 겪었습니다.`, 'conflict']],
        '가을': [[`${a.name}이(가) 바쁜 가을 업무 시즌에 ${b.name}의 무심한 반응을 서운하게 받아들였습니다.`, 'awkward']],
        '겨울': [[`${a.name}과(와) ${b.name}이(가) 연말 일정과 약속 문제로 약간 어색해졌습니다.`, 'conflict']],
      }

  const arr = pool[season] || []
  if (!arr.length) return null
  const [text, type] = arr[Math.floor(Math.random() * arr.length)]
  applySocialShift(map, a, b, type, weekend ? 1.15 : 1)
  return `[계절 · ${season}] ${text}`
}
