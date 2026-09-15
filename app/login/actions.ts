'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { translateAuthError } from '@/lib/auth/error-messages'

export type LoginState = { ok: boolean; message?: string } | null

// redirect()로 서버가 지시하는 소프트 네비게이션은, 그 목적지가 미들웨어(proxy.ts)에서
// 다시 다른 경로로 체이닝되는 경우(로그인 직후 '/'가 '/onboarding'으로 리다이렉트되는 등)
// 화면 내용은 최종 목적지로 정확히 렌더링되면서도 주소창 URL만 첫 리다이렉트 지점에
// 멈춰버리는 문제가 있다. 성공 시 결과만 반환하고, 실제 이동은 클라이언트에서
// window.location으로 하드 네비게이션해 이 문제를 피한다.
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { ok: false, message: translateAuthError(error.message) }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}
