'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateMessengerScene } from '@/lib/game/messenger'
import { relKey, type ActorRef, type RelationsMap } from '@/lib/game/relations'
import { toWorkforceMember } from '@/lib/game/workforce'

// 원본 legacy-reference/원본_V31.html 2640행(canManualChat) 그대로: day - lastManualChatDay >= 3
const MANUAL_CHAT_COOLDOWN_DAYS = 3

export async function manualChatAction(
  a: ActorRef,
  b: ActorRef
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  if (a.type === b.type && a.id === b.id) {
    return { ok: false, message: '서로 다른 직원 두 명을 선택해주세요.' }
  }

  const { data: cs } = await supabase
    .from('company_state')
    .select('day, date, last_manual_chat_day')
    .eq('id', 1)
    .single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  if (cs.day - cs.last_manual_chat_day < MANUAL_CHAT_COOLDOWN_DAYS) {
    const remain = MANUAL_CHAT_COOLDOWN_DAYS - (cs.day - cs.last_manual_chat_day)
    return { ok: false, message: `직접 매칭 재사용까지 ${remain}일 남았습니다.` }
  }

  const [{ data: rowA }, { data: rowB }] = await Promise.all([
    supabase.from(a.type === 'profile' ? 'profiles' : 'npcs').select('*').eq('id', a.type === 'profile' ? a.id : Number(a.id)).single(),
    supabase.from(b.type === 'profile' ? 'profiles' : 'npcs').select('*').eq('id', b.type === 'profile' ? b.id : Number(b.id)).single(),
  ])
  if (!rowA || !rowB) return { ok: false, message: '대상을 찾을 수 없습니다.' }

  const memberA = toWorkforceMember(a.type, rowA)
  const memberB = toWorkforceMember(b.type, rowB)

  const { data: relRows } = await supabase.from('relationships').select('*')
  const relations: RelationsMap = new Map(
    (relRows ?? []).map((r) => [
      relKey({ type: r.actor_type, id: r.actor_id }, { type: r.target_type, id: r.target_id }),
      { affection: r.affection, trust: r.trust, conflict: r.conflict, romantic: r.romantic },
    ])
  )

  const scene = generateMessengerScene(relations, memberA, memberB, cs.date, true)

  const { error: insertError } = await supabase.from('messenger_logs').insert({
    date: scene.date,
    scene_type: scene.sceneType,
    scene_title: scene.scene,
    team: scene.team ?? null,
    participant_refs: scene.participants,
    lines: scene.lines,
    forced: scene.forced,
  })
  if (insertError) return { ok: false, message: '대화 생성에 실패했습니다.' }

  const { error: csError } = await supabase
    .from('company_state')
    .update({ last_manual_chat_day: cs.day })
    .eq('id', 1)
  if (csError) return { ok: false, message: '쿨다운 갱신에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: `${memberA.name}, ${memberB.name}의 대화가 생성되었습니다.` }
}
