import { describe, expect, it } from 'vitest'
import { findBlockingRequest, groupOwnRequests, type StaySpan } from './ownRequests'

const stays: StaySpan[] = [
  { startDate: '2026-11-12', endDate: '2026-11-17', status: 'approved' },
  { startDate: '2026-12-01', endDate: '2026-12-03', status: 'pending' },
  { startDate: '2026-11-20', endDate: '2026-11-21', status: 'rejected' },
]

describe('findBlockingRequest', () => {
  it('matches a pending or approved range that shares a day', () => {
    expect(findBlockingRequest('2026-11-17', '2026-11-19', stays)?.status).toBe('approved')
    expect(findBlockingRequest('2026-12-03', '2026-12-04', stays)?.status).toBe('pending')
  })

  it('ignores rejected requests and ranges that only touch at the boundary', () => {
    expect(findBlockingRequest('2026-11-20', '2026-11-22', stays)).toBeUndefined()
    expect(findBlockingRequest('2026-11-18', '2026-11-19', stays)).toBeUndefined()
  })
})

describe('groupOwnRequests', () => {
  it('puts stays that have not ended first, soonest first', () => {
    const items = [
      { startDate: '2026-10-01', endDate: '2026-10-03' },
      { startDate: '2026-11-20', endDate: '2026-11-22' },
      { startDate: '2026-11-01', endDate: '2026-11-05' },
      { startDate: '2026-11-11', endDate: '2026-11-11' },
      { startDate: '2026-12-01', endDate: '2026-12-05' },
    ]
    expect(groupOwnRequests(items, '2026-11-11')).toEqual({
      upcoming: [
        { startDate: '2026-11-11', endDate: '2026-11-11' },
        { startDate: '2026-11-20', endDate: '2026-11-22' },
        { startDate: '2026-12-01', endDate: '2026-12-05' },
      ],
      earlier: [
        { startDate: '2026-11-01', endDate: '2026-11-05' },
        { startDate: '2026-10-01', endDate: '2026-10-03' },
      ],
    })
  })
})
