'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ProfileFormFields } from '@/components/profile-form-fields'
import { SimPanel } from '@/components/sim-panel'
import { LogsPanel, type DailyEventRow } from '@/components/logs-panel'
import { MessengerPanel, type MessengerLogRow } from '@/components/messenger-panel'
import {
  TalkPanel,
  type ConversationMessageRow,
  type ConversationRow,
  type TalkMemoryRow,
} from '@/components/talk-panel'
import { RelationshipsPanel, type RelationRow } from '@/components/relationships-panel'
import { ResetDataPanel } from '@/components/reset-data-panel'
import { ScrollToTopButton } from '@/components/scroll-to-top-button'
import { saveProfile } from '@/app/onboarding/actions'
import type { ProfileInput } from '@/lib/validation/profile'
import { TABS, type TabId } from '@/lib/tabs'
import { formatDate, seasonName, weekdayNameFromDate } from '@/lib/game/date'

type Profile = ProfileInput & { id: string }
type Npc = ProfileInput & { id: number; active: boolean }
export interface CompanyState {
  day: number
  date: string
  cash: number
  revenue: number
  clients: number
  reputation: number
  sales_mode: string
  overtime_mode: string
  lead_actor_type: string | null
  lead_actor_id: string | null
  seller_actor_type: string | null
  seller_actor_id: string | null
  fire_actor_type: string | null
  fire_actor_id: string | null
  last_manual_chat_day: number
}

export function AppShell({
  profile,
  npcs,
  allNpcs,
  companyState,
  dailyEvents,
  messengerLogs,
  profiles,
  relationships,
  conversations,
  conversationMessages,
  talkMemories,
  initialTab,
  error,
}: {
  profile: Profile
  npcs: Npc[]
  allNpcs: Npc[]
  companyState: CompanyState
  dailyEvents: DailyEventRow[]
  messengerLogs: MessengerLogRow[]
  profiles: Profile[]
  relationships: RelationRow[]
  conversations: ConversationRow[]
  conversationMessages: ConversationMessageRow[]
  talkMemories: TalkMemoryRow[]
  initialTab: TabId
  error?: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const router = useRouter()

  function selectTab(tab: TabId) {
    setActiveTab(tab)
    router.replace(`/?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="sticky top-2 z-10 mb-4 overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur">
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 text-primary-foreground"
          style={{ background: 'linear-gradient(135deg,var(--primary),color-mix(in oklch,var(--primary),black 12%))' }}
        >
          <span className="truncate text-sm font-bold">
            🗓️ {formatDate(companyState.date)} · {weekdayNameFromDate(companyState.date)} · {seasonName(companyState.date)}
          </span>
          <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
            {companyState.day}일차
          </span>
        </div>
        <div role="tablist" aria-label="시뮬레이터 탭" className="flex flex-wrap gap-2 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => selectTab(tab.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold whitespace-nowrap transition-all sm:text-sm ${
                activeTab === tab.id
                  ? 'border-transparent bg-[image:linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary),black_12%))] text-primary-foreground shadow-sm shadow-primary/25'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'sim' && <SimPanel me={profile} roster={npcs} allRoster={allNpcs} companyState={companyState} />}

      {activeTab === 'me' && (
        <Card>
          <CardContent>
            <h2 className="text-lg font-bold">🌷 내정보</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              언제든 나의 정보를 다시 수정할 수 있어요.
            </p>
            <ProfileFormFields
              action={saveProfile}
              profile={profile}
              error={error}
              submitLabel="정보 저장"
              redirectTo="/?tab=me"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'logs' && <LogsPanel events={dailyEvents} />}
      {activeTab === 'messenger' && (
        <MessengerPanel
          me={profile}
          roster={npcs}
          profiles={profiles}
          logs={messengerLogs}
          day={companyState.day}
          lastManualChatDay={companyState.last_manual_chat_day}
        />
      )}
      {activeTab === 'talk' && (
        <TalkPanel
          me={profile}
          profiles={profiles}
          npcs={npcs}
          relationships={relationships}
          conversations={conversations}
          conversationMessages={conversationMessages}
          talkMemories={talkMemories}
          companyDate={companyState.date}
        />
      )}
      {activeTab === 'relationships' && (
        <RelationshipsPanel profiles={profiles} npcs={npcs} relationships={relationships} />
      )}
      {activeTab === 'resetdata' && <ResetDataPanel />}

      <ScrollToTopButton />
    </div>
  )
}
