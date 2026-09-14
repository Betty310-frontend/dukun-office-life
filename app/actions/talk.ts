'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateNpcReply, generateTalkChoices } from '@/lib/ai/openai'
import {
  fallbackTalkChoices,
  genericChoiceReply,
  hasTalkedToday,
  maybeCreateTalkMemory,
  relationDeltaForTalkChoice,
  type TalkChoice,
  type TalkMemory,
} from '@/lib/game/talk'
import type { ActorRef, ActorType, RelationEntry } from '@/lib/game/relations'
import { toWorkforceMember } from '@/lib/game/workforce'
import type { WorkforceMember } from '@/lib/game/types'

const DEFAULT_RELATION: RelationEntry = { affection: 50, trust: 50, conflict: 10, romantic: 5 }

function actorTable(type: ActorType) {
  return type === 'profile' ? 'profiles' : 'npcs'
}

async function fetchMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ref: ActorRef
): Promise<WorkforceMember | null> {
  const { data } = await supabase
    .from(actorTable(ref.type))
    .select('*')
    .eq('id', ref.type === 'profile' ? ref.id : Number(ref.id))
    .single()
  return data ? toWorkforceMember(ref.type, data) : null
}

async function fetchRelation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actor: ActorRef,
  target: ActorRef
): Promise<RelationEntry & { last_talked_date: string | null; talk_count: number }> {
  const { data } = await supabase
    .from('relationships')
    .select('affection, trust, conflict, romantic, last_talked_date, talk_count')
    .eq('actor_type', actor.type)
    .eq('actor_id', actor.id)
    .eq('target_type', target.type)
    .eq('target_id', target.id)
    .maybeSingle()
  return data ?? { ...DEFAULT_RELATION, last_talked_date: null, talk_count: 0 }
}

// 참가자 쌍 순서를 정규화해 conversations의 unique 제약과 항상 같은 행에 매칭되게 한다
// (누가 먼저 말을 걸었는지와 무관하게 두 사람 사이엔 스레드가 하나만 생기도록).
function canonicalPair(a: ActorRef, b: ActorRef): [ActorRef, ActorRef] {
  const keyA = `${a.type}:${a.id}`
  const keyB = `${b.type}:${b.id}`
  return keyA <= keyB ? [a, b] : [b, a]
}

async function ensureConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  a: ActorRef,
  b: ActorRef
): Promise<string | null> {
  const [pa, pb] = canonicalPair(a, b)
  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      {
        participant_a_type: pa.type,
        participant_a_id: pa.id,
        participant_b_type: pb.type,
        participant_b_id: pb.id,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'participant_a_type,participant_a_id,participant_b_type,participant_b_id' }
    )
    .select('id')
    .single()
  if (error) {
    console.error('[talk] ensureConversation failed:', error.message)
    return null
  }
  return data.id as string
}

