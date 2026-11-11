import { afterEach, describe, expect, it } from 'vitest'
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import apiClient from './client'

function authorizationOf(config: InternalAxiosRequestConfig) {
  const value = AxiosHeaders.from(config.headers).get('Authorization')
  return typeof value === 'string' ? value : undefined
}

describe('api client', () => {
  const original = apiClient.defaults.adapter

  afterEach(() => {
    apiClient.defaults.adapter = original
    localStorage.clear()
  })

  it('sends the stored token on the request', async () => {
    localStorage.setItem('vm_token', 'abc')
    let authorization: string | undefined
    apiClient.defaults.adapter = async (config) => {
      authorization = authorizationOf(config)
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await apiClient.get('/auth/me')
    expect(authorization).toBe('Bearer abc')
  })

  it('omits the Authorization header when no token is stored', async () => {
    let authorization: string | undefined
    apiClient.defaults.adapter = async (config) => {
      authorization = authorizationOf(config)
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }
    await apiClient.get('/auth/me')
    expect(authorization).toBeUndefined()
  })
})
