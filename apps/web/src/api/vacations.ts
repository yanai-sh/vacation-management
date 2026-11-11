import apiClient from './client'
import type { VacationRequest } from '@/types'

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
