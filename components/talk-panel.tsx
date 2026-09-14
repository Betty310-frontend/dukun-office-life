'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import {
  generateProfileTalkChoicesAction,
  sendConversationMessageAction,
  sendNpcTalkAction,
  startNpcTalkAction,
} from '@/app/actions/talk'
import { relationLabel } from '@/lib/game/relations'
import type { ActorType, RelationEntry } from '@/lib/game/relations'
import type { TalkChoice } from '@/lib/game/talk'
import type { RelationRow } from '@/components/relationships-panel'

const DEFAULT_RELATION: RelationEntry = { affection: 50, trust: 50, conflict: 10, romantic: 5 }

export interface ConversationRow {
  id: string
  participant_a_type: ActorType
  participant_a_id: string
  participant_b_type: ActorType
  participant_b_id: string
}

export interface ConversationMessageRow {
  id: string
  conversation_id: string
  sender_type: ActorType
  sender_id: string
  text: string
  created_at: string
}

export interface TalkMemoryRow {
  actor_type: ActorType
  actor_id: string
  target_type: ActorType
  target_id: string
  date: string
  topic: string
  text: string
}

interface Person {
  type: ActorType
  id: string
  name: string
  role: string
  rank: string
}

export function TalkPanel({
  me,
  profiles,
  npcs,
  relationships,
  conversations,
  conversationMessages,
  talkMemories,
  companyDate,
}: {
  me: { id: string; name: string }
  profiles: { id: string; name: string; role: string; rank: string }[]
  npcs: { id: number; name: string; role: string; rank: string }[]
  relationships: RelationRow[]
  conversations: ConversationRow[]
  conversationMessages: ConversationMessageRow[]
  talkMemories: TalkMemoryRow[]
  companyDate: string
}) {
  const people: Person[] = useMemo(
    () => [
      ...profiles.filter((p) => p.id !== me.id).map((p) => ({ type: 'profile' as const, id: p.id, name: p.name, role: p.role, rank: p.rank })),
      ...npcs.map((n) => ({ type: 'npc' as const, id: String(n.id), name: n.name, role: n.role, rank: n.rank })),
    ],
    [profiles, npcs, me.id]
  )

  const [selectedKey, setSelectedKey] = useState<string | null>(people[0] ? `${people[0].type}:${people[0].id}` : null)
  const selected = people.find((p) => `${p.type}:${p.id}` === selectedKey) ?? null

  const [query, setQuery] = useState('')
  const trimmedQuery = query.trim().toLocaleLowerCase('ko-KR')
  const filteredPeople = trimmedQuery
    ? people.filter((p) => p.name.toLocaleLowerCase('ko-KR').includes(trimmedQuery))
    : people

  const nameByKey = useMemo(() => {
    const map = new Map<string, string>()
    map.set(`profile:${me.id}`, me.name)
    for (const p of people) map.set(`${p.type}:${p.id}`, p.name)
    return map
  }, [people, me])

  const relationByKey = useMemo(() => {
    const map = new Map<string, RelationRow>()
    for (const r of relationships) map.set(`${r.actor_type}:${r.actor_id}>${r.target_type}:${r.target_id}`, r)
    return map
  }, [relationships])

  const myRelationTo = (person: Person) => relationByKey.get(`profile:${me.id}>${person.type}:${person.id}`)

  const latestMessageByConversationId = useMemo(() => {
    const map = new Map<string, ConversationMessageRow>()
    for (const m of conversationMessages) {
      const prev = map.get(m.conversation_id)
      if (!prev || m.created_at > prev.created_at) map.set(m.conversation_id, m)
    }
    return map
  }, [conversationMessages])

  // 읽음 상태를 별도로 저장하지 않으므로, "마지막 메시지를 상대가 보냈고 아직 내가 답하지 않음"을
  // 새 메시지 신호로 대신 쓴다 — 스키마 변경 없이 얻을 수 있는 가장 간단한 근사치다.
  function hasUnreadFrom(person: Person) {
    if (person.type !== 'profile') return false
    const [pa, pb] = [`profile:${me.id}`, `profile:${person.id}`].sort()
    const conv = conversations.find(
      (c) => `${c.participant_a_type}:${c.participant_a_id}` === pa && `${c.participant_b_type}:${c.participant_b_id}` === pb
    )
    if (!conv) return false
    const last = latestMessageByConversationId.get(conv.id)
    if (!last) return false
    return !(last.sender_type === 'profile' && last.sender_id === me.id)
  }

  const memoriesFor = (person: Person) =>
    talkMemories.filter((m) => m.actor_type === 'profile' && m.actor_id === me.id && m.target_type === person.type && m.target_id === person.id).slice(0, 5)

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-bold">🗨️ 대화하기</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          직원을 선택해 대화를 시작하세요. AI가 만든 대화 선택지 중 하나를 골라 대화해요. NPC와는 하루에 한 번만 가능해요.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[240px_1fr]">
          <div className={`grid gap-2 content-start ${selected ? 'hidden sm:grid' : ''}`}>
            {people.length > 0 && (
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름으로 검색" />
            )}
            {people.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                대화할 사람이 없어요
              </div>
            ) : filteredPeople.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                검색 결과가 없어요
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border">
                <div className="divide-y divide-border">
                  {filteredPeople.map((p) => {
                    const rel = p.type === 'npc' ? myRelationTo(p) : undefined
                    const done = p.type === 'npc' && rel?.last_talked_date === companyDate
                    const unread = hasUnreadFrom(p)
                    const active = selectedKey === `${p.type}:${p.id}`
                    const initial = p.name.trim().charAt(0) || '?'
                    return (
                      <button
                        key={`${p.type}:${p.id}`}
                        type="button"
                        onClick={() => setSelectedKey(`${p.type}:${p.id}`)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                          active ? 'bg-primary/10' : 'hover:bg-accent'
                        }`}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-[image:linear-gradient(135deg,#ffe7f0,#fff7fb)] text-xs font-extrabold">
                          {initial}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate ${active ? 'font-semibold text-foreground' : 'text-foreground'}`}>{p.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {p.rank || '사원'} · {p.role}
                          </span>
                        </span>
                        {done && (
                          <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            완료
                          </span>
                        )}
                        {unread && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            새 메시지
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {!selected ? (
            <div className="hidden rounded-xl border border-border p-6 text-center text-sm text-muted-foreground sm:block">
              왼쪽에서 대화할 사람을 선택하세요.
            </div>
          ) : (
            <ConversationThread
              key={selectedKey}
              me={me}
              selected={selected}
              conversations={conversations}
              conversationMessages={conversationMessages}
              nameByKey={nameByKey}
              relation={selected.type === 'npc' ? (myRelationTo(selected) ?? DEFAULT_RELATION) : undefined}
              talkedToday={selected.type === 'npc' && myRelationTo(selected)?.last_talked_date === companyDate}
              memories={selected.type === 'npc' ? memoriesFor(selected) : []}
              onBack={() => setSelectedKey(null)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ConversationThread({
  me,
  selected,
  conversations,
  conversationMessages,
  nameByKey,
  relation,
  talkedToday,
  memories,
  onBack,
}: {
  me: { id: string; name: string }
  selected: Person
  conversations: ConversationRow[]
  conversationMessages: ConversationMessageRow[]
  nameByKey: Map<string, string>
  relation: RelationEntry | undefined
  talkedToday: boolean
  memories: TalkMemoryRow[]
  onBack: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const conversationId = useMemo(() => {
    const [pa, pb] = [`profile:${me.id}`, `${selected.type}:${selected.id}`].sort()
    const conv = conversations.find(
      (c) => `${c.participant_a_type}:${c.participant_a_id}` === pa && `${c.participant_b_type}:${c.participant_b_id}` === pb
    )
    return conv?.id ?? null
  }, [conversations, me.id, selected])

  const baseMessages = useMemo(
    () => (conversationId ? conversationMessages.filter((m) => m.conversation_id === conversationId) : []),
    [conversationMessages, conversationId]
  )
  const [liveMessages, setLiveMessages] = useState<ConversationMessageRow[]>([])
  const messages = useMemo(() => {
    const extra = liveMessages.filter((m) => !baseMessages.some((b) => b.id === m.id))
    // 실시간 구독으로 붙는 메시지는 baseMessages(서버에서 이미 시간순 정렬됨) 뒤에 그냥
    // 이어붙이면 도착 순서에 따라 실제 대화 순서와 어긋날 수 있어 created_at으로 다시 정렬한다.
    return [...baseMessages, ...extra].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [baseMessages, liveMessages])

  const messagesBoxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = messagesBoxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  useEffect(() => {
    if (!conversationId || selected.type !== 'profile') return
    const supabase = createClient()
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as ConversationMessageRow
          setLiveMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, selected.type])

  const [choices, setChoices] = useState<TalkChoice[] | null>(null)
  const [talkResult, setTalkResult] = useState<{
    reply: string
    delta: { affection: number; trust: number; conflict: number }
    memory: { text: string } | null
  } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function handleGenerateChoices() {
    startTransition(async () => {
      const result =
        selected.type === 'npc'
          ? await startNpcTalkAction(Number(selected.id))
          : await generateProfileTalkChoicesAction(selected.id)
      if (!result.ok) {
        setErrorMsg(result.message)
        return
      }
      setChoices(result.choices ?? null)
    })
  }

  function handlePickChoice(choice: TalkChoice) {
    startTransition(async () => {
      if (selected.type === 'npc') {
        const res = await sendNpcTalkAction(Number(selected.id), choice)
        if (!res.ok) {
          setErrorMsg(res.message)
          setChoices(null)
          return
        }
        setTalkResult({ reply: res.reply!, delta: res.delta!, memory: res.memory ?? null })
        setChoices(null)
        router.refresh()
        return
      }

      const res = await sendConversationMessageAction({ type: 'profile', id: selected.id }, choice.text)
      if (!res.ok) setErrorMsg(res.message)
      setChoices(null)
      router.refresh()
    })
  }

  function handleSendDraft() {
    if (selected.type !== 'profile' || !draft.trim()) return
    const text = draft
    setDraft('')
    startTransition(async () => {
      const res = await sendConversationMessageAction({ type: 'profile', id: selected.id }, text)
      if (!res.ok) setErrorMsg(res.message)
      setChoices(null)
      router.refresh()
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid gap-3 p-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground sm:hidden"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          목록으로
        </button>
        <div className="flex items-center justify-between">
          <b className="text-sm">{selected.name}</b>
          {selected.type === 'npc' && relation && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px]">{relationLabel(relation)}</span>
          )}
        </div>

        {selected.type === 'npc' && relation && (
          <p className="text-xs text-muted-foreground">
            호감 {Math.round(relation.affection)} · 신뢰 {Math.round(relation.trust)} · 갈등 {Math.round(relation.conflict)}
          </p>
        )}

        <div ref={messagesBoxRef} className="grid max-h-72 gap-2 overflow-y-auto">
          {messages.length === 0 && <p className="text-center text-xs text-muted-foreground">아직 대화가 없어요.</p>}
          {messages.map((m) => {
            const mine = m.sender_type === 'profile' && m.sender_id === me.id
            return (
              <div
                key={m.id}
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  mine ? 'ml-auto rounded-tr-sm bg-[#ffe8f1]' : 'rounded-tl-sm bg-[#f8f4f6]'
                }`}
              >
                <span className="mb-0.5 block text-[11px] font-bold text-muted-foreground">
                  {mine ? '나' : (nameByKey.get(`${m.sender_type}:${m.sender_id}`) ?? '알 수 없음')}
                </span>
                {m.text}
              </div>
            )
          })}
        </div>

        {errorMsg && <p className="text-xs font-semibold text-destructive">{errorMsg}</p>}

        {selected.type === 'npc' ? (
          <div className="grid gap-2 rounded-xl border border-border bg-accent/60 p-3">
            {talkResult ? (
              <div className="grid gap-2">
                <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-[#f8f4f6] px-3 py-2 text-sm leading-relaxed">
                  <span className="mb-0.5 block text-[11px] font-bold text-muted-foreground">{selected.name}</span>
                  {talkResult.reply}
                </div>
                <p className="text-xs text-muted-foreground">
                  호감 {talkResult.delta.affection >= 0 ? '+' : ''}
                  {talkResult.delta.affection} · 신뢰 {talkResult.delta.trust >= 0 ? '+' : ''}
                  {talkResult.delta.trust} · 갈등 {talkResult.delta.conflict >= 0 ? '+' : ''}
                  {talkResult.delta.conflict}
                  {talkResult.memory && <> · 💗 새로운 추억이 생겼어요</>}
                </p>
              </div>
            ) : talkedToday ? (
              <p className="text-xs text-muted-foreground">
                오늘 {selected.name}과(와)는 이미 대화했습니다. 직원 한 명당 하루에 한 번만 대화할 수 있습니다. 다음 날 다시 대화할 수 있습니다.
              </p>
            ) : choices ? (
              isPending ? (
                <p className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                  <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  답장을 작성하고 있어요...
                </p>
              ) : (
                <div className="grid gap-2">
                  {choices.map((c, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant="secondary"
                      onClick={() => handlePickChoice(c)}
                      className="h-auto justify-start whitespace-normal py-3 text-left"
                    >
                      {c.text}
                    </Button>
                  ))}
                </div>
              )
            ) : (
              <Button type="button" disabled={isPending} onClick={handleGenerateChoices}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    대화 시작하는 중...
                  </span>
                ) : (
                  '대화 시작하기'
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-2 rounded-xl border border-border bg-accent/60 p-3">
            {choices ? (
              isPending ? (
                <p className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                  <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  전송하는 중...
                </p>
              ) : (
                <div className="grid gap-2">
                  {choices.map((c, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant="secondary"
                      onClick={() => handlePickChoice(c)}
                      className="h-auto justify-start whitespace-normal py-3 text-left"
                    >
                      {c.text}
                    </Button>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendDraft()
                      }}
                      placeholder="직접 입력하기"
                      disabled={isPending}
                    />
                    <Button type="button" disabled={isPending || !draft.trim()} onClick={handleSendDraft}>
                      전송
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <Button type="button" disabled={isPending} onClick={handleGenerateChoices}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    메시지 만드는 중...
                  </span>
                ) : (
                  '메시지 선택하기'
                )}
              </Button>
            )}
          </div>
        )}

        {selected.type === 'npc' && memories.length > 0 && (
          <div className="grid gap-1.5 rounded-xl border border-[#efc4d4] bg-[linear-gradient(180deg,#fffafd_0%,#fff6fa_100%)] p-3">
            <p className="text-xs font-bold text-[#a45775]">💗 둘만의 추억</p>
            {memories.map((m, i) => (
              <p key={i} className="text-xs text-[#7d6570]">
                {m.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
