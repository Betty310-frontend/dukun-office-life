const PUBLIC_PATHS = ['/login', '/signup']

export function decideRedirect(input: {
  pathname: string
  isAuthenticated: boolean
  isConfigured: boolean
}): string | null {
  const { pathname, isAuthenticated, isConfigured } = input

  if (!isAuthenticated) {
    return PUBLIC_PATHS.includes(pathname) ? null : '/login'
  }

  if (!isConfigured) {
    return pathname === '/onboarding' ? null : '/onboarding'
  }

  return pathname === '/onboarding' ? '/' : null
}
