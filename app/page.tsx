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

  return (
    <AppShell
      profile={profile}
      npcs={npcs ?? []}
      companyState={companyState}
      dailyEvents={dailyEvents ?? []}
      initialTab={initialTab}
      error={error}
    />
  )
}
