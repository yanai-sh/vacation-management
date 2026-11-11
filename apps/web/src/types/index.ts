export type UserRole = 'requester' | 'validator'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}
