import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { decideRedirect } from '@/lib/auth/redirect-decision'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  let isConfigured = false
  if (claims) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_configured')
      .eq('id', claims.sub)
      .maybeSingle()
    isConfigured = profile?.is_configured ?? false
  }

  const target = decideRedirect({
    pathname: request.nextUrl.pathname,
    isAuthenticated: Boolean(claims),
    isConfigured,
  })

  if (target) {
    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
