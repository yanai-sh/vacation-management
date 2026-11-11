import apiClient from './client'
import type { User } from '@/types'

export async function loginRequest(email: string, password: string) {
  const { data } = await apiClient.post<{ token: string; user: User }>('/auth/login', {
    email,
    password,
  })
  return data
}

export async function fetchMe() {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}
