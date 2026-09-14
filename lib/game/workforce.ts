import type { ActorType } from './relations'
import type { WorkforceMember } from './types'

export function toWorkforceMember(type: ActorType, row: Record<string, unknown>): WorkforceMember {
  return {
    type,
    id: String(row.id),
    name: row.name as string,
    team: row.team as string,
    rank: row.rank as string,
    role: row.role as string,
    gender: row.gender as string,
    mbti: row.mbti as string,
    workStyle: row.work_style as string,
    traits: (row.traits as string[]) ?? [],
    prefTraits: (row.pref_traits as string[]) ?? [],
    skill: row.skill as number,
    sales: row.sales as number,
    crisis: row.crisis as number,
    stress: row.stress as number,
  }
}
