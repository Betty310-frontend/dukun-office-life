import { Card, CardContent } from '@/components/ui/card'

export function RosterCard({
  name,
  role,
  rank,
  team,
  traits,
}: {
  name: string
  role: string
  rank: string
  team: string
  traits: string[]
}) {
  const initial = name.trim().charAt(0) || '?'

  return (
    <Card>
      <CardContent className="flex gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-[image:linear-gradient(135deg,#ffe7f0,#fff7fb)] text-base font-extrabold">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{team} · {rank} · {role}</p>
          {traits.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{traits.join(', ')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
