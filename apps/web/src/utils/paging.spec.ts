import { describe, expect, it } from 'vitest'
import { pageAfterEmpty } from './paging'

describe('pageAfterEmpty', () => {
  it('stays put when the page still has rows', () => {
    expect(pageAfterEmpty(2, 10, 11, 1)).toBeNull()
  })

  it('moves back to the last page that still has rows', () => {
    expect(pageAfterEmpty(3, 10, 11, 0)).toBe(2)
    expect(pageAfterEmpty(2, 10, 4, 0)).toBe(1)
  })

  it('does not loop when the last page is already empty', () => {
    expect(pageAfterEmpty(1, 10, 0, 0)).toBeNull()
    expect(pageAfterEmpty(2, 10, 15, 0)).toBeNull()
  })
})
