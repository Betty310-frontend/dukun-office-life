import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ComingSoonBadge } from '@/components/coming-soon-badge'

export function RelationshipsPanel() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">💞 인간관계</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              직원 간 친밀도·신뢰도·갈등도는 방향별로 따로 누적돼요. 이름을 검색하면 해당 직원이 포함된 관계만 볼 수 있어요.
            </p>
          </div>
          <ComingSoonBadge />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input placeholder="예: 지연" disabled className="max-w-xs" />
          <span className="text-xs text-muted-foreground">전체 관계</span>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          하루 진행이 시작되면 직원들 사이의 관계가 이곳에 쌓여요.
        </div>
      </CardContent>
    </Card>
  )
}
