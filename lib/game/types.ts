import type { RelatablePerson } from './relations'

// 하루 진행 한 번의 실행 동안 함께 넘겨다니며 직접 mutate되는 인력 스냅샷.
// 원본이 전역 people/protagonist 객체를 직접 mutate하던 것과 동일한 방식 —
// advanceDay가 DB에서 읽어온 스냅샷을 만들어 넘기고, 실행이 끝나면 최종 값을 다시 DB에 반영한다.
export interface WorkforceMember extends RelatablePerson {
  name: string
  team: string
  rank: string
  role: string
  skill: number
  sales: number
  crisis: number
  stress: number
}
