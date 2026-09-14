'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { resetSimulationAction } from '@/app/actions/reset-data'

export function ResetDataPanel() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(true)

  function handleReset() {
    startTransition(async () => {
      const result = await resetSimulationAction()
      setMessage(result.message)
      setMessageOk(result.ok)
      setConfirming(false)
      if (result.ok) router.refresh()
    })
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-bold">🗑️ 데이터 초기화</h2>
        <p className="mt-1 text-sm text-muted-foreground">시뮬레이션 진행 기록을 처음 상태로 되돌립니다.</p>

        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          일일 로그, 메신저 대화, 인간관계, 회사 상태(자금·매출·광고주·평판·담당자 배정), NPC 스트레스가 초기화돼요.
          내정보(프로필)와 직원 명단은 그대로 유지돼요.
        </div>

        {!confirming ? (
          <Button type="button" variant="destructive" className="mt-4" onClick={() => setConfirming(true)}>
            데이터 초기화
          </Button>
        ) : (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm font-bold text-destructive">정말 초기화하시겠습니까? 되돌릴 수 없습니다.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" disabled={isPending} onClick={() => setConfirming(false)}>
                취소
              </Button>
              <Button type="button" variant="destructive" disabled={isPending} onClick={handleReset}>
                {isPending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    초기화하는 중...
                  </span>
                ) : (
                  '초기화하기'
                )}
              </Button>
            </div>
          </div>
        )}

        {message && (
          <p className={`mt-3 text-sm font-semibold ${messageOk ? 'text-primary' : 'text-destructive'}`}>{message}</p>
        )}
      </CardContent>
    </Card>
  )
}
