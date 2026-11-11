/// <reference path="../types/temporal.d.ts" />
import { AppError } from './errors'

/** Civil YYYY-MM-DD in `timeZone` (default: host zone). */
export function localToday(
  now: Date | Temporal.Instant = Temporal.Now.instant(),
  timeZone = Temporal.Now.timeZoneId(),
): string {
  const instant = now instanceof Date ? Temporal.Instant.from(now.toISOString()) : now
  return instant.toZonedDateTimeISO(timeZone).toPlainDate().toString()
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Reject values Postgres would refuse, including 2026-02-31 and non-dates. */
export function assertCalendarDate(value: string) {
  const match = CALENDAR_DATE.exec(value)
  if (!match) {
    throw new AppError('Start and end dates must be real calendar dates (YYYY-MM-DD)', 400)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    throw new AppError('Start and end dates must be real calendar dates (YYYY-MM-DD)', 400)
  }
}

export function assertDateOrder(startDate: string, endDate: string) {
  if (endDate <= startDate) {
    throw new AppError('End date must be after start date', 400)
  }
}

export function assertNotInPast(startDate: string, today = localToday()) {
  if (startDate < today) {
    throw new AppError('Vacation requests in the past are not allowed', 400)
  }
}

export function assertRejectComment(comment: string) {
  if (!comment.trim()) {
    throw new AppError('A rejection comment is required', 400)
  }
}
