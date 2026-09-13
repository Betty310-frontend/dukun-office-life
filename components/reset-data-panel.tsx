import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ComingSoonBadge } from '@/components/coming-soon-badge'

export function ResetDataPanel() {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">🗑️ 데이터 초기화</h2>
            <p className="mt-1 text-sm text-muted-foreground">현재 회사에 저장된 모든 데이터를 완전히 초기화합니다.</p>
          </div>
          <ComingSoonBadge />
        </div>

        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          직원 명단, 내정보, 인간관계, 대화 기록, 메신저, 일일 로그, 회사 상태와 시뮬레이션 진행 기록이 모두 삭제돼요.
        </div>

        <Button type="button" variant="destructive" disabled className="mt-4">데이터 초기화</Button>
      </CardContent>
    </Card>
  )
}
