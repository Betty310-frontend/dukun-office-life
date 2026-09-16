'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// 브라우저 뒤로가기로 /onboarding에 도달하면 Next.js가 캐시된 RSC를 그대로
// 재사용해 미들웨어(proxy.ts)를 다시 태우지 않는다 — 로그아웃했거나 세션이
// 만료된 사용자에게도 예전에 렌더된 온보딩 폼이 그대로 보이는 이유다(제출해도
// writeProfile이 "로그인이 필요합니다" 에러만 반환할 뿐 아무 데로도 보내주지
// 않는다). 미들웨어가 못 잡는 이 경로를 클라이언트에서 세션을 직접 확인해 잡아준다.
//
// router.replace()가 아니라 하드 네비게이션을 쓰는 이유는 RedirectIfAuthenticated와
// 동일 — 미들웨어의 체이닝 리다이렉트를 브라우저가 직접 따라가게 하기 위함이다.
export function RedirectIfUnauthenticated() {
  useEffect(() => {
    function check() {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) window.location.href = '/login'
      })
    }

    check()
    // 브라우저 bfcache(뒤로가기로 페이지가 완전히 새로 마운트되지 않고 그대로
    // 복원되는 경우)에서는 위 useEffect의 최초 실행이 다시 일어나지 않는다.
    // pageshow는 bfcache 복원 시에도 발생하므로 이때 세션을 다시 확인한다.
    window.addEventListener('pageshow', check)
    return () => window.removeEventListener('pageshow', check)
  }, [])

  return null
}
