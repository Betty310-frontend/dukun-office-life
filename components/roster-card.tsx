import { Card, CardContent } from '@/components/ui/card'
import { roleLabel } from '@/lib/game/compatibility'

const STATS: { key: 'skill' | 'sales' | 'crisis' | 'stress'; label: string }[] = [
  { key: 'skill', label: '실무' },
  { key: 'sales', label: '영업' },
  { key: 'crisis', label: '위기대응' },
  { key: 'stress', label: '스트레스' },
]

function StatBar({ label, value, compact }: { label: string; value: number; compact: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div>
      <div className={`flex items-center justify-between text-muted-foreground ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        <span>{label}</span>
        <b className="text-foreground">{clamped}</b>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full bg-border">
        <div
          className="h-1.5 rounded-full bg-[image:linear-gradient(90deg,#f6a8c4,#e17098)]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

export function RosterCard({
  name,
  role,
  rank,
  team,
  traits,
  gender,
  mbti,
  workStyle,
  skill,
  sales,
  crisis,
  stress,
  active = true,
  compact = false,
}: {
  name: string
  role: string
  rank: string
  team: string
  traits: string[]
  gender: string
  mbti: string
  workStyle: string
  skill: number
  sales: number
  crisis: number
  stress: number
  active?: boolean
  compact?: boolean
}) {
  const initial = name.trim().charAt(0) || '?'
  const stats = { skill, sales, crisis, stress }

  return (
    <Card size={compact ? 'sm' : 'default'}>
      <CardContent>
        <div className="flex items-start gap-3">
          <div
            className={`grid shrink-0 place-items-center rounded-xl border border-border bg-[image:linear-gradient(135deg,#ffe7f0,#fff7fb)] font-extrabold ${
              compact ? 'size-9 text-sm' : 'size-11 text-base'
            }`}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className={`truncate font-bold ${compact ? 'text-sm' : 'text-base'}`}>{name}</p>
              <div className="flex shrink-0 flex-wrap gap-1">
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{mbti}</span>
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{gender}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active ? 'bg-[var(--cute-mint)] text-foreground' : 'bg-border text-muted-foreground'
                  }`}
                >
                  {active ? '재직' : '퇴사'}
                </span>
              </div>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {team} · {rank} · {role} · {workStyle}
            </p>
          </div>
        </div>

        <p className={`text-xs text-muted-foreground ${compact ? 'mt-2' : 'mt-3'}`}>
          <b className="text-foreground">실제 역할</b> · {roleLabel(role)}
        </p>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {STATS.map(({ key, label }) => (
            <StatBar key={key} label={label} value={stats[key]} compact={compact} />
          ))}
        </div>

        {traits.length > 0 && (
          <p className={`text-xs text-muted-foreground ${compact ? 'mt-2 truncate' : 'mt-2.5'}`}>{traits.join(', ')}</p>
        )}
      </CardContent>
    </Card>
  )
}
