import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { TAB_IDS, DEFAULT_TAB, type TabId } from '@/lib/tabs'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>
}) {
  const { tab, error } = await searchParams
  const initialTab: TabId = TAB_IDS.includes(tab as TabId)
    ? (tab as TabId)
    : DEFAULT_TAB

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()
  const { data: npcs } = await supabase
    .from('npcs')
    .select('*')
    .eq('active', true)
    .order('id')
  // 시뮬레이션 탭의 직원 명단(추가/수정/퇴사 처리)만 퇴사한 NPC도 같이 보여준다 — 메신저·대화하기·인간관계·
  // 업무배정은 위 active-only npcs를 그대로 쓴다.
  const { data: allNpcs } = await supabase.from('npcs').select('*').order('id')
  const { data: companyState } = await supabase
    .from('company_state')
    .select('*')
    .eq('id', 1)
    .single()
  const { data: dailyEvents } = await supabase
    .from('daily_events')
    .select('id, date, text, category, is_protagonist')
    .order('date', { ascending: false })
    .order('created_at', { ascending: true })
  const { data: messengerLogs } = await supabase
    .from('messenger_logs')
    .select('id, date, scene_type, scene_title, team, participant_refs, lines, forced')
    .order('date', { ascending: false })
    .order('created_at', { ascending: true })
  // 하루 진행은 is_configured인 모든 프로필을 대상으로 이벤트를 생성하므로(여러 실유저가 회사를 공유),
  // 메신저 참여자 이름 표시·인간관계 탭 모두 본인 프로필뿐 아니라 다른 유저 전체가 필요하다.
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_configured', true)
  const { data: relationships } = await supabase
    .from('relationships')
    .select('*')
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, participant_a_type, participant_a_id, participant_b_type, participant_b_id')
  const { data: conversationMessages } = await supabase
    .from('conversation_messages')
    .select('id, conversation_id, sender_type, sender_id, text, created_at')
    .order('created_at', { ascending: true })
  const { data: talkMemories } = await supabase
    .from('talk_memories')
    .select('actor_type, actor_id, target_type, target_id, date, topic, text')
    .order('date', { ascending: false })

  return (
    <AppShell
      profile={profile}
      npcs={npcs ?? []}
      allNpcs={allNpcs ?? []}
      companyState={companyState}
      dailyEvents={dailyEvents ?? []}
      messengerLogs={messengerLogs ?? []}
      profiles={allProfiles ?? []}
      relationships={relationships ?? []}
      conversations={conversations ?? []}
      conversationMessages={conversationMessages ?? []}
      talkMemories={talkMemories ?? []}
      initialTab={initialTab}
      error={error}
    />
  )
}
