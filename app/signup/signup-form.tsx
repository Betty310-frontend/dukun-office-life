'use client'

import { useActionState, useEffect } from 'react'
import { signup, type SignupState } from './actions'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const [state, formAction] = useActionState<SignupState, FormData>(signup, null)

  useEffect(() => {
    // 회원가입 직후 세션이 즉시 발급되면(이메일 확인 비활성화) /login이 미들웨어에서
    // 곧바로 /onboarding으로 다시 리다이렉트된다 — 하드 네비게이션이라 브라우저가
    // 그 체인을 그대로 따라가며 주소창도 정확히 맞춰준다.
    if (state?.ok) window.location.href = '/login'
  }, [state])

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">비밀번호</Label>
        <Input id="password" name="password" type="password" required minLength={6} />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <SubmitButton pendingLabel="가입하는 중..." className="w-full">회원가입</SubmitButton>
    </form>
  )
}
