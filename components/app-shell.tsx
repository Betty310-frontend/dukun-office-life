'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ProfileFormFields } from '@/components/profile-form-fields'
import { SimPanel } from '@/components/sim-panel'
import { LogsPanel } from '@/components/logs-panel'
import { MessengerPanel } from '@/components/messenger-panel'
import { TalkPanel } from '@/components/talk-panel'
import { RelationshipsPanel } from '@/components/relationships-panel'
import { ResetDataPanel } from '@/components/reset-data-panel'
import { saveProfile } from '@/app/onboarding/actions'
import type { ProfileInput } from '@/lib/validation/profile'
import { TABS, type TabId } from '@/lib/tabs'

type Profile = ProfileInput & { id: string }
type Npc = ProfileInput & { id: number; active: boolean }

export function AppShell({
  profile,
  npcs,
  initialTab,
  error,
}: {
  profile: Profile
  npcs: Npc[]
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
      <div
        role="tablist"
        aria-label="시뮬레이터 탭"
        className="sticky top-2 z-10 mb-4 flex flex-wrap gap-2 rounded-2xl border border-border bg-card/80 p-2 backdrop-blur"
      >
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

      {activeTab === 'sim' && <SimPanel me={profile} roster={npcs} />}

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

      {activeTab === 'logs' && <LogsPanel />}
      {activeTab === 'messenger' && <MessengerPanel />}
      {activeTab === 'talk' && <TalkPanel people={npcs} />}
      {activeTab === 'relationships' && <RelationshipsPanel />}
      {activeTab === 'resetdata' && <ResetDataPanel />}
    </div>
  )
}
