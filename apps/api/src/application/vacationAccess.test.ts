import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { AppError } from './errors'
import type { AuthUser } from '../security/auth'
import { User } from '../persistence/entities/User'
import { VacationRequest } from '../persistence/entities/VacationRequest'

process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-32b'
process.env.POSTGRES_USER ??= 'vacation'
process.env.POSTGRES_PASSWORD ??= 'vacation'
process.env.POSTGRES_DB ??= 'vacation_management'

type Row = {
  id: number
  userId: number
  startDate: string
  endDate: string
  reason: string | null
  status: string
  comments: string | null
  createdAt: Date
  updatedAt: Date
}

type VacationApi = {
  createVacationRequest: (
    auth: AuthUser,
    input: { startDate: string; endDate: string; reason?: string | null },
  ) => Promise<{ userId: number; status: string }>
  listOwnVacationRequests: (auth: AuthUser) => Promise<unknown[]>
  approveVacationRequest: (auth: AuthUser, id: number) => Promise<{ status: string }>
  rejectVacationRequest: (auth: AuthUser, id: number, comment: string) => Promise<{ status: string; comments: string | null }>
  cancelOwnPendingRequest: (auth: AuthUser, id: number) => Promise<{ ok: boolean }>
  useRows: (rows: Row[]) => () => void
  whereSeen: () => unknown
}

let api: VacationApi

function person(role: 'requester' | 'validator', sub = 4): AuthUser {
  return { sub, role, email: `${role}@example.com`, name: role }
}

function pending(userId = 4): Row {
  return {
    id: 5,
    userId,
    startDate: '2099-06-01',
    endDate: '2099-06-05',
    reason: 'Trip',
    status: 'pending',
    comments: null,
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
  }
}

async function load(): Promise<VacationApi> {
  const db = await import('../persistence/data-source')
  const service = await import('./vacationService')
  const dataSource = db.default as unknown as {
    getRepository: (entity?: unknown) => unknown
    transaction: (run: (manager: Manager) => Promise<unknown>) => Promise<unknown>
  }
  const originalGet = dataSource.getRepository
  let rows: Row[] = []
  let lastWhere: unknown

  type Manager = {
    getRepository: (entity?: unknown) => {
      findOne: (opts: { where?: object }) => Promise<Row | null>
      save: (row: Row) => Promise<Row>
      remove: (row: Row) => Promise<Row>
    }
    create: (entity: unknown, data: Record<string, unknown>) => Record<string, unknown>
    save: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  }

  function findRow(where: object | undefined): Row | null {
    const query = (where ?? {}) as Record<string, unknown>
    if ('startDate' in query) return null
    return (
      rows.find((row) => {
        if (query.id !== undefined && query.id !== row.id) return false
        if (query.userId !== undefined && query.userId !== row.userId) return false
        return query.id !== undefined
      }) ?? null
    )
  }

  dataSource.transaction = async (run) => {
    const manager: Manager = {
      getRepository(entity) {
        if (entity === User) {
          return {
            findOne: async () => null,
            save: async (row) => row,
            remove: async (row) => row,
          }
        }
        return {
          findOne: async (opts) => findRow(opts.where),
          save: async (row) => row,
          remove: async (row) => {
            rows = rows.filter((item) => item.id !== row.id)
            return row
          },
        }
      },
      create(_entity, data) {
        return data
      },
      async save(data) {
        return {
          ...data,
          id: 9,
          createdAt: new Date('2099-06-01T00:00:00.000Z'),
          updatedAt: new Date('2099-06-01T00:00:00.000Z'),
        }
      },
    }
    return run(manager)
  }

  return {
    createVacationRequest: service.createVacationRequest,
    listOwnVacationRequests: service.listOwnVacationRequests,
    approveVacationRequest: service.approveVacationRequest,
    rejectVacationRequest: service.rejectVacationRequest,
    cancelOwnPendingRequest: service.cancelOwnPendingRequest,
    whereSeen() {
      return lastWhere
    },
    useRows(next) {
      rows = next
      dataSource.getRepository = ((entity?: unknown) => {
        if (entity === VacationRequest || entity === undefined) {
          return {
            find: async (opts: { where: unknown }) => {
              lastWhere = opts.where
              return rows
            },
          }
        }
        return originalGet(entity)
      }) as typeof dataSource.getRepository
      return () => {
        dataSource.getRepository = originalGet
        rows = []
      }
    },
  }
}

before(async () => {
  api = await load()
})

describe('vacation authorization', { concurrency: 1 }, () => {
  test('a validator cannot submit a request', async () => {
    await assert.rejects(() => api.createVacationRequest(person('validator'), dates()), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 403)
      return true
    })
  })

  test('a new request is stored for the caller and stays pending', async () => {
    const saved = await api.createVacationRequest(person('requester', 4), dates())
    assert.equal(saved.userId, 4)
    assert.equal(saved.status, 'pending')
  })

  test('a requester only lists their own requests', async () => {
    const restore = api.useRows([])
    try {
      const items = await api.listOwnVacationRequests(person('requester', 4))
      assert.deepEqual(items, [])
      assert.deepEqual(api.whereSeen(), { userId: 4 })
    } finally {
      restore()
    }
  })

  test('a validator cannot list a requester inbox', async () => {
    await assert.rejects(() => api.listOwnVacationRequests(person('validator')), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 403)
      return true
    })
  })

  test('a requester cannot approve', async () => {
    await assert.rejects(() => api.approveVacationRequest(person('requester'), 5), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 403)
      assert.equal(error.message, 'Only validators can approve or reject requests')
      return true
    })
  })

  test('a validator approves a pending request', async () => {
    api.useRows([pending(9)])
    const saved = await api.approveVacationRequest(person('validator', 2), 5)
    assert.equal(saved.status, 'approved')
  })

  test('a requester cannot reject', async () => {
    await assert.rejects(
      () => api.rejectVacationRequest(person('requester'), 5, 'No coverage'),
      (error: unknown) => {
        assert.ok(error instanceof AppError)
        assert.equal(error.statusCode, 403)
        return true
      },
    )
  })

  test('rejection still requires a comment', async () => {
    await assert.rejects(() => api.rejectVacationRequest(person('validator'), 5, '   '), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 400)
      return true
    })
  })

  test('a requester cannot cancel someone else’s request', async () => {
    api.useRows([pending(9)])
    await assert.rejects(() => api.cancelOwnPendingRequest(person('requester', 4), 5), (error: unknown) => {
      assert.ok(error instanceof AppError)
      assert.equal(error.statusCode, 404)
      assert.equal(error.message, 'Vacation request not found')
      return true
    })
  })

  test('a requester can cancel their own pending request', async () => {
    api.useRows([pending(4)])
    const result = await api.cancelOwnPendingRequest(person('requester', 4), 5)
    assert.deepEqual(result, { ok: true })
  })
})

function dates() {
  return { startDate: '2099-06-01', endDate: '2099-06-05', reason: 'Trip' }
}
