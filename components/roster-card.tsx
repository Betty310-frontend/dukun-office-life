import { Card, CardContent } from '@/components/ui/card'

export function RosterCard({
  name,
  role,
  rank,
  team,
  traits,
  compact = false,
}: {
  name: string
  role: string
  rank: string
  team: string
  traits: string[]
  compact?: boolean
}) {
  const initial = name.trim().charAt(0) || '?'

  return (
    <Card size={compact ? 'sm' : 'default'}>
      <CardContent className="flex items-center gap-3">
        <div
          className={`grid shrink-0 place-items-center rounded-xl border border-border bg-[image:linear-gradient(135deg,#ffe7f0,#fff7fb)] font-extrabold ${
            compact ? 'size-9 text-sm' : 'size-11 text-base'
          }`}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className={`truncate font-bold ${compact ? 'text-sm' : 'text-base'}`}>{name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {team} · {rank} · {role}
          </p>
          {traits.length > 0 && (
            <p className={`text-xs text-muted-foreground ${compact ? 'mt-1 truncate' : 'mt-2'}`}>{traits.join(', ')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
