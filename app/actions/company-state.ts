'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActorType } from '@/lib/game/relations'

type AssignmentRole = 'lead' | 'seller' | 'fire'

const ROLE_COLUMNS: Record<AssignmentRole, { type: string; id: string }> = {
  lead: { type: 'lead_actor_type', id: 'lead_actor_id' },
  seller: { type: 'seller_actor_type', id: 'seller_actor_id' },
  fire: { type: 'fire_actor_type', id: 'fire_actor_id' },
}

export async function assignRole(
  role: AssignmentRole,
  actorType: ActorType,
  actorId: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const columns = ROLE_COLUMNS[role]
  const { error } = await supabase
    .from('company_state')
    .update({ [columns.type]: actorType, [columns.id]: actorId })
    .eq('id', 1)
  if (error) return { ok: false, message: '담당자 배정에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '담당자가 배정되었습니다.' }
}
