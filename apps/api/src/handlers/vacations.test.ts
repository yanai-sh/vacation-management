import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'

process.env.POSTGRES_USER ??= 'vacation'
process.env.POSTGRES_PASSWORD ??= 'vacation'
process.env.POSTGRES_DB ??= 'vacation_management'
process.env.JWT_SECRET ??= 'test-secret-must-be-long-enough-32b'

function event(partial: Partial<CommonEvent>): CommonEvent {
  return {
    path: '/vacation-requests',
    method: 'GET',
    body: null,
    pathParameters: undefined,
    queryStringParameters: undefined,
    headers: {},
    version: 'commonEvent',
    ...partial,
  }
}

async function handlers() {
  return import('./vacations')
}

function errorBody(result: unknown): { statusCode: number; error: string } {
  assert.ok(result instanceof Response)
  const body = JSON.parse(result.body) as { error?: string }
  assert.equal(typeof body.error, 'string')
  return { statusCode: result.statusCode, error: body.error as string }
}

test('validator list defaults page and pageSize', async () => {
  const { parseValidatorVacationRequestsInput } = await handlers()
  const result = parseValidatorVacationRequestsInput(event({}))
  assert.deepEqual(result, { status: undefined, userId: undefined, page: 1, pageSize: 10 })
})

test('validator list accepts filters and clamps pageSize to 50', async () => {
  const { parseValidatorVacationRequestsInput } = await handlers()
  const result = parseValidatorVacationRequestsInput(
    event({
      queryStringParameters: { status: 'approved', userId: '4', page: '2', pageSize: '500' },
    }),
  )
  assert.deepEqual(result, { status: 'approved', userId: 4, page: 2, pageSize: 50 })
})

test('validator list rejects a non-integer page', async () => {
  const { parseValidatorVacationRequestsInput } = await handlers()
  for (const page of ['0', '1.5', 'foo', '-1']) {
    const result = parseValidatorVacationRequestsInput(event({ queryStringParameters: { page } }))
    const body = errorBody(result)
    assert.equal(body.statusCode, 400, page)
    assert.match(body.error, /page/)
  }
})

test('validator list rejects a non-integer pageSize', async () => {
  const { parseValidatorVacationRequestsInput } = await handlers()
  for (const pageSize of ['0', '-4', '10.5', 'many']) {
    const result = parseValidatorVacationRequestsInput(
      event({ queryStringParameters: { pageSize } }),
    )
    const body = errorBody(result)
    assert.equal(body.statusCode, 400, pageSize)
    assert.match(body.error, /pageSize/)
  }
})

test('validator list rejects an unknown status and a bad userId', async () => {
  const { parseValidatorVacationRequestsInput } = await handlers()
  const status = errorBody(
    parseValidatorVacationRequestsInput(event({ queryStringParameters: { status: 'Pending' } })),
  )
  assert.equal(status.statusCode, 400)

  for (const userId of ['1.5', '1e2', '0']) {
    const body = errorBody(
      parseValidatorVacationRequestsInput(event({ queryStringParameters: { userId } })),
    )
    assert.equal(body.statusCode, 400, userId)
  }
})

test('create input keeps only dates and reason', async () => {
  const { parseCreateVacationInput } = await handlers()
  const result = parseCreateVacationInput(
    event({
      method: 'POST',
      body: JSON.stringify({
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        reason: 'Trip',
        userId: 99,
        status: 'approved',
      }),
    }),
  )
  assert.deepEqual(result, {
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    reason: 'Trip',
  })
})

test('create input rejects a missing date', async () => {
  const { parseCreateVacationInput } = await handlers()
  const body = errorBody(
    parseCreateVacationInput(event({ method: 'POST', body: JSON.stringify({ startDate: '2026-12-01' }) })),
  )
  assert.equal(body.statusCode, 400)
})

test('request id must be a positive integer', async () => {
  const { parseVacationIdInput } = await handlers()
  for (const id of ['0', '1.5', '1e2', 'abc']) {
    const body = errorBody(
      parseVacationIdInput(event({ method: 'DELETE', pathParameters: { id } })),
    )
    assert.equal(body.statusCode, 400, id)
  }
  assert.deepEqual(parseVacationIdInput(event({ pathParameters: { id: '12' } })), { id: 12 })
})

test('reject input requires a comment string', async () => {
  const { parseRejectVacationInput } = await handlers()
  const missing = errorBody(
    parseRejectVacationInput(
      event({ method: 'POST', pathParameters: { id: '3' }, body: JSON.stringify({}) }),
    ),
  )
  assert.equal(missing.statusCode, 400)

  assert.deepEqual(
    parseRejectVacationInput(
      event({
        method: 'POST',
        pathParameters: { id: '3' },
        body: JSON.stringify({ comment: 'Dates conflict' }),
      }),
    ),
    { id: 3, comment: 'Dates conflict' },
  )
})
