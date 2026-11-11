import {
  fromDate,
  getLocalTimeZone,
  toCalendarDate,
  type CalendarDate,
} from '@internationalized/date'

/** Civil calendar date in `timeZone` (default: browser zone). */
export function localToday(now = new Date(), timeZone = getLocalTimeZone()): CalendarDate {
  return toCalendarDate(fromDate(now, timeZone))
}

export function toIsoDate(date: CalendarDate): string {
  return date.toString()
}

/** Order a picked range. A backwards pair is swapped. */
export function normalizeStayRange(
  start?: CalendarDate,
  end?: CalendarDate,
): { start?: CalendarDate; end?: CalendarDate } {
  if (!start || !end || end.compare(start) >= 0) return { start, end }
  return { start: end, end: start }
}

const monthDay = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

const monthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function utcDay(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = Date.UTC(year, month - 1, day)
  const check = new Date(utc)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return utc
}

/** Inclusive civil-day count. `2026-11-12` through `2026-11-17` is 6. */
export function inclusiveDayCount(startDate: string, endDate: string): number | null {
  const start = utcDay(startDate)
  const end = utcDay(endDate)
  if (start == null || end == null || end < start) return null
  return Math.round((end - start) / 86_400_000) + 1
}

export function formatStay(
  startDate: string,
  endDate: string,
): { range: string; days: number | null } {
  const start = utcDay(startDate)
  const end = utcDay(endDate)
  const days = inclusiveDayCount(startDate, endDate)
  if (start == null || end == null) {
    return { range: `${startDate} – ${endDate}`, days }
  }
  const startDateObj = new Date(start)
  const endDateObj = new Date(end)
  if (start === end) return { range: monthDayYear.format(startDateObj), days }
  const sameYear = startDateObj.getUTCFullYear() === endDateObj.getUTCFullYear()
  const startLabel = (sameYear ? monthDay : monthDayYear).format(startDateObj)
  return { range: `${startLabel} – ${monthDayYear.format(endDateObj)}`, days }
}
