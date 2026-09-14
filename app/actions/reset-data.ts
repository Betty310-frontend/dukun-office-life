'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// supabase/seed.sql의 NPC 시드 stress 리터럴 값 — resetSimulationAction이 복원할 기본값.
const NPC_SEED_STRESS: Record<number, number> = { 1: 28, 2: 34, 3: 22 }

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export async function resetSimulationAction(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const [dailyEventsResult, messengerLogsResult, relationshipsResult, npcStressResults, companyStateResult] =
    await Promise.all([
      supabase.from('daily_events').delete().neq('id', NIL_UUID),
      supabase.from('messenger_logs').delete().neq('id', NIL_UUID),
      supabase.from('relationships').delete().neq('id', NIL_UUID),
      Promise.all(
        Object.entries(NPC_SEED_STRESS).map(([id, stress]) =>
          supabase.from('npcs').update({ stress }).eq('id', Number(id))
        )
      ),
      supabase
        .from('company_state')
        .update({
          day: 1,
          date: '2026-09-10',
          cash: 30000000,
          revenue: 0,
          clients: 0,
          reputation: 50,
          sales_mode: 'balanced',
          overtime_mode: 'normal',
          lead_actor_type: null,
          lead_actor_id: null,
          seller_actor_type: null,
          seller_actor_id: null,
          fire_actor_type: null,
          fire_actor_id: null,
          last_advanced_date: null,
          last_manual_chat_day: -999,
        })
        .eq('id', 1),
    ])

  const failed = [dailyEventsResult, messengerLogsResult, relationshipsResult, companyStateResult, ...npcStressResults].find(
    (r) => r.error
  )
  if (failed) {
    console.error('[resetSimulationAction] reset failed:', failed.error?.message)
    return { ok: false, message: '초기화에 실패했습니다. 다시 시도해주세요.' }
  }

  revalidatePath('/')
  return { ok: true, message: '일일 로그, 메신저 대화, 인간관계, 회사 상태가 초기화되었습니다.' }
}
