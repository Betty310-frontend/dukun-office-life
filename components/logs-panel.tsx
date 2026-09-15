'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, seasonName, weekdayNameFromDate } from '@/lib/game/date'
import type { LogCategory } from '@/lib/game/log-category'

export interface DailyEventRow {
  id: string
  date: string
  text: string
  category: LogCategory | null
  is_protagonist: boolean
}

const CATEGORY_FILTERS: { id: 'all' | LogCategory; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'work', label: '업무' },
  { id: 'offwork', label: '업무외 이벤트' },
  { id: 'commute', label: '출퇴근·점심·퇴근후' },
  { id: 'weekend', label: '주말·공휴일' },
  { id: 'season', label: '계절·기념일 이벤트' },
]

// 원본 legacy-reference/원본_V31.html 5351-5353행(logCategoryLabel) 그대로 포팅.
const CATEGORY_TAG_LABEL: Record<LogCategory, string> = {
  work: '업무',
  offwork: '업무외',
  commute: '생활시간',
  weekend: '주말·공휴일',
  season: '계절·기념일',
}

function cleanLogText(text: string, isProtagonist: boolean): string {
  return isProtagonist ? text.replace(/^\[주인공[^\]]*\]\s*/, '') : text
}

const PAGE_SIZE = 5

export function LogsPanel({ events }: { events: DailyEventRow[] }) {
  const [category, setCategory] = useState<'all' | LogCategory>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [visibleDays, setVisibleDays] = useState(PAGE_SIZE)

  function handleCategoryChange(next: 'all' | LogCategory) {
    setCategory(next)
    setVisibleDays(PAGE_SIZE)
  }

  function handleDateFilterChange(next: string) {
    setDateFilter(next)
    setVisibleDays(PAGE_SIZE)
  }

  const days = useMemo(() => {
    const byDate = new Map<string, DailyEventRow[]>()
    for (const ev of events) {
      if (category !== 'all' && ev.category !== category) continue
      if (dateFilter && ev.date !== dateFilter) continue
      const bucket = byDate.get(ev.date)
      if (bucket) bucket.push(ev)
      else byDate.set(ev.date, [ev])
    }
    return Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [events, category, dateFilter])

  const emptyLabel = CATEGORY_FILTERS.find((f) => f.id === category)?.label ?? '전체'

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-bold">📚 일일 로그</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          시뮬레이션 진행 중 발생한 하루 단위 이벤트를 날짜별로 조회합니다.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label htmlFor="log-date-filter" className="text-xs text-muted-foreground">
              날짜 필터
            </label>
            {/* 네이티브 type=date 인풋은 값이 비어있을 때 모바일 브라우저(특히 iOS Safari)에서
                아이콘·텍스트 없이 아주 작게 렌더링돼 뭘 누르는 영역인지 알아보기 어렵다. 그래서
                브라우저 렌더링에 기대지 않고 테두리·배경·달력 아이콘을 우리가 직접 그린 박스 안에
                네이티브 인풋을 투명하게 겹쳐서, 어떤 브라우저에서도 항상 같은 크기/모양으로 보이게 한다. */}
            <div className="relative flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 sm:w-auto">
              <span aria-hidden className="shrink-0 text-sm">📅</span>
              <span className="pointer-events-none text-sm text-foreground">
                {dateFilter ? formatDate(dateFilter) : '날짜 선택'}
              </span>
              <input
                id="log-date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
          </div>
          <Button type="button" variant="secondary" disabled={!dateFilter} onClick={() => handleDateFilterChange('')}>
            전체 날짜 보기
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={category === f.id}
              onClick={() => handleCategoryChange(f.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                category === f.id
                  ? 'border-transparent bg-[image:linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary),black_12%))] text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          {days.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#e5d5dc] bg-[#fffafb] p-10 text-center text-sm font-bold text-[#a18490]">
              [{emptyLabel}
              {dateFilter && ` · ${formatDate(dateFilter)}`} · 데이터 없음]
            </div>
          )}
          {days.slice(0, visibleDays).map(([date, dayEvents]) => (
            <div
              key={date}
              className="rounded-2xl border border-[#eadde3] bg-card p-4 shadow-[0_2px_8px_rgba(50,30,40,.035)]"
            >
              <h4 className="mb-3 border-b border-[#f0e7eb] pb-2.5 text-[15px] font-semibold">
                {formatDate(date)} · {weekdayNameFromDate(date)} · {seasonName(date)}
              </h4>
              <div className="grid gap-2">
                {dayEvents.map((ev, i) => (
                  <div
                    key={ev.id}
                    className={`rounded-xl border p-3 text-sm leading-relaxed ${
                      ev.is_protagonist
                        ? 'border-[#efc4d4] bg-[linear-gradient(180deg,#fffafd_0%,#fff6fa_100%)]'
                        : 'border-[#f0e8ec] bg-[#fbf9fa]'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-[#e7d8df] bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#7b5968]">
                          {CATEGORY_TAG_LABEL[ev.category ?? 'offwork']}
                        </span>
                        {ev.is_protagonist && (
                          <span className="inline-flex items-center rounded-full border border-[#efc3d3] bg-[#fff0f6] px-2 py-0.5 text-[9px] font-black text-[#a45775]">
                            주인공
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] tracking-wide text-[#b59ca7] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[#332c2f]">
                      {cleanLogText(ev.text, ev.is_protagonist) || '[내용 없음]'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {days.length > visibleDays && (
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => setVisibleDays((v) => v + PAGE_SIZE)}
          >
            더 보기 (남은 {days.length - visibleDays}일)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
