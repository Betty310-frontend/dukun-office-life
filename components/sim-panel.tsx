import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RosterCard } from '@/components/roster-card'
import { ComingSoonBadge } from '@/components/coming-soon-badge'

export function SimPanel({
  me,
  roster,
}: {
  me: { name: string; role: string; rank: string; team: string; traits: string[] }
  roster: { id: string | number; name: string; role: string; rank: string; team: string; traits: string[] }[]
}) {
  const allPeople = [{ id: 'me', name: `${me.name} (나)`, role: me.role, rank: me.rank, team: me.team }, ...roster]

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-[image:linear-gradient(135deg,#fff_0%,#faf7ff_52%,#fff8f0_100%)] p-5 shadow-sm shadow-primary/10 sm:p-7">
        <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#c46f91]">OFFICE ROMANCE LIFE SIMULATION</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">두근두근 회사생활 시뮬레이션</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          같은 회사, 다른 마음. 매일의 대화와 작은 선택이 직원들과의 관계를 바꿉니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {['💗 조금씩 가까워지는 사이', '💌 대화 속에 쌓이는 추억', '🌸 평범한 회사생활 속 설렘'].map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-background px-2.5 py-1.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">📌 오늘의 운영 현황</h2>
                <p className="mt-1 text-xs text-muted-foreground">광고주 수와 팀 처리용량의 균형이 중요해요.</p>
              </div>
              <ComingSoonBadge />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: '현금', value: '준비 중' },
                { label: '오늘 매출', value: '준비 중' },
                { label: '광고주', value: '준비 중' },
                { label: '회사 평판', value: '준비 중' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border p-3"
                  style={{ background: ['var(--cute-mint)', 'var(--cute-yellow)', 'var(--cute-blue)', 'var(--cute-purple)'][i] }}
                >
                  <small className="text-xs text-muted-foreground">{stat.label}</small>
                  <p className="mt-1.5 text-base font-bold text-muted-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-bold">🎯 운영 전략</h2>
              <ComingSoonBadge />
            </div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">수주 강도</label>
                <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                  <option>균형 수주</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-muted-foreground">야근 정책</label>
                <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                  <option>필요 시 야근</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled className="flex-1 py-3 text-base">🎲 하루 진행</Button>
        <Button type="button" variant="secondary" disabled>로그만 초기화</Button>
      </section>
      <p className="-mt-2 text-xs text-muted-foreground">
        하루 진행 기능은 다음 업데이트에서 만나보실 수 있어요.
      </p>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">👥 직원 명단</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RosterCard name={`${me.name} (나)`} role={me.role} rank={me.rank} team={me.team} traits={me.traits} />
          {roster.map((npc) => (
            <RosterCard key={npc.id} name={npc.name} role={npc.role} rank={npc.rank} team={npc.team} traits={npc.traits} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-bold">🗂️ 업무 배정</h3>
              <ComingSoonBadge />
            </div>
            <div className="mt-4 grid gap-3">
              {['핵심 광고주 담당자', '신규 영업 담당자', '긴급 이슈 대응 담당자'].map((label) => (
                <div key={label} className="grid gap-1.5">
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <select disabled className="h-9 cursor-not-allowed rounded-md border border-input bg-background px-3 text-sm opacity-60">
                    {allPeople.map((p) => <option key={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="text-base font-bold">📋 운영 기준</h3>
            <div className="mt-4 grid gap-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">일 목표 매출</span><b>₩1,500,000</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">권장 광고주 수</span><b>4~7곳</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">위험 스트레스</span><b>80 이상</b></div>
              <div className="flex justify-between"><span className="text-muted-foreground">퇴사 처리</span><b>사용자 직접</b></div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent>
          <h3 className="text-base font-bold">📰 오늘의 결과</h3>
          <div className="mt-3 rounded-xl border border-border bg-accent/60 p-3 text-sm text-muted-foreground">
            아직 진행 전이에요. &lsquo;하루 진행&rsquo; 기능이 추가되면 이 자리에서 결과를 볼 수 있어요.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
