export type UserRole = 'requester' | 'validator'
export type VacationStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}

export interface VacationRequest {
  id: number
  userId: number
  startDate: string
  endDate: string
  reason: string | null
  status: VacationStatus
  comments: string | null
  createdAt: string
  updatedAt: string
  user?: User
}
