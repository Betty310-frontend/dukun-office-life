'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// 브라우저 뒤로가기로 /login·/signup에 도달하면 Next.js가 캐시된 RSC를 그대로
// 재사용해 미들웨어(proxy.ts)를 다시 태우지 않는다 — 이미 로그인된 사용자에게도
// 예전에 렌더된 로그인 폼이 그대로 보이는 이유다. 미들웨어가 못 잡는 이 경로를
// 클라이언트에서 세션을 직접 확인해 잡아준다.
export function RedirectIfAuthenticated() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [router])

  return null
}
