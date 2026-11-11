import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import jwt from 'jsonwebtoken'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import { AppError } from '../application/errors'
import { requireAuth, requireRole } from './auth'
import { signAuthToken, verifyAuthToken } from './jwt'
import { hashPassword, verifyPassword } from './password'

process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32b'

const secret = process.env.JWT_SECRET

function event(authorization?: string): CommonEvent {
  return {
    path: '/auth/me',
    method: 'GET',
    body: null,
    pathParameters: undefined,
    queryStringParameters: undefined,
    headers: authorization ? { authorization } : {},
    version: 'commonEvent',
  }
}

function bearer(role: 'requester' | 'validator', sub = 1) {
  return signAuthToken({
    sub,
    role,
    email: `${role}@example.com`,
    name: role,
  })
}

describe('password hashing', () => {
  test('stored passwords are hashes that only match the original', async () => {
    const hash = await hashPassword('Password123!')
    assert.notEqual(hash, 'Password123!')
    assert.equal(await verifyPassword('Password123!', hash), true)
    assert.equal(await verifyPassword('wrong-password', hash), false)
  })
})

describe('auth tokens', { concurrency: 1 }, () => {
  test('a signed token carries the user id and role', () => {
    const payload = verifyAuthToken(bearer('validator', 8))
    assert.equal(payload.sub, 8)
    assert.equal(payload.role, 'validator')
    assert.equal(payload.email, 'validator@example.com')
  })

  test('access tokens expire after eight hours', () => {
    const decoded = jwt.decode(bearer('requester')) as { exp: number; iat: number }
    assert.equal(decoded.exp - decoded.iat, 8 * 60 * 60)
  })

  test('an expired token is rejected', () => {
    const token = jwt.sign(
      { role: 'requester', email: 'alice@example.com', name: 'Alice' },
      secret,
      { algorithm: 'HS256', subject: '1', expiresIn: '-1s' },
    )
    assert.throws(
      () => verifyAuthToken(token),
      (error: unknown) => {
        assert.ok(error instanceof AppError)
        assert.equal(error.statusCode, 401)
        assert.equal(error.message, 'Invalid or expired token')
        return true
      },
    )
  })

  test('a token signed with another secret is rejected', () => {
    const token = jwt.sign(
      { role: 'validator', email: 'validator@example.com', name: 'Vera' },
      'other-secret-other-secret-other-32bx',
      { algorithm: 'HS256', subject: '1' },
    )
    assert.throws(() => verifyAuthToken(token), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 401)
      return true
    })
  })

  test('a tampered token is rejected', () => {
    const [header, payload, signature] = bearer('requester').split('.')
    const tampered = `${header}.${payload}.${signature!.slice(0, -2)}aa`
    assert.throws(() => verifyAuthToken(tampered), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 401)
      return true
    })
  })

  test('an unsigned token is rejected', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
      JSON.stringify({
        sub: '1',
        role: 'validator',
        email: 'validator@example.com',
        name: 'Vera',
      }),
    ).toString('base64url')
    assert.throws(() => verifyAuthToken(`${header}.${payload}.`), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 401)
      return true
    })
  })

  test('a token without a role is rejected', () => {
    const token = jwt.sign({ email: 'alice@example.com', name: 'Alice' }, secret, {
      algorithm: 'HS256',
      subject: '1',
    })
    assert.throws(() => verifyAuthToken(token), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 401)
      assert.equal(error.message, 'Invalid token payload')
      return true
    })
  })

  test('signing fails when JWT_SECRET is missing', () => {
    const previous = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    try {
      assert.throws(
        () =>
          signAuthToken({
            sub: 1,
            role: 'requester',
            email: 'alice@example.com',
            name: 'Alice',
          }),
        (error: unknown) => {
          assert.ok(error instanceof AppError)
          assert.equal(error.statusCode, 500)
          return true
        },
      )
    } finally {
      process.env.JWT_SECRET = previous
    }
  })
})

describe('request authentication', () => {
  test('a missing token is a 401', () => {
    assert.throws(() => requireAuth(event()), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 401)
      assert.equal(error.message, 'Authentication required')
      return true
    })
  })

  test('an empty bearer token is a 401', () => {
    assert.throws(() => requireAuth(event('Bearer   ')), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 401)
      return true
    })
  })

  test('the Authorization header is accepted in either case', () => {
    const token = bearer('requester', 3)
    const upper = event()
    upper.headers = { Authorization: `Bearer ${token}` }
    assert.equal(requireAuth(upper).sub, 3)
  })

  test('a requester cannot pass a validator check', () => {
    assert.throws(() => requireRole(event(`Bearer ${bearer('requester')}`), ['validator']), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 403)
      assert.equal(error.message, 'Forbidden')
      return true
    })
  })

  test('a validator passes a validator check', () => {
    const user = requireRole(event(`Bearer ${bearer('validator', 2)}`), ['validator'])
    assert.equal(user.role, 'validator')
    assert.equal(user.sub, 2)
  })
})
