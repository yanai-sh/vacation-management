import { describe, expect, it } from 'vitest'
import { validateLoginForm } from './formValidation'

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
