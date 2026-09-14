'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema } from '@/lib/validation/profile'

export async function updateNpcAction(id: number, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { error } = await supabase.from('npcs').update(parsed.data).eq('id', id)
  if (error) return { ok: false, message: '직원 정보 저장에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: '직원 정보가 저장되었습니다.' }
}

export async function toggleNpcActiveAction(id: number): Promise<{ ok: boolean; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { data: npc } = await supabase.from('npcs').select('active').eq('id', id).single()
  if (!npc) return { ok: false, message: '직원을 찾을 수 없습니다.' }

  if (npc.active) {
    const { count } = await supabase.from('npcs').select('id', { count: 'exact', head: true }).eq('active', true)
    if ((count ?? 0) <= 1) return { ok: false, message: '활성 직원은 최소 1명 필요합니다.' }
  }

  const { error } = await supabase.from('npcs').update({ active: !npc.active }).eq('id', id)
  if (error) return { ok: false, message: '처리에 실패했습니다.' }

  revalidatePath('/')
  return { ok: true, message: npc.active ? '퇴사 처리되었습니다.' : '퇴사가 취소되었습니다.' }
}
