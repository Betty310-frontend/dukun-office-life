'use client'

import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-4 text-center">
      <Card className="w-full">
        <CardContent>
          <p className="text-3xl">😵‍💫</p>
          <h2 className="mt-2 text-lg font-bold">잠시 문제가 생겼어요</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            네트워크가 불안정하거나 서버가 일시적으로 응답하지 않았어요. 다시 시도해주세요.
          </p>
          <Button type="button" className="mt-4 w-full" onClick={() => retry()}>
            다시 시도
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
