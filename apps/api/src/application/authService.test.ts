import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import { AppError } from './errors'
import { hashPassword } from '../security/password'
import { verifyAuthToken } from '../security/jwt'

process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32b'
process.env.POSTGRES_USER ??= 'vacation'
process.env.POSTGRES_PASSWORD ??= 'vacation'
process.env.POSTGRES_DB ??= 'vacation_management'

const PASSWORD = 'Password123!'

type StoredUser = {
  id: number
  name: string
  email: string
  role: 'requester' | 'validator'
  passwordHash: string
}

type AuthModules = {
  login: (email: string, password: string) => Promise<{ token: string; user: { role: string } }>
  getUserById: (id: number) => Promise<{ id: number; name: string; email: string; role: string }>
  parseLoginInput: (event: CommonEvent) => unknown
  postLogin: (input: unknown, event: CommonEvent) => Promise<unknown>
  getMe: (input: unknown, event: CommonEvent) => Promise<unknown>
  stubRepository: (findOne: (opts: { where?: { email?: string; id?: number } }) => Promise<StoredUser | null>) => () => void
}

let api: AuthModules
let passwordHash = ''

function loginEvent(body: unknown): CommonEvent {
  return {
    path: '/auth/login',
    method: 'POST',
    body: body === null ? null : JSON.stringify(body),
    pathParameters: undefined,
    queryStringParameters: undefined,
    headers: { 'content-type': 'application/json' },
    version: 'commonEvent',
  }
}

function meEvent(token: string): CommonEvent {
  return {
    path: '/auth/me',
    method: 'GET',
    body: null,
    pathParameters: undefined,
    queryStringParameters: undefined,
    headers: { authorization: `Bearer ${token}` },
    version: 'commonEvent',
  }
}

async function load(): Promise<AuthModules> {
  const db = await import('../persistence/data-source')
  const authService = await import('./authService')
  const handlers = await import('../handlers/auth')
  const dataSource = db.default as unknown as {
    getRepository: (entity?: unknown) => unknown
  }
  const original = dataSource.getRepository
  return {
    login: authService.login,
    getUserById: authService.getUserById,
    parseLoginInput: handlers.parseLoginInput,
    postLogin: handlers.postLogin,
    getMe: handlers.getMe,
    stubRepository(findOne) {
      dataSource.getRepository = () => ({ findOne })
      return () => {
        dataSource.getRepository = original
      }
    },
  }
}

before(async () => {
  passwordHash = await hashPassword(PASSWORD)
  api = await load()
})

function requester(): StoredUser {
  return {
    id: 1,
    name: 'Alice Requester',
    email: 'alice@example.com',
    role: 'requester',
    passwordHash,
  }
}

describe('login', { concurrency: 1 }, () => {
  test('parseLoginInput drops a client-supplied role', () => {
    const parsed = api.parseLoginInput(
      loginEvent({
        email: '  Alice@Example.com  ',
        password: PASSWORD,
        role: 'validator',
      }),
    )
    assert.deepEqual(parsed, { email: 'Alice@Example.com', password: PASSWORD })
  })

  test('parseLoginInput rejects a missing password', () => {
    const parsed = api.parseLoginInput(loginEvent({ email: 'alice@example.com' }))
    assert.ok(parsed instanceof Response)
    assert.equal(parsed.statusCode, 400)
  })

  test('unknown email and a wrong password return the same error', async () => {
    const restore = api.stubRepository(async (opts) => {
      if (opts.where?.email === 'alice@example.com') return requester()
      return null
    })
    try {
      const missing = await rejectedLogin('nobody@example.com', PASSWORD)
      const wrong = await rejectedLogin('alice@example.com', 'not-the-password')
      assert.equal(missing.statusCode, 401)
      assert.equal(wrong.statusCode, 401)
      assert.equal(missing.message, 'Invalid email or password')
      assert.equal(wrong.message, missing.message)
    } finally {
      restore()
    }
  })

  test('login looks up the trimmed lowercase email', async () => {
    let seen: unknown
    const restore = api.stubRepository(async (opts) => {
      seen = opts
      return null
    })
    try {
      await assert.rejects(() => api.login('  Alice@Example.com ', PASSWORD))
      assert.deepEqual(seen, { where: { email: 'alice@example.com' } })
    } finally {
      restore()
    }
  })

  test('a client-supplied role does not change the signed role', async () => {
    const restore = api.stubRepository(async () => requester())
    try {
      const result = (await api.postLogin(
        { email: 'alice@example.com', password: PASSWORD, role: 'validator' },
        loginEvent(null),
      )) as { token: string; user: { role: string; passwordHash?: string } }
      assert.equal(result.user.role, 'requester')
      assert.equal(result.user.passwordHash, undefined)
      assert.equal(verifyAuthToken(result.token).role, 'requester')
      assert.equal(verifyAuthToken(result.token).sub, 1)
    } finally {
      restore()
    }
  })

  test('getMe returns the stored user for the token subject', async () => {
    const { signAuthToken } = await import('../security/jwt')
    const token = signAuthToken({
      sub: 2,
      role: 'requester',
      email: 'old@example.com',
      name: 'Old',
    })
    const restore = api.stubRepository(async (opts) => {
      if (opts.where?.id !== 2) return null
      return {
        id: 2,
        name: 'Vera Validator',
        email: 'validator@example.com',
        role: 'validator',
        passwordHash,
      }
    })
    try {
      const me = await api.getMe({}, meEvent(token))
      assert.deepEqual(me, {
        id: 2,
        name: 'Vera Validator',
        email: 'validator@example.com',
        role: 'validator',
      })
    } finally {
      restore()
    }
  })
})

async function rejectedLogin(email: string, password: string) {
  try {
    await api.login(email, password)
  } catch (error) {
    assert.ok(error instanceof AppError)
    return error
  }
  assert.fail('login should have failed')
}
