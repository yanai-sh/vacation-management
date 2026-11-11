import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AppError } from './errors'
import {
  assertCalendarDate,
  assertDateOrder,
  assertNotInPast,
  assertPendingStatus,
  assertRejectComment,
  assertValidatorRole,
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

test('assertNotInPast allows today and a later start', () => {
  assert.doesNotThrow(() => assertNotInPast('2026-11-10', '2026-11-10'))
  assert.doesNotThrow(() => assertNotInPast('2026-11-11', '2026-11-10'))
})

test('assertPendingStatus blocks an approved request', () => {
  assert.throws(() => assertPendingStatus('approved', 'rejected'), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 409)
    assert.equal(error.message, 'Approved requests cannot be modified')
    return true
  })
})

test('assertPendingStatus blocks a request that is not pending', () => {
  assert.throws(() => assertPendingStatus('rejected', 'approved'), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 409)
    assert.equal(error.message, 'Only pending requests can be approved')
    return true
  })
})

test('assertPendingStatus allows a pending request', () => {
  assert.doesNotThrow(() => assertPendingStatus('pending', 'cancelled'))
})

test('assertValidatorRole rejects anyone who is not a validator', () => {
  assert.throws(() => assertValidatorRole('requester'), (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 403)
    assert.equal(error.message, 'Only validators can approve or reject requests')
    return true
  })
})

test('assertValidatorRole allows a validator', () => {
  assert.doesNotThrow(() => assertValidatorRole('validator'))
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
    assert.equal(error.message, 'A rejection comment is required')
    return true
  })
  assert.doesNotThrow(() => assertRejectComment('Dates conflict with a release'))
})
