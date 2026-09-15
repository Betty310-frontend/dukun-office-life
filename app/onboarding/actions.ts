'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validation/profile'

async function writeProfile(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    gender: formData.get('gender'),
    team: formData.get('team'),
    rank: formData.get('rank'),
    role: formData.get('role'),
    work_style: formData.get('work_style'),
    mbti: formData.get('mbti'),
    traits: formData.getAll('traits'),
    pref_traits: formData.getAll('pref_traits'),
    skill: Number(formData.get('skill')),
    sales: Number(formData.get('sales')),
    crisis: Number(formData.get('crisis')),
    stress: Number(formData.get('stress')),
  })

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data, is_configured: true })

  if (error) {
    console.error('[saveProfile] upsert failed:', error.message)
    return { ok: false, message: '저장에 실패했어요. 잠시 후 다시 시도해주세요.' }
  }

  return { ok: true }
}

// components/app-shell.tsx의 "내정보" 탭에서 쓰는 기존 redirect 기반 액션. 그 경로는
// 항상 같은 route('/?tab=me')로만 돌아가서 미들웨어의 체이닝 리다이렉트를 겪지 않으므로
// 그대로 둔다.
export async function saveProfile(formData: FormData) {
  const redirectTo = (formData.get('redirect_to') as string) || '/onboarding'
  const successTo = (formData.get('redirect_to') as string) || '/'
  const errorSeparator = redirectTo.includes('?') ? '&' : '?'

  const result = await writeProfile(formData)
  if (!result.ok) {
    redirect(`${redirectTo}${errorSeparator}error=${encodeURIComponent(result.message ?? '저장에 실패했어요.')}`)
  }

  redirect(successTo)
}

export type SaveProfileState = { ok: boolean; message?: string } | null

// 온보딩 전용: redirect() 대신 결과만 반환한다. 온보딩 저장 성공 시 '/'로 이동하는데,
// 아직 완료 전이면 미들웨어가 다시 '/onboarding'으로 체이닝할 수 있어서 — redirect()로
// 처리하면 화면은 최종 목적지로 그려지는데 주소창만 첫 리다이렉트 지점에 멈추는 문제가
// 있었다(이 Next.js 버전 이슈). 클라이언트(onboarding-form.tsx)가 이 결과를 받아
// window.location으로 하드 네비게이션한다.
export async function saveProfileOnboarding(
  _prevState: SaveProfileState,
  formData: FormData
): Promise<SaveProfileState> {
  return writeProfile(formData)
}
