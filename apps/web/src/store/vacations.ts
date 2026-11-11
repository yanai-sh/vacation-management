import type { Module } from 'vuex'
import { cancelRequest, createRequest, fetchOwnRequests } from '@/api/vacations'
import type { VacationRequest } from '@/types'
import type { RootState } from './index'

export interface VacationsState {
  ownItems: VacationRequest[]
  loading: boolean
  error: string | null
}

export const vacationsModule: Module<VacationsState, RootState> = {
  namespaced: true,
  state: (): VacationsState => ({
    ownItems: [],
    loading: false,
    error: null,
  }),
  mutations: {
    setOwnItems(state, items: VacationRequest[]) {
      state.ownItems = items
    },
    setLoading(state, loading: boolean) {
      state.loading = loading
    },
    setError(state, error: string | null) {
      state.error = error
    },
  },
  actions: {
    async loadOwn({ commit }) {
      commit('setLoading', true)
      commit('setError', null)
      try {
        commit('setOwnItems', await fetchOwnRequests())
      } catch (error) {
        commit('setError', error instanceof Error ? error.message : 'Failed to load requests')
        throw error
      } finally {
        commit('setLoading', false)
      }
    },
    async create({ dispatch }, payload: { startDate: string; endDate: string; reason?: string }) {
      await createRequest(payload)
      await dispatch('loadOwn')
    },
    async cancel({ dispatch }, id: number) {
      await cancelRequest(id)
      await dispatch('loadOwn')
    },
  },
}
