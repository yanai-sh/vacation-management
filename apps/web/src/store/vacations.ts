import type { Module } from 'vuex'
import {
  approveRequest,
  cancelRequest,
  createRequest,
  fetchOwnRequests,
  fetchRequesterUsers,
  fetchTeamRequests,
  fetchValidatorRequests,
  rejectRequest,
} from '@/api/vacations'
import type { User, VacationRequest, VacationStatus } from '@/types'
import { pageAfterEmpty } from '@/utils/paging'
import type { RootState } from './index'

let validatorLoad = 0

export interface VacationsState {
  ownItems: VacationRequest[]
  validatorItems: VacationRequest[]
  teamItems: VacationRequest[]
  requesterUsers: User[]
  total: number
  page: number
  pageSize: number
  statusFilter: VacationStatus | ''
  userFilter: number | ''
  loading: boolean
  error: string | null
}

export const vacationsModule: Module<VacationsState, RootState> = {
  namespaced: true,
  state: (): VacationsState => ({
    ownItems: [],
    validatorItems: [],
    teamItems: [],
    requesterUsers: [],
    total: 0,
    page: 1,
    pageSize: 10,
    statusFilter: '',
    userFilter: '',
    loading: false,
    error: null,
  }),
  mutations: {
    setOwnItems(state, items: VacationRequest[]) {
      state.ownItems = items
    },
    setValidatorItems(state, payload: { items: VacationRequest[]; total: number }) {
      state.validatorItems = payload.items
      state.total = payload.total
    },
    setTeamItems(state, items: VacationRequest[]) {
      state.teamItems = items
    },
    setRequesterUsers(state, users: User[]) {
      state.requesterUsers = users
    },
    setPage(state, page: number) {
      state.page = page
    },
    setFilters(state, filters: { statusFilter: VacationStatus | ''; userFilter: number | '' }) {
      state.statusFilter = filters.statusFilter
      state.userFilter = filters.userFilter
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
    async loadValidator({ commit, state }) {
      const seq = ++validatorLoad
      commit('setLoading', true)
      commit('setError', null)
      try {
        const query = {
          status: state.statusFilter,
          userId: state.userFilter,
          pageSize: state.pageSize,
        }
        let data = await fetchValidatorRequests({ ...query, page: state.page })
        if (seq !== validatorLoad) return
        const nextPage = pageAfterEmpty(state.page, state.pageSize, data.total, data.items.length)
        if (nextPage != null) {
          commit('setPage', nextPage)
          data = await fetchValidatorRequests({ ...query, page: nextPage })
          if (seq !== validatorLoad) return
        }
        commit('setValidatorItems', { items: data.items, total: data.total })
      } finally {
        if (seq === validatorLoad) commit('setLoading', false)
      }
    },
    async loadRequesterUsers({ commit }) {
      commit('setRequesterUsers', await fetchRequesterUsers())
    },
    async approve({ dispatch }, id: number) {
      await approveRequest(id)
      await dispatch('loadValidator')
    },
    async reject({ dispatch }, payload: { id: number; comment: string }) {
      await rejectRequest(payload.id, payload.comment)
      await dispatch('loadValidator')
    },
    async loadTeam({ commit }) {
      commit('setLoading', true)
      try {
        commit('setTeamItems', await fetchTeamRequests())
      } finally {
        commit('setLoading', false)
      }
    },
  },
}
