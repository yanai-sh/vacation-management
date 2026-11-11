import apiClient from './client'
import type { PaginatedVacationRequests, User, VacationRequest, VacationStatus } from '@/types'

export async function fetchOwnRequests() {
  const { data } = await apiClient.get<{ items: VacationRequest[] }>('/vacation-requests')
  return data.items
}

export async function createRequest(payload: {
  startDate: string
  endDate: string
  reason?: string
}) {
  const { data } = await apiClient.post<VacationRequest>('/vacation-requests', payload)
  return data
}

export async function cancelRequest(id: number) {
  await apiClient.delete(`/vacation-requests/${id}`)
}

export async function fetchValidatorRequests(params: {
  status?: VacationStatus | ''
  userId?: number | ''
  page: number
  pageSize: number
}) {
  const { data } = await apiClient.get<PaginatedVacationRequests>('/validator/vacation-requests', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      status: params.status || undefined,
      userId: params.userId || undefined,
    },
  })
  return data
}

export async function approveRequest(id: number) {
  const { data } = await apiClient.post<VacationRequest>(
    `/validator/vacation-requests/${id}/approve`,
  )
  return data
}

export async function rejectRequest(id: number, comment: string) {
  const { data } = await apiClient.post<VacationRequest>(
    `/validator/vacation-requests/${id}/reject`,
    { comment },
  )
  return data
}

export async function fetchTeamRequests() {
  const { data } = await apiClient.get<{ items: VacationRequest[] }>('/team/vacation-requests')
  return data.items
}

export async function fetchRequesterUsers() {
  const { data } = await apiClient.get<{ items: User[] }>('/validator/users')
  return data.items
}
