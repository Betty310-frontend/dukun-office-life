'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { advanceDay, type SalesMode, type OvertimeMode } from '@/lib/game/advance-day'
import { categorizeLog } from '@/lib/game/log-category'
import { addOneDay, isWeekendDate } from '@/lib/game/date'
import { relKey, type RelationsMap } from '@/lib/game/relations'
import { toWorkforceMember } from '@/lib/game/workforce'
import type { WorkforceMember } from '@/lib/game/types'

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
  // last_advanced_date는 초기값이 NULL이라 .neq()만 쓰면 SQL의 `NULL <> x`가 항상 UNKNOWN이 되어
  // 최초 1회는 절대 게이트를 통과하지 못한다 — is.null 분기를 함께 걸어야 한다.
  const { data: gated } = await supabase
    .from('company_state')
    .update({ last_advanced_date: cs.date })
    .eq('id', 1)
    .or(`last_advanced_date.is.null,last_advanced_date.neq.${cs.date}`)
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

  // stress도 profiles/npcs에서 int 컬럼이라 advanceDay가 계산한 소수를 반올림해서 넣어야 한다.
  const profileStressUpdates = workforce
    .filter((w) => w.type === 'profile')
    .map((w) => supabase.from('profiles').update({ stress: Math.round(result.workforceStress[w.id]) }).eq('id', w.id))
  const npcStressUpdates = workforce
    .filter((w) => w.type === 'npc')
    .map((w) => supabase.from('npcs').update({ stress: Math.round(result.workforceStress[w.id]) }).eq('id', Number(w.id)))

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

  const writeResults = await Promise.all([
    ...profileStressUpdates,
    ...npcStressUpdates,
    relationshipRows.length
      ? supabase.from('relationships').upsert(relationshipRows, { onConflict: 'actor_type,actor_id,target_type,target_id' })
      : Promise.resolve({ error: null }),
    dailyEventRows.length ? supabase.from('daily_events').insert(dailyEventRows) : Promise.resolve({ error: null }),
    messengerLogRows.length ? supabase.from('messenger_logs').insert(messengerLogRows) : Promise.resolve({ error: null }),
  ])
  const failedWrite = writeResults.find((r) => r.error)
  if (failedWrite) {
    console.error('[advanceDayAction] partial write failed:', failedWrite.error?.message)
    // 이 시점엔 위 동시성 가드가 이미 last_advanced_date를 오늘 날짜로 찍어둔 상태라, 되돌리지
    // 않으면 day/date는 그대로인데 재시도 자체가 "오늘은 이미 진행되었습니다"로 영구히 막힌다.
    await supabase.from('company_state').update({ last_advanced_date: null }).eq('id', 1)
    return { ok: false, message: '하루 진행 중 일부 데이터 저장에 실패했습니다. 다시 시도해주세요.' }
  }

  // cash/revenue는 DB에서 bigint 컬럼이라 advanceDay가 계산한 소수(예: 22로 나눈 값)를 그대로 넣으면
  // "invalid input syntax for type bigint" 에러가 난다 — 원본도 표시 시점(fmt)에만 반올림했을 뿐 내부
  // 계산은 부동소수점이었으므로, 시뮬레이션 공식은 그대로 두고 DB에 쓰는 시점에만 반올림한다.
  const { error: companyStateError } = await supabase
    .from('company_state')
    .update({
      day: cs.day + 1,
      date: nextDate,
      cash: Math.round(result.companyState.cash),
      revenue: Math.round(result.companyState.revenue),
      clients: Math.round(result.companyState.clients),
      reputation: result.companyState.reputation,
    })
    .eq('id', 1)
  if (companyStateError) {
    console.error('[advanceDayAction] company_state update failed:', companyStateError.message)
    return { ok: false, message: '회사 상태 반영에 실패했습니다.' }
  }

  revalidatePath('/')
  return { ok: true, message: '하루가 진행되었습니다.' }
}
