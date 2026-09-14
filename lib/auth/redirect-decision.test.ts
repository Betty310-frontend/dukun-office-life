import { describe, it, expect } from 'vitest'
import { decideRedirect } from './redirect-decision'

describe('decideRedirect', () => {
  it('sends unauthenticated users to /login', () => {
    expect(decideRedirect({ pathname: '/', isAuthenticated: false, isConfigured: false }))
      .toBe('/login')
  })

  it('does not redirect unauthenticated users already on /login', () => {
    expect(decideRedirect({ pathname: '/login', isAuthenticated: false, isConfigured: false }))
      .toBeNull()
  })

  it('does not redirect unauthenticated users already on /signup', () => {
    expect(decideRedirect({ pathname: '/signup', isAuthenticated: false, isConfigured: false }))
      .toBeNull()
  })

  it('sends authenticated but unconfigured users to /onboarding', () => {
    expect(decideRedirect({ pathname: '/', isAuthenticated: true, isConfigured: false }))
      .toBe('/onboarding')
  })

  it('does not redirect unconfigured users already on /onboarding', () => {
    expect(decideRedirect({ pathname: '/onboarding', isAuthenticated: true, isConfigured: false }))
      .toBeNull()
  })

  it('does not redirect fully configured users', () => {
    expect(decideRedirect({ pathname: '/', isAuthenticated: true, isConfigured: true }))
      .toBeNull()
  })

  it('sends configured users away from /onboarding back to home', () => {
    expect(decideRedirect({ pathname: '/onboarding', isAuthenticated: true, isConfigured: true }))
      .toBe('/')
  })

  it('sends configured users away from /login back to home (e.g. after a stale browser-back)', () => {
    expect(decideRedirect({ pathname: '/login', isAuthenticated: true, isConfigured: true }))
      .toBe('/')
  })

  it('sends configured users away from /signup back to home', () => {
    expect(decideRedirect({ pathname: '/signup', isAuthenticated: true, isConfigured: true }))
      .toBe('/')
  })
})
