'use client'

import { useRef, useState } from 'react'
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
import { logout } from '@/app/actions/auth'
import type { ProfileInput } from '@/lib/validation/profile'
import { TABS, type TabId } from '@/lib/tabs'
import { formatDate, seasonName, weekdayNameFromDate } from '@/lib/game/date'

type Profile = ProfileInput & { id: string; fortune_date: string | null; fortune_text: string | null }
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
  const scrollRef = useRef<HTMLDivElement>(null)

  function selectTab(tab: TabId) {
    setActiveTab(tab)
    router.replace(`/?tab=${tab}`, { scroll: false })
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div
      className="mx-auto flex h-dvh max-w-3xl flex-col
        pt-[max(1rem,env(safe-area-inset-top))] sm:pt-[max(1.5rem,env(safe-area-inset-top))]
        pr-[max(1rem,env(safe-area-inset-right))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]
        pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]
        pl-[max(1rem,env(safe-area-inset-left))] sm:pl-[max(1.5rem,env(safe-area-inset-left))]"
    >
      <div className="mb-4 shrink-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 text-primary-foreground"
          style={{ background: 'linear-gradient(135deg,var(--primary),color-mix(in oklch,var(--primary),black 12%))' }}
        >
          <span className="truncate text-sm font-bold">
            🗓️ {formatDate(companyState.date)} · {weekdayNameFromDate(companyState.date)} · {seasonName(companyState.date)}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
              {companyState.day}일차
            </span>
            <form action={logout}>
              <button
                type="submit"
                aria-label="로그아웃"
                title="로그아웃"
                className="grid size-7 place-items-center rounded-full bg-white/20 text-primary-foreground transition-colors hover:bg-white/30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </form>
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

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
          <RelationshipsPanel profiles={profiles} npcs={npcs} relationships={relationships} talkMemories={talkMemories} />
        )}
        {activeTab === 'resetdata' && <ResetDataPanel />}
      </div>

      <ScrollToTopButton scrollRef={scrollRef} />
    </div>
  )
}
