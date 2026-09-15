'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActorType } from '@/lib/game/relations'
import type { SalesMode, OvertimeMode } from '@/lib/game/advance-day'

type AssignmentRole = 'lead' | 'seller' | 'fire'

const ROLE_COLUMNS: Record<AssignmentRole, { type: string; id: string }> = {
  lead: { type: 'lead_actor_type', id: 'lead_actor_id' },
  seller: { type: 'seller_actor_type', id: 'seller_actor_id' },
  fire: { type: 'fire_actor_type', id: 'fire_actor_id' },
}

export async function assignRoles(
  assignments: Partial<Record<AssignmentRole, { type: ActorType; id: string }>>
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const patch: Record<string, string> = {}
  for (const role of Object.keys(assignments) as AssignmentRole[]) {
    const actor = assignments[role]
    if (!actor) continue
    const columns = ROLE_COLUMNS[role]
    patch[columns.type] = actor.type
    patch[columns.id] = actor.id
  }
  if (Object.keys(patch).length === 0) return { ok: true, message: '변경된 담당자가 없어요.' }

  const { error } = await supabase.from('company_state').update(patch).eq('id', 1)
  if (error) return { ok: false, message: '담당자 배정에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '담당자가 배정되었습니다.' }
}

export async function setSalesMode(mode: SalesMode): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { error } = await supabase.from('company_state').update({ sales_mode: mode }).eq('id', 1)
  if (error) return { ok: false, message: '수주 강도 변경에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '수주 강도가 변경되었습니다.' }
}

export async function setOvertimeMode(mode: OvertimeMode): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { error } = await supabase.from('company_state').update({ overtime_mode: mode }).eq('id', 1)
  if (error) return { ok: false, message: '야근 정책 변경에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '야근 정책이 변경되었습니다.' }
}
