import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/types'

vi.mock('@/api/auth', () => ({
  loginRequest: vi.fn<(email: string, password: string) => Promise<{ token: string; user: User }>>(),
  fetchMe: vi.fn<() => Promise<User>>(),
}))

async function loadStore() {
  vi.resetModules()
  const storeMod = await import('@/store')
  const authApi = await import('@/api/auth')
  return { store: storeMod.default, authApi }
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('keeps the role returned by the server and stores the token', async () => {
    const { store, authApi } = await loadStore()
    vi.mocked(authApi.loginRequest).mockResolvedValue({
      token: 'tok-1',
      user: { id: 2, name: 'Vera', email: 'validator@example.com', role: 'validator' },
    })
    await store.dispatch('auth/login', { email: 'validator@example.com', password: 'secret' })
    expect(store.state.auth.user?.role).toBe('validator')
    expect(localStorage.getItem('vm_token')).toBe('tok-1')
    expect(store.getters['auth/isAuthenticated']).toBe(true)
  })

  it('clears a stored token when login fails', async () => {
    localStorage.setItem('vm_token', 'stale')
    const { store, authApi } = await loadStore()
    vi.mocked(authApi.loginRequest).mockRejectedValue(new Error('Invalid email or password'))
    await expect(
      store.dispatch('auth/login', { email: 'alice@example.com', password: 'nope' }),
    ).rejects.toThrow('Invalid email or password')
    expect(localStorage.getItem('vm_token')).toBeNull()
    expect(store.state.auth.user).toBeNull()
  })

  it('drops an unusable token when the profile cannot be restored', async () => {
    localStorage.setItem('vm_token', 'stale')
    const { store, authApi } = await loadStore()
    vi.mocked(authApi.fetchMe).mockRejectedValue(new Error('Invalid or expired token'))
    await store.dispatch('auth/restore')
    expect(localStorage.getItem('vm_token')).toBeNull()
    expect(store.getters['auth/isAuthenticated']).toBe(false)
  })

  it('does not treat a token without a profile as authenticated', async () => {
    const { store } = await loadStore()
    store.commit('auth/setToken', 'session-token')
    expect(store.getters['auth/isAuthenticated']).toBe(false)
  })

  it('logout removes the token', async () => {
    const { store } = await loadStore()
    store.commit('auth/setToken', 'tok-1')
    store.commit('auth/setUser', {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'requester',
    })
    await store.dispatch('auth/logout')
    expect(store.state.auth.token).toBeNull()
    expect(store.state.auth.user).toBeNull()
    expect(localStorage.getItem('vm_token')).toBeNull()
  })
})
