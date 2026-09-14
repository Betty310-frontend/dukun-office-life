'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getTodayFortuneAction } from '@/app/actions/fortune'

export function DailyFortuneCard({
  cachedDate,
  cachedFortune,
  companyDate,
}: {
  cachedDate: string | null
  cachedFortune: string | null
  companyDate: string
}) {
  const isFresh = cachedDate === companyDate && !!cachedFortune
  const [generated, setGenerated] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (isFresh) return
    startTransition(async () => {
      const res = await getTodayFortuneAction()
      if (res.ok && res.fortune) setGenerated(res.fortune)
    })
  }, [isFresh, companyDate])

  const fortune = isFresh ? cachedFortune : generated

  return (
    <Card>
      <CardContent>
        <h2 className="text-base font-bold">🔮 오늘의 운세</h2>
        {fortune ? (
          <p className="mt-1 text-sm leading-relaxed text-[#7d6570]">{fortune}</p>
        ) : (
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            운세를 보는 중...
          </p>
        )}
      </CardContent>
    </Card>
  )
}
