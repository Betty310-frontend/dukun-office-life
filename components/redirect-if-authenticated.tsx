'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// 브라우저 뒤로가기로 /login·/signup에 도달하면 Next.js가 캐시된 RSC를 그대로
// 재사용해 미들웨어(proxy.ts)를 다시 태우지 않는다 — 이미 로그인된 사용자에게도
// 예전에 렌더된 로그인 폼이 그대로 보이는 이유다. 미들웨어가 못 잡는 이 경로를
// 클라이언트에서 세션을 직접 확인해 잡아준다.
//
// router.replace()(소프트 네비게이션)가 아니라 하드 네비게이션을 쓴다 — '/'가
// 미들웨어에서 다시 '/onboarding'으로 체이닝되는 경우, 소프트 네비게이션은 화면
// 내용은 최종 목적지로 정확히 그려도 주소창만 첫 리다이렉트 지점에 멈추는 문제가
// 이 Next.js 버전에 있다. 하드 네비게이션은 브라우저가 직접 리다이렉트 체인을
// 따라가므로 이 문제에서 자유롭다.
export function RedirectIfAuthenticated() {
  useEffect(() => {
    function check() {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) window.location.href = '/'
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
