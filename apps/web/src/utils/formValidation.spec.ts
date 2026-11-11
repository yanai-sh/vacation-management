import { CalendarDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import { validateLoginForm, validateRejectForm, validateVacationForm } from './formValidation'

describe('validateLoginForm', () => {
  it('requires email and password', () => {
    expect(validateLoginForm({})).toEqual([
      { name: 'email', message: 'Email is required' },
      { name: 'password', message: 'Password is required' },
    ])
  })

  it('rejects malformed email', () => {
    expect(validateLoginForm({ email: 'not-an-email', password: 'x' })).toEqual([
      { name: 'email', message: 'Enter a valid email address' },
    ])
  })
})

describe('validateRejectForm', () => {
  it('requires a non-empty comment', () => {
    expect(validateRejectForm({ comment: '   ' })).toEqual([
      { name: 'comment', message: 'A rejection comment is required' },
    ])
  })
})

describe('validateVacationForm', () => {
  const today = new CalendarDate(2026, 11, 10)

  it('requires both dates', () => {
    expect(validateVacationForm({}, today)).toEqual([
      { name: 'dates', message: 'Choose a start and end date' },
    ])
  })

  it('requires a last day once the first is chosen', () => {
    expect(validateVacationForm({ startDate: new CalendarDate(2026, 11, 20) }, today)).toEqual([
      { name: 'dates', message: 'Choose a last day' },
    ])
  })

  it('rejects a past start', () => {
    expect(
      validateVacationForm(
        {
          startDate: new CalendarDate(2026, 11, 9),
          endDate: new CalendarDate(2026, 11, 12),
        },
        today,
      ),
    ).toEqual([{ name: 'dates', message: 'Vacation requests in the past are not allowed' }])
  })

  it('rejects an end date that is not after the start date', () => {
    expect(
      validateVacationForm(
        {
          startDate: new CalendarDate(2026, 11, 20),
          endDate: new CalendarDate(2026, 11, 20),
        },
        today,
      ),
    ).toEqual([{ name: 'dates', message: 'End date must be after start date' }])

    expect(
      validateVacationForm(
        {
          startDate: new CalendarDate(2026, 11, 20),
          endDate: new CalendarDate(2026, 11, 19),
        },
        today,
      ),
    ).toEqual([{ name: 'dates', message: 'End date must be after start date' }])
  })

  it('accepts a valid range', () => {
    expect(
      validateVacationForm(
        {
          startDate: new CalendarDate(2026, 11, 20),
          endDate: new CalendarDate(2026, 11, 25),
        },
        today,
      ),
    ).toEqual([])
  })
})
