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
  // 메신저 대화 참여자 이름을 표시하려면 본인 프로필뿐 아니라 다른 유저의 이름도 필요하다.
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('is_configured', true)

  return (
    <AppShell
      profile={profile}
      npcs={npcs ?? []}
      companyState={companyState}
      dailyEvents={dailyEvents ?? []}
      messengerLogs={messengerLogs ?? []}
      profiles={allProfiles ?? []}
      initialTab={initialTab}
      error={error}
    />
  )
}
