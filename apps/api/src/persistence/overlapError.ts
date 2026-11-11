export type ConstraintFailure = { statusCode: number; error: string }

const OVERLAP = {
  statusCode: 409,
  error: 'Vacation request overlaps an existing pending or approved request',
} as const

function postgresError(err: unknown): { code: string; constraint: string; where: string } {
  if (!err || typeof err !== 'object') {
    return { code: '', constraint: '', where: '' }
  }
  const error = err as {
    code?: unknown
    constraint?: unknown
    where?: unknown
    driverError?: { code?: unknown; constraint?: unknown; where?: unknown }
  }
  const code = error.driverError?.code ?? error.code
  const constraint = error.driverError?.constraint ?? error.constraint
  return {
    code: typeof code === 'string' ? code : '',
    constraint: typeof constraint === 'string' ? constraint : '',
    where: String(error.driverError?.where ?? error.where ?? ''),
  }
}

/** Map a vacation-rule constraint failure to its API error. Other errors return undefined. */
export function vacationConstraintResponse(err: unknown): ConstraintFailure | undefined {
  const pg = postgresError(err)
  if (pg.code === '23P01' && pg.constraint === 'vacation_requests_no_overlap') return OVERLAP
  // Two inserts can deadlock while Postgres checks the same exclusion constraint.
  if (
    pg.code === '40P01' &&
    pg.where.includes('exclusion constraint') &&
    pg.where.includes('vacation_requests')
  ) {
    return OVERLAP
  }
  if (pg.code === '23514' && pg.constraint === 'vacation_requests_dates_check') {
    return { statusCode: 400, error: 'End date must be after start date' }
  }
  if (pg.code === '23514' && pg.constraint === 'vacation_requests_reject_comment_check') {
    return { statusCode: 400, error: 'A rejection comment is required' }
  }
  return undefined
}
