import assert from 'node:assert/strict'
import { test } from 'node:test'
import { vacationConstraintResponse } from './overlapError'

const overlap = {
  statusCode: 409,
  error: 'Vacation request overlaps an existing pending or approved request',
}

test('vacationConstraintResponse maps an overlap exclusion failure', () => {
  assert.deepEqual(
    vacationConstraintResponse({
      code: '23P01',
      constraint: 'vacation_requests_no_overlap',
    }),
    overlap,
  )
  assert.deepEqual(
    vacationConstraintResponse({
      driverError: { code: '23P01', constraint: 'vacation_requests_no_overlap' },
    }),
    overlap,
  )
})

test('vacationConstraintResponse maps an exclusion-constraint deadlock', () => {
  assert.deepEqual(
    vacationConstraintResponse({
      code: '40P01',
      where: 'while checking exclusion constraint on vacation_requests',
    }),
    overlap,
  )
})

test('vacationConstraintResponse maps date and rejection-comment checks', () => {
  assert.deepEqual(
    vacationConstraintResponse({
      code: '23514',
      constraint: 'vacation_requests_dates_check',
    }),
    { statusCode: 400, error: 'End date must be after start date' },
  )
  assert.deepEqual(
    vacationConstraintResponse({
      code: '23514',
      constraint: 'vacation_requests_reject_comment_check',
    }),
    { statusCode: 400, error: 'A rejection comment is required' },
  )
})

test('vacationConstraintResponse ignores unrelated database errors', () => {
  assert.equal(vacationConstraintResponse({ code: '23514', constraint: 'other' }), undefined)
  assert.equal(vacationConstraintResponse(new Error('nope')), undefined)
})
