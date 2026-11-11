import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import jwt from 'jsonwebtoken'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import { AppError } from '../application/errors'
import { signAuthToken } from '../security/jwt'

process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32b'
process.env.POSTGRES_USER ??= 'vacation'
process.env.POSTGRES_PASSWORD ??= 'vacation'
process.env.POSTGRES_DB ??= 'vacation_management'

type Vacations = typeof import('./vacations')
type AuthHandlers = typeof import('./auth')

let vacations: Vacations
let authHandlers: AuthHandlers

function event(authorization?: string): CommonEvent {
  return {
    path: '/vacation-requests',
    method: 'GET',
    body: null,
    pathParameters: { id: '5' },
    queryStringParameters: undefined,
    headers: authorization ? { authorization } : {},
    version: 'commonEvent',
  }
}

function bearer(role: 'requester' | 'validator') {
  const token = signAuthToken({
    sub: 1,
    role,
    email: `${role}@example.com`,
    name: role,
  })
  return event(`Bearer ${token}`)
}

async function expectStatus(run: () => Promise<unknown>, status: number, message?: string) {
  await assert.rejects(run, (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, status)
    if (message) assert.equal(error.message, message)
    return true
  })
}

before(async () => {
  vacations = await import('./vacations')
  authHandlers = await import('./auth')
})

describe('protected routes', () => {
  test('getMe rejects a missing token', async () => {
    await expectStatus(() => authHandlers.getMe({}, event()), 401, 'Authentication required')
  })

  test('getMe rejects an expired token', async () => {
    const token = jwt.sign(
      { role: 'requester', email: 'alice@example.com', name: 'Alice' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', subject: '1', expiresIn: '-1s' },
    )
    await expectStatus(() => authHandlers.getMe({}, event(`Bearer ${token}`)), 401, 'Invalid or expired token')
  })

  test('a requester cannot open validator routes', async () => {
    const caller = bearer('requester')
    await expectStatus(() => vacations.getValidatorVacationRequests({}, caller), 403, 'Forbidden')
    await expectStatus(() => vacations.postApproveVacationRequest({ id: 5 }, caller), 403, 'Forbidden')
    await expectStatus(() => vacations.postRejectVacationRequest({ id: 5, comment: 'No' }, caller), 403, 'Forbidden')
    await expectStatus(() => vacations.getRequesterUsers({}, caller), 403, 'Forbidden')
  })

  test('a validator cannot use requester routes', async () => {
    const caller = bearer('validator')
    await expectStatus(() => vacations.getOwnVacationRequests({}, caller), 403, 'Forbidden')
    await expectStatus(
      () => vacations.postVacationRequest({ startDate: '2099-06-01', endDate: '2099-06-05' }, caller),
      403,
      'Forbidden',
    )
    await expectStatus(() => vacations.deleteOwnVacationRequest({ id: 5 }, caller), 403, 'Forbidden')
  })

  test('vacation routes reject a missing token', async () => {
    const caller = event()
    await expectStatus(() => vacations.getOwnVacationRequests({}, caller), 401)
    await expectStatus(() => vacations.postVacationRequest({}, caller), 401)
    await expectStatus(() => vacations.deleteOwnVacationRequest({ id: 5 }, caller), 401)
    await expectStatus(() => vacations.getValidatorVacationRequests({}, caller), 401)
    await expectStatus(() => vacations.postApproveVacationRequest({ id: 5 }, caller), 401)
    await expectStatus(() => vacations.postRejectVacationRequest({ id: 5, comment: 'No' }, caller), 401)
    await expectStatus(() => vacations.getRequesterUsers({}, caller), 401)
    await expectStatus(() => vacations.getTeamVacationRequests({}, caller), 401)
  })
})
