'use server'

import { createClient } from '@/lib/supabase/server'
import { generateDailyFortune } from '@/lib/ai/openai'
import { fallbackFortune } from '@/lib/game/fortune'
import { formatDate, weekdayNameFromDate } from '@/lib/game/date'
import { toWorkforceMember } from '@/lib/game/workforce'

export async function getTodayFortuneAction(): Promise<{ ok: boolean; message: string; fortune?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인이 필요합니다.' }

  const { data: cs } = await supabase.from('company_state').select('date').eq('id', 1).single()
  if (!cs) return { ok: false, message: '회사 상태를 찾을 수 없습니다.' }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return { ok: false, message: '프로필을 찾을 수 없습니다.' }

  if (profile.fortune_date === cs.date && profile.fortune_text) {
    return { ok: true, message: '', fortune: profile.fortune_text }
  }

  const me = toWorkforceMember('profile', profile)
  const dateLabel = `${formatDate(cs.date)} ${weekdayNameFromDate(cs.date)}`
  const aiFortune = await generateDailyFortune(me, dateLabel)
  const fortune = aiFortune ?? fallbackFortune(user.id, cs.date)

  const { error } = await supabase
    .from('profiles')
    .update({ fortune_date: cs.date, fortune_text: fortune })
    .eq('id', user.id)
  if (error) {
    console.error('[fortune] failed to cache fortune:', error.message)
    // 캐시 저장이 실패해도 이번 요청에서 생성된 운세는 그대로 보여준다 — 다음 로드 때 다시 생성될 뿐이다.
  }

  return { ok: true, message: '', fortune }
}
