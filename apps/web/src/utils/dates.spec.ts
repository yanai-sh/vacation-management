import { CalendarDate } from '@internationalized/date'
import { describe, expect, it } from 'vitest'
import { formatStay, inclusiveDayCount, localToday, normalizeStayRange, toIsoDate } from './dates'

describe('date helpers', () => {
  it('uses calendar day in the given time zone, not UTC', () => {
    const nearUtcMidnight = new Date('2026-11-10T23:30:00.000Z')
    expect(toIsoDate(localToday(nearUtcMidnight, 'Asia/Jerusalem'))).toBe('2026-11-11')
    expect(toIsoDate(localToday(nearUtcMidnight, 'UTC'))).toBe('2026-11-10')
  })

  it('formats CalendarDate as YYYY-MM-DD', () => {
    expect(toIsoDate(new CalendarDate(2026, 11, 10))).toBe('2026-11-10')
  })

  it('keeps a one-day stay and swaps a backwards pair', () => {
    const start = new CalendarDate(2026, 11, 12)
    const end = new CalendarDate(2026, 11, 17)
    expect(normalizeStayRange(start, end)).toEqual({ start, end })
    expect(normalizeStayRange(start, start)).toEqual({ start, end: start })
    expect(normalizeStayRange(start, new CalendarDate(2026, 11, 11))).toEqual({
      start: new CalendarDate(2026, 11, 11),
      end: start,
    })
    expect(normalizeStayRange(undefined, undefined)).toEqual({
      start: undefined,
      end: undefined,
    })
  })

  it('counts inclusive calendar days and formats a stay', () => {
    expect(inclusiveDayCount('2026-11-12', '2026-11-17')).toBe(6)
    expect(formatStay('2026-11-12', '2026-11-17')).toEqual({
      range: 'Nov 12 – Nov 17, 2026',
      days: 6,
    })
    expect(formatStay('2026-12-28', '2027-01-02')).toEqual({
      range: 'Dec 28, 2026 – Jan 2, 2027',
      days: 6,
    })
    expect(formatStay('2026-11-12', '2026-11-12')).toEqual({
      range: 'Nov 12, 2026',
      days: 1,
    })
    expect(inclusiveDayCount('2026-02-31', '2026-03-02')).toBeNull()
  })
})
