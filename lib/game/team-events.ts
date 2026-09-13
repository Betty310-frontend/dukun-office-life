// 원본 legacy-reference/원본_V31.html 2474-2532행을 그대로 포팅.
// 원본은 teamEvent 내부에서 addLogEvent(text,'event')를 직접 호출해 전역 currentDayEvents에 쌓았지만,
// 이 포팅에서는 순수하게 결과 객체만 반환한다 — 호출부(Task 6 advanceDay)가 이벤트 배열에 직접 push한다.
import { pick } from './format'
import { isFridayDate, seasonName } from './date'
import { applyTeamShift, type RelationsMap, type ActorRef } from './relations'
import { TEAMS } from '@/lib/validation/profile'
import type { WorkforceMember } from './types'

export function teamMembers(workforce: WorkforceMember[], team: string): WorkforceMember[] {
  return workforce.filter((p) => (p.team || '기획1팀') === team)
}

export function pickTeamWithAtLeast(workforce: WorkforceMember[], n = 2): string | null {
  const candidates = TEAMS.filter((t) => teamMembers(workforce, t).length >= n)
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export interface TeamEventResult {
  team: string
  members: WorkforceMember[]
  text: string
  positive: boolean
}

export function teamEvent(map: RelationsMap, workforce: WorkforceMember[], dateStr: string, weekend = false): TeamEventResult | null {
  const team = pickTeamWithAtLeast(workforce, 2)
  if (!team) return null
  const members = teamMembers(workforce, team)
  const names = members.map((p) => p.name)
  const season = seasonName(dateStr)
  const isFri = isFridayDate(dateStr)
  const positive = Math.random() < 0.78

  let text: string
  if (weekend) {
    text = pick([
      `[팀 이벤트] ${team} 단체 채팅방에서 주말 맛집 이야기가 시작되어 ${names.slice(0, 4).join(', ')} 등이 한참 대화를 나눴다.`,
      `[팀 이벤트] ${team} 직원들이 다음 주 일정 이야기를 하다가 자연스럽게 근황 토크로 이어졌다.`,
      `[팀 이벤트] ${team} 몇 명이 자발적으로 주말 카페 약속을 잡았다.`,
    ])
  } else if (isFri && Math.random() < 0.55) {
    text = pick([
      `[팀 회식] ${team}끼리 퇴근 후 가볍게 회식을 했다. ${names.slice(0, 5).join(', ')} 등이 참여했고 분위기는 ${positive ? '무난하게 좋아졌다' : '조금 어색한 순간도 있었다'}.`,
      `[팀 회식] ${team}가 금요일 저녁 번개 회식을 잡았다. 업무 얘기보다 사적인 대화가 많았다.`,
      `[팀 회식] ${team} 회식 자리에서 최근 업무 고충과 웃긴 실수가 화제가 되었다.`,
    ])
  } else {
    text = pick([
      `[팀 점심] ${team} 직원들이 함께 점심을 먹으며 최근 광고주 이슈를 가볍게 공유했다.`,
      `[팀 회의] ${team} 내부 회의에서 업무 분담을 다시 조정했다.`,
      `[팀 이벤트] ${team}가 오후 간식 타임을 가졌다. 짧은 잡담 덕분에 분위기가 조금 풀렸다.`,
      `[팀 협업] ${team} 내에서 급한 요청을 서로 나눠 처리하며 협업이 자연스럽게 이어졌다.`,
      `[팀 잡담] ${team} 단체 메신저에서 ${season} 얘기로 한동안 업무 외 대화가 이어졌다.`,
    ])
  }

  const memberRefs: ActorRef[] = members.map((m) => ({ type: m.type, id: m.id }))
  applyTeamShift(map, memberRefs, positive ? 'positive' : 'negative')
  return { team, members, text, positive }
}
