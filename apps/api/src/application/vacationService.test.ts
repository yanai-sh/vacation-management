import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AppError } from './errors'
import {
  assertCalendarDate,
  assertDateOrder,
  assertNotInPast,
  assertRejectComment,
  localToday,
} from './dateRules'

test('assertCalendarDate rejects impossible days and non-dates', () => {
  for (const value of ['2026-02-31', 'not-a-date', '2026-13-01']) {
    assert.throws(() => assertCalendarDate(value), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 400)
      return true
    })
  }
})

test('assertCalendarDate accepts a real day', () => {
  assert.doesNotThrow(() => assertCalendarDate('2026-02-28'))
})

test('assertDateOrder rejects a single day', () => {
  assert.throws(() => assertDateOrder('2026-12-01', '2026-12-01'), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 400)
    assert.equal(error.message, 'End date must be after start date')
    return true
  })
})

test('assertDateOrder rejects a last day before the first', () => {
  assert.throws(() => assertDateOrder('2026-12-05', '2026-12-01'), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 400)
    assert.equal(error.message, 'End date must be after start date')
    return true
  })
})

test('assertDateOrder accepts ordered dates', () => {
  assert.doesNotThrow(() => assertDateOrder('2026-12-01', '2026-12-05'))
})

test('assertNotInPast rejects past starts', () => {
  assert.throws(() => assertNotInPast('2020-01-01', '2026-11-10'), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 400)
    return true
  })
})

test('localToday uses calendar day in the given time zone, not UTC', () => {
  const nearUtcMidnight = new Date('2026-11-10T23:30:00.000Z')
  assert.equal(localToday(nearUtcMidnight, 'Asia/Jerusalem'), '2026-11-11')
  assert.equal(localToday(nearUtcMidnight, 'UTC'), '2026-11-10')
})

test('assertRejectComment requires non-empty comment', () => {
  assert.throws(() => assertRejectComment('   '), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 400)
    return true
  })
})
