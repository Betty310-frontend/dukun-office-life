import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ComingSoonBadge } from '@/components/coming-soon-badge'

export function MessengerPanel() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">💬 메신저</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              매일 직원들의 실무·광고주 고민·회사 일상 대화가 직원 성격과 관계도에 맞춰 자동 생성됩니다.
            </p>
          </div>
          <ComingSoonBadge />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-accent/60 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">직원 1</label>
              <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                <option>-</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">직원 2</label>
              <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                <option>-</option>
              </select>
            </div>
            <Button type="button" disabled>랜덤 상황 대화 만들기</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">3일마다 1회 직접 매칭할 수 있어요.</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="grid gap-2 content-start">
            <p className="text-xs font-semibold text-muted-foreground">대화 기록</p>
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              아직 대화가 없어요
            </div>
          </div>
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3 text-sm font-bold">대화 없음</div>
            <div className="p-6 text-center text-sm text-muted-foreground">
              시뮬레이션을 하루 진행하면 직원 대화가 생성돼요.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
