import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import { parseEchoInput, postEcho } from './echo'

function eventWithBody(body: string | null): CommonEvent {
  return {
    path: '/echo',
    method: 'POST',
    body,
    pathParameters: undefined,
    queryStringParameters: undefined,
    headers: { 'content-type': 'application/json' },
    version: 'commonEvent',
  }
}

test('parseEchoInput rejects missing body', () => {
  const result = parseEchoInput(eventWithBody(null))
  assert.ok(result instanceof Response)
  assert.equal((result as Response).statusCode, 400)
})

test('parseEchoInput rejects invalid JSON', () => {
  const result = parseEchoInput(eventWithBody('{'))
  assert.ok(result instanceof Response)
  assert.equal((result as Response).statusCode, 400)
})

test('parseEchoInput rejects empty message', () => {
  const result = parseEchoInput(eventWithBody(JSON.stringify({ message: '   ' })))
  assert.ok(result instanceof Response)
  assert.equal((result as Response).statusCode, 400)
})

test('postEcho returns the message', async () => {
  const result = await postEcho({ message: 'hello' }, eventWithBody(JSON.stringify({ message: 'hello' })))
  assert.deepEqual(result, { echo: 'hello' })
})
