'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { advanceDay, type SalesMode, type OvertimeMode } from '@/lib/game/advance-day'
import { categorizeLog } from '@/lib/game/log-category'
import { addOneDay, isWeekendDate } from '@/lib/game/date'
import { relKey, type ActorType, type RelationsMap } from '@/lib/game/relations'
import type { WorkforceMember } from '@/lib/game/types'

function toWorkforceMember(type: ActorType, row: Record<string, unknown>): WorkforceMember {
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

function pickAssigned(
  workforce: WorkforceMember[],
  actorType: string | null,
  actorId: string | null,
  fallbackStat: 'skill' | 'sales' | 'crisis'
): WorkforceMember {
  if (actorType && actorId) {
    const found = workforce.find((w) => w.type === actorType && w.id === actorId)
    if (found) return found
  }
  return workforce.reduce((best, w) => (w[fallbackStat] > best[fallbackStat] ? w : best), workforce[0])
}

export async function advanceDayAction(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { data: cs } = await supabase.from('company_state').select('*').eq('id', 1).single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  // 동시성 가드: 오늘 이미 진행됐으면 조건부 업데이트가 0행 반환
  const { data: gated } = await supabase
    .from('company_state')
    .update({ last_advanced_date: cs.date })
    .eq('id', 1)
    .neq('last_advanced_date', cs.date)
    .select()
    .maybeSingle()
  if (!gated) return { ok: false, message: '오늘은 이미 진행되었습니다.' }

  const [{ data: profiles }, { data: npcs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('is_configured', true),
    supabase.from('npcs').select('*').eq('active', true),
  ])

  const workforce: WorkforceMember[] = [
    ...(profiles ?? []).map((p) => toWorkforceMember('profile', p)),
    ...(npcs ?? []).map((n) => toWorkforceMember('npc', n)),
  ]
  const protagonists = workforce.filter((w) => w.type === 'profile')
  if (workforce.length === 0) return { ok: false, message: '진행할 인력이 없습니다.' }

  const { data: relRows } = await supabase.from('relationships').select('*')
  const relations: RelationsMap = new Map(
    (relRows ?? []).map((r) => [
      relKey({ type: r.actor_type, id: r.actor_id }, { type: r.target_type, id: r.target_id }),
      { affection: r.affection, trust: r.trust, conflict: r.conflict, romantic: r.romantic },
    ])
  )

  const lead = pickAssigned(workforce, cs.lead_actor_type, cs.lead_actor_id, 'skill')
  const seller = pickAssigned(workforce, cs.seller_actor_type, cs.seller_actor_id, 'sales')
  const fire = pickAssigned(workforce, cs.fire_actor_type, cs.fire_actor_id, 'crisis')

  const result = advanceDay({
    currentDay: cs.day,
    currentDate: cs.date,
    companyState: { cash: cs.cash, revenue: cs.revenue, clients: cs.clients, reputation: cs.reputation },
    salesMode: cs.sales_mode as SalesMode,
    overtimeMode: cs.overtime_mode as OvertimeMode,
    workforce,
    protagonists,
    lead,
    seller,
    fire,
    relations,
  })

  const nextDate = addOneDay(cs.date)
  const weekend = isWeekendDate(cs.date)

  const profileStressUpdates = workforce
    .filter((w) => w.type === 'profile')
    .map((w) => supabase.from('profiles').update({ stress: result.workforceStress[w.id] }).eq('id', w.id))
  const npcStressUpdates = workforce
    .filter((w) => w.type === 'npc')
    .map((w) => supabase.from('npcs').update({ stress: result.workforceStress[w.id] }).eq('id', Number(w.id)))

  const relationshipRows = Array.from(relations.entries()).map(([key, entry]) => {
    const [actor, target] = key.split('>')
    const [actorType, actorId] = actor.split(':')
    const [targetType, targetId] = target.split(':')
    return {
      actor_type: actorType,
      actor_id: actorId,
      target_type: targetType,
      target_id: targetId,
      affection: entry.affection,
      trust: entry.trust,
      conflict: entry.conflict,
      romantic: entry.romantic,
    }
  })

  const dailyEventRows = result.events.map((e) => ({
    day: cs.day,
    date: cs.date,
    text: e.text,
    type: e.type,
    category: categorizeLog(e.text, weekend),
    is_protagonist: e.isProtagonist,
  }))

  const messengerLogRows = result.messengerScenes.map((s) => ({
    date: s.date,
    scene_type: s.sceneType,
    scene_title: s.scene,
    team: s.team ?? null,
    participant_refs: s.participants,
    lines: s.lines,
    forced: s.forced,
  }))

  await Promise.all([
    ...profileStressUpdates,
    ...npcStressUpdates,
    relationshipRows.length
      ? supabase.from('relationships').upsert(relationshipRows, { onConflict: 'actor_type,actor_id,target_type,target_id' })
      : Promise.resolve(),
    dailyEventRows.length ? supabase.from('daily_events').insert(dailyEventRows) : Promise.resolve(),
    messengerLogRows.length ? supabase.from('messenger_logs').insert(messengerLogRows) : Promise.resolve(),
  ])

  const { error: companyStateError } = await supabase
    .from('company_state')
    .update({
      day: cs.day + 1,
      date: nextDate,
      cash: result.companyState.cash,
      revenue: result.companyState.revenue,
      clients: result.companyState.clients,
      reputation: result.companyState.reputation,
    })
    .eq('id', 1)
  if (companyStateError) return { ok: false, message: '회사 상태 반영에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '하루가 진행되었습니다.' }
}
