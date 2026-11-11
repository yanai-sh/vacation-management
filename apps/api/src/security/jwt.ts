import jwt from 'jsonwebtoken'
import type { UserRole } from '../persistence/entities/User'
import { AppError } from '../application/errors'

export interface AuthTokenPayload {
  sub: number
  role: UserRole
  email: string
  name: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500)
  }
  return secret
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(
    {
      role: payload.role,
      email: payload.email,
      name: payload.name,
    },
    getSecret(),
    {
      algorithm: 'HS256',
      expiresIn: '8h',
      subject: String(payload.sub),
    },
  )
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload

    const sub = Number(decoded.sub)
    const role = decoded.role as UserRole | undefined
    const email = decoded.email as string | undefined
    const name = decoded.name as string | undefined

    if (!Number.isFinite(sub) || !role || !email || !name) {
      throw new AppError('Invalid token payload', 401)
    }

    return { sub, role, email, name }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError('Invalid or expired token', 401)
  }
}
