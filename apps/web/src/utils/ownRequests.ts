import type { VacationStatus } from '@/types'

export type StaySpan = {
  startDate: string
  endDate: string
  status: VacationStatus
}

function rangesOverlap(startDate: string, endDate: string, other: StaySpan): boolean {
  return startDate <= other.endDate && endDate >= other.startDate
}

/** Pending and approved ranges block a new request. Rejected ones do not. */
export function findBlockingRequest<T extends StaySpan>(
  startDate: string,
  endDate: string,
  requests: T[],
): T | undefined {
  return requests.find(
    (request) =>
      (request.status === 'pending' || request.status === 'approved') &&
      rangesOverlap(startDate, endDate, request),
  )
}

/** Stays that have not ended come first, soonest first. Finished stays follow, latest first. */
export function groupOwnRequests<T extends { startDate: string; endDate: string }>(
  items: T[],
  today: string,
): { upcoming: T[]; earlier: T[] } {
  const upcoming: T[] = []
  const earlier: T[] = []
  for (const item of items) {
    if (item.endDate >= today) upcoming.push(item)
    else earlier.push(item)
  }
  upcoming.sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate),
  )
  earlier.sort(
    (a, b) => b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate),
  )
  return { upcoming, earlier }
}
