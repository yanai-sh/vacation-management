import type { CalendarDate } from '@internationalized/date'
import type { FormError } from '@nuxt/ui'

export type LoginFormState = {
  email?: string
  password?: string
}

export type VacationFormState = {
  startDate?: CalendarDate
  endDate?: CalendarDate
  reason?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLoginForm(state: Partial<LoginFormState>): FormError[] {
  const errors: FormError[] = []
  const email = state.email?.trim() ?? ''

  if (!email) {
    errors.push({ name: 'email', message: 'Email is required' })
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push({ name: 'email', message: 'Enter a valid email address' })
  }

  if (!state.password) {
    errors.push({ name: 'password', message: 'Password is required' })
  }

  return errors
}

export function validateVacationForm(
  state: Partial<VacationFormState>,
  today: CalendarDate,
): FormError[] {
  const errors: FormError[] = []

  if (!state.startDate) {
    errors.push({ name: 'dates', message: 'Choose a start and end date' })
  } else if (state.startDate.compare(today) < 0) {
    errors.push({ name: 'dates', message: 'Vacation requests in the past are not allowed' })
  }

  if (state.startDate && !state.endDate) {
    errors.push({ name: 'dates', message: 'Choose a last day' })
  } else if (state.startDate && state.endDate && state.endDate.compare(state.startDate) <= 0) {
    errors.push({ name: 'dates', message: 'End date must be after start date' })
  }

  return errors
}
