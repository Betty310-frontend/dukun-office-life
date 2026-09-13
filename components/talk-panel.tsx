import { Card, CardContent } from '@/components/ui/card'
import { ComingSoonBadge } from '@/components/coming-soon-badge'

export function TalkPanel({
  people,
}: {
  people: { name: string; role: string; rank: string }[]
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">🗨️ 대화하기</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              내 캐릭터가 등록된 직원에게 직접 말을 겁니다. 성격과 현재 관계에 따라 반응과 관계 변화가 달라져요.
            </p>
          </div>
          <ComingSoonBadge />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
          <div className="grid gap-2 content-start">
            <p className="text-xs font-semibold text-muted-foreground">대화할 직원</p>
            {people.map((p) => (
              <button
                key={p.name}
                type="button"
                disabled
                className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-border bg-background p-3 text-left opacity-60"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[image:linear-gradient(135deg,#f4efff,#fff4df)] text-xs font-bold">
                  {p.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{p.rank} · {p.role}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="grid min-h-[240px] place-items-center rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
            직원을 선택하면 대화를 시작할 수 있어요. (기능 준비 중)
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
