import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ComingSoonBadge } from '@/components/coming-soon-badge'

const CATEGORIES = ['전체', '업무', '업무외 이벤트', '출퇴근·점심·퇴근후', '주말·공휴일', '계절·기념일 이벤트', '즐겨찾기']

export function LogsPanel() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">📚 일일 로그</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              시뮬레이션 진행 중 발생한 하루 단위 이벤트를 날짜별로 조회합니다.
            </p>
          </div>
          <ComingSoonBadge />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <label className="text-xs text-muted-foreground">날짜 필터</label>
            <Input type="date" disabled className="w-auto" />
          </div>
          <Button type="button" variant="secondary" disabled>전체 날짜 보기</Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              disabled
              className="cursor-not-allowed rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground opacity-60"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          아직 &lsquo;하루 진행&rsquo; 기능이 없어서 쌓인 로그가 없어요. 곧 이 자리에서 매일의 회사 이야기를 볼 수 있어요.
        </div>
      </CardContent>
    </Card>
  )
}
