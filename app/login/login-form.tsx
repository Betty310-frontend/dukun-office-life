'use client'

import { useActionState, useEffect } from 'react'
import { login, type LoginState } from './actions'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, null)

  useEffect(() => {
    if (state?.ok) window.location.href = '/'
  }, [state])

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton pendingLabel="로그인하는 중..." className="w-full">로그인</SubmitButton>
    </form>
  )
}
