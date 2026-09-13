'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validation/profile'

export async function saveProfile(formData: FormData) {
  const supabase = await createClient()
  const redirectTo = (formData.get('redirect_to') as string) || '/onboarding'
  const successTo = (formData.get('redirect_to') as string) || '/'
  const errorSeparator = redirectTo.includes('?') ? '&' : '?'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

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
    const message = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요'
    redirect(`${redirectTo}${errorSeparator}error=${encodeURIComponent(message)}`)
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...parsed.data, is_configured: true })

  if (error) {
    redirect(`${redirectTo}${errorSeparator}error=${encodeURIComponent(error.message)}`)
  }

  redirect(successTo)
}
