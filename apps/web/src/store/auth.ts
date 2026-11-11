import type { Module } from 'vuex'
import { fetchMe, loginRequest } from '@/api/auth'
import { TOKEN_KEY } from '@/auth/token'
import type { User } from '@/types'
import type { RootState } from './index'

export interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
}

export const authModule: Module<AuthState, RootState> = {
  namespaced: true,
  state: (): AuthState => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    role: (state) => state.user?.role ?? null,
  },
  mutations: {
    setToken(state, token: string | null) {
      state.token = token
      if (token) {
        localStorage.setItem(TOKEN_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    },
    setUser(state, user: User | null) {
      state.user = user
    },
    setLoading(state, loading: boolean) {
      state.loading = loading
    },
    setError(state, error: string | null) {
      state.error = error
    },
  },
  actions: {
    async login({ commit }, payload: { email: string; password: string }) {
      commit('setLoading', true)
      commit('setError', null)
      try {
        const result = await loginRequest(payload.email, payload.password)
        commit('setToken', result.token)
        commit('setUser', result.user)
        return result.user
      } catch (error) {
        commit('setToken', null)
        commit('setUser', null)
        throw error
      } finally {
        commit('setLoading', false)
      }
    },
    async restore({ commit, state }) {
      if (!state.token) {
        return null
      }
      commit('setLoading', true)
      try {
        const user = await fetchMe()
        commit('setUser', user)
        return user
      } catch {
        commit('setToken', null)
        commit('setUser', null)
        return null
      } finally {
        commit('setLoading', false)
      }
    },
    logout({ commit }) {
      commit('setToken', null)
      commit('setUser', null)
      commit('setError', null)
    },
  },
}
