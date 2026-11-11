import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import { AppError } from '../application/errors'
import type { UserRole } from '../domain'
import { verifyAuthToken, type AuthTokenPayload } from './jwt'

export type AuthUser = AuthTokenPayload

export function requireAuth(event: CommonEvent): AuthUser {
  const header = event.headers?.authorization ?? event.headers?.Authorization
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401)
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    throw new AppError('Authentication required', 401)
  }

  return verifyAuthToken(token)
}

export function requireRole(event: CommonEvent, roles: UserRole[]): AuthUser {
  const user = requireAuth(event)
  if (!roles.includes(user.role)) {
    throw new AppError('Forbidden', 403)
  }
  return user
}
