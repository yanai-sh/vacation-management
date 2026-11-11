import { Response } from 'commoneventframework'
import { getUserById, login } from '../application/authService'
import { requireAuth } from '../security/auth'
import { parseJsonBody } from './parseBody'
import type { HandlerFn, InputParserFn } from './types'

export const parseLoginInput: InputParserFn = (event) => {
  const parsed = parseJsonBody(event)
  if (parsed instanceof Response) {
    return parsed
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { email?: unknown }).email !== 'string' ||
    typeof (parsed as { password?: unknown }).password !== 'string'
  ) {
    return new Response(400, { error: 'Email and password are required' })
  }

  const email = (parsed as { email: string }).email.trim()
  const password = (parsed as { password: string }).password
  if (!email || !password) {
    return new Response(400, { error: 'Email and password are required' })
  }

  return { email, password }
}

export const postLogin: HandlerFn = async (input) => {
  const { email, password } = input as { email: string; password: string }
  return login(email, password)
}

export const getMe: HandlerFn = async (_input, event) => {
  const auth = requireAuth(event)
  return getUserById(auth.sub)
}
