import type { FormError } from '@nuxt/ui'

export type LoginFormState = {
  email?: string
  password?: string
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
