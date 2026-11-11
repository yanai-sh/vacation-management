import { AppError } from './errors'
import AppDataSource from '../persistence/data-source'
import { User } from '../persistence/entities/User'
import { signAuthToken } from '../security/jwt'
import { verifyPassword } from '../security/password'

export interface PublicUser {
  id: number
  name: string
  email: string
  role: User['role']
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function login(email: string, password: string) {
  const users = AppDataSource.getRepository(User)

  const user = await users.findOne({ where: { email: email.trim().toLowerCase() } })
  if (!user) {
    throw new AppError('Invalid email or password', 401)
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    throw new AppError('Invalid email or password', 401)
  }

  const token = signAuthToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  })

  return { token, user: toPublicUser(user) }
}

export async function getUserById(id: number): Promise<PublicUser> {
  const user = await AppDataSource.getRepository(User).findOne({ where: { id } })
  if (!user) {
    throw new AppError('User not found', 404)
  }
  return toPublicUser(user)
}
