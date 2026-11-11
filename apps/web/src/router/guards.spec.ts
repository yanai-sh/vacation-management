import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRole } from '@/types'

function profile(role: UserRole) {
  return { id: 1, name: role, email: `${role}@example.com`, role }
}

async function loadApp() {
  vi.resetModules()
  const routerMod = await import('@/router')
  const storeMod = await import('@/store')
  return { router: routerMod.default, store: storeMod.default }
}

async function signedIn(role: UserRole) {
  const { router, store } = await loadApp()
  await router.push('/login')
  store.commit('auth/setToken', 'session-token')
  store.commit('auth/setUser', profile(role))
  return router
}

describe('route guards', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sends an anonymous visitor to login', async () => {
    const { router } = await loadApp()
    await router.push('/requester')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/requester')
  })

  it('sends a requester from login to their requests', async () => {
    const router = await signedIn('requester')
    await router.push('/requester')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('requester')
  })

  it('sends a validator from login to the review page', async () => {
    const router = await signedIn('validator')
    await router.push('/validator')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('validator')
  })

  it('sends a requester home visit to their requests', async () => {
    const router = await signedIn('requester')
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('requester')
  })

  it('keeps a validator off the requester page', async () => {
    const router = await signedIn('validator')
    await router.push('/requester')
    expect(router.currentRoute.value.name).toBe('validator')
  })

  it('keeps a requester off the validator page', async () => {
    const router = await signedIn('requester')
    await router.push('/validator')
    expect(router.currentRoute.value.name).toBe('requester')
  })

  it('does not treat a token without a profile as a session', async () => {
    const { router, store } = await loadApp()
    await router.push('/login')
    store.commit('auth/setToken', 'session-token')
    await router.push('/requester')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/requester')
  })
})