export async function startNpcTalkAction(
  npcId: number
): Promise<{ ok: boolean; message: string; choices?: TalkChoice[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { data: cs } = await supabase.from('company_state').select('date').eq('id', 1).single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  const talkerRef: ActorRef = { type: 'profile', id: user.id }
  const npcRef: ActorRef = { type: 'npc', id: String(npcId) }
  const [talker, npc] = await Promise.all([fetchMember(supabase, talkerRef), fetchMember(supabase, npcRef)])
  if (!talker || !npc) return { ok: false, message: '대상을 찾을 수 없습니다.' }

  const relation = await fetchRelation(supabase, talkerRef, npcRef)
  if (hasTalkedToday(relation.last_talked_date, cs.date)) {
    return {
      ok: false,
      message: `오늘 ${npc.name}과(와)는 이미 대화했습니다. 직원 한 명당 하루에 한 번만 대화할 수 있습니다. 다음 날 다시 대화할 수 있습니다.`,
    }
  }

  const aiChoices = await generateTalkChoices(npc, talker, relation)
  const choices = aiChoices ?? fallbackTalkChoices(`npc:${npcId}`, cs.date)
  return { ok: true, message: '', choices }
}

export async function sendNpcTalkAction(
  npcId: number,
  choice: TalkChoice
): Promise<{
  ok: boolean
  message: string
  reply?: string
  delta?: { affection: number; trust: number; conflict: number }
  memory?: TalkMemory | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { data: cs } = await supabase.from('company_state').select('date').eq('id', 1).single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  const talkerRef: ActorRef = { type: 'profile', id: user.id }
  const npcRef: ActorRef = { type: 'npc', id: String(npcId) }
  const [talker, npc] = await Promise.all([fetchMember(supabase, talkerRef), fetchMember(supabase, npcRef)])
  if (!talker || !npc) return { ok: false, message: '대상을 찾을 수 없습니다.' }

  const relation = await fetchRelation(supabase, talkerRef, npcRef)
  // 동시성 재확인: startNpcTalkAction 이후 다른 요청이 먼저 오늘 대화를 마쳤을 수 있다.
  if (hasTalkedToday(relation.last_talked_date, cs.date)) {
    return { ok: false, message: `오늘 ${npc.name}과(와)는 이미 대화했습니다.` }
  }

  const aiReply = await generateNpcReply(npc, talker, relation, choice)
  const reply = aiReply ?? genericChoiceReply(npc, choice, relation, talker)

  const delta = relationDeltaForTalkChoice(npc, choice, relation, talker)
  const positive = delta.affection + delta.trust >= 0
  const memory = maybeCreateTalkMemory(npc, choice, positive, relation)

  const conversationId = await ensureConversation(supabase, talkerRef, npcRef)
  if (!conversationId) return { ok: false, message: '대화 생성에 실패했습니다.' }

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

  const [, , relationResult, memoryResult] = await Promise.all([
    supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      sender_type: 'profile',
      sender_id: talker.id,
      text: choice.text,
      meta: { group: choice.group, kind: choice.kind, topic: choice.topic },
    }),
    supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      sender_type: 'npc',
      sender_id: npc.id,
      text: reply,
      meta: {},
    }),
    supabase.from('relationships').upsert(
      {
        actor_type: talkerRef.type,
        actor_id: talkerRef.id,
        target_type: npcRef.type,
        target_id: npcRef.id,
        affection: clamp(relation.affection + delta.affection, 0, 100),
        trust: clamp(relation.trust + delta.trust, 0, 100),
        conflict: clamp(relation.conflict + delta.conflict, 0, 100),
        last_talked_date: cs.date,
        talk_count: relation.talk_count + 1,
      },
      { onConflict: 'actor_type,actor_id,target_type,target_id' }
    ),
    memory
      ? supabase.from('talk_memories').insert({
          actor_type: talkerRef.type,
          actor_id: talkerRef.id,
          target_type: npcRef.type,
          target_id: npcRef.id,
          date: cs.date,
          topic: memory.topic,
          text: memory.text,
        })
      : Promise.resolve({ error: null }),
  ])
  if (relationResult.error || memoryResult.error) {
    console.error('[talk] sendNpcTalkAction failed:', relationResult.error?.message, memoryResult.error?.message)
    return { ok: false, message: '대화 반영에 실패했습니다.' }
  }

  revalidatePath('/')
  return { ok: true, message: reply, reply, delta, memory }
}

export async function generateProfileTalkChoicesAction(
  otherProfileId: string
): Promise<{ ok: boolean; message: string; choices?: TalkChoice[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }
  if (otherProfileId === user.id) return { ok: false, message: '자기 자신과는 대화할 수 없습니다.' }

  const { data: cs } = await supabase.from('company_state').select('date').eq('id', 1).single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  const meRef: ActorRef = { type: 'profile', id: user.id }
  const otherRef: ActorRef = { type: 'profile', id: otherProfileId }
  const [me, other] = await Promise.all([fetchMember(supabase, meRef), fetchMember(supabase, otherRef)])
  if (!me || !other) return { ok: false, message: '대상을 찾을 수 없습니다.' }

  const relation = await fetchRelation(supabase, meRef, otherRef)
  const aiChoices = await generateTalkChoices(other, me, relation)
  const choices = aiChoices ?? fallbackTalkChoices(`profile:${otherProfileId}`, cs.date)
  return { ok: true, message: '', choices }
}

export async function sendConversationMessageAction(
  other: ActorRef,
  text: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const trimmed = text.trim()
  if (!trimmed) return { ok: false, message: '메시지를 입력해주세요.' }

  const selfRef: ActorRef = { type: 'profile', id: user.id }
  if (other.type === selfRef.type && other.id === selfRef.id) {
    return { ok: false, message: '자기 자신과는 대화할 수 없습니다.' }
  }

  const conversationId = await ensureConversation(supabase, selfRef, other)
  if (!conversationId) return { ok: false, message: '대화 생성에 실패했습니다.' }

  const { error } = await supabase.from('conversation_messages').insert({
    conversation_id: conversationId,
    sender_type: 'profile',
    sender_id: user.id,
    text: trimmed,
    meta: {},
  })
  if (error) return { ok: false, message: '메시지 전송에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '전송되었습니다.' }
}
