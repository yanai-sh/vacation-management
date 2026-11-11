import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import {
  approveVacationRequest,
  cancelOwnPendingRequest,
  createVacationRequest,
  listOwnVacationRequests,
  listTeamVacationRequests,
  listUsersForFilters,
  listValidatorVacationRequests,
  rejectVacationRequest,
} from '../application/vacationService'
import type { VacationStatus } from '../domain'
import { requireAuth, requireRole } from '../security/auth'
import { parseJsonBody } from './parseBody'
import type { HandlerFn, InputParserFn } from './types'

const POSITIVE_INT = /^[1-9]\d*$/

function parsePositiveInt(raw: string, error: string): number | Response {
  if (!POSITIVE_INT.test(raw)) {
    return new Response(400, { error })
  }
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) {
    return new Response(400, { error })
  }
  return value
}

function parseId(event: CommonEvent): number | Response {
  const raw = event.pathParameters?.id
  if (!raw) {
    return new Response(400, { error: 'Invalid request id' })
  }
  return parsePositiveInt(raw, 'Invalid request id')
}

export const parseCreateVacationInput: InputParserFn = (event) => {
  const parsed = parseJsonBody(event)
  if (parsed instanceof Response) {
    return parsed
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { startDate?: unknown }).startDate !== 'string' ||
    typeof (parsed as { endDate?: unknown }).endDate !== 'string'
  ) {
    return new Response(400, { error: 'startDate and endDate are required (YYYY-MM-DD)' })
  }

  const reason = (parsed as { reason?: unknown }).reason
  return {
    startDate: (parsed as { startDate: string }).startDate,
    endDate: (parsed as { endDate: string }).endDate,
    reason: typeof reason === 'string' ? reason : null,
  }
}

export const postVacationRequest: HandlerFn = async (input, event) => {
  const auth = requireRole(event, ['requester'])
  const created = await createVacationRequest(
    auth,
    input as { startDate: string; endDate: string; reason?: string | null },
  )
  return new Response(201, created)
}

export const getOwnVacationRequests: HandlerFn = async (_input, event) => {
  const auth = requireRole(event, ['requester'])
  const items = await listOwnVacationRequests(auth)
  return { items }
}

export const parseVacationIdInput: InputParserFn = (event) => {
  const id = parseId(event)
  if (id instanceof Response) {
    return id
  }
  return { id }
}

export const deleteOwnVacationRequest: HandlerFn = async (input, event) => {
  const auth = requireRole(event, ['requester'])
  return cancelOwnPendingRequest(auth, (input as { id: number }).id)
}

const VALID_STATUSES: readonly VacationStatus[] = ['pending', 'approved', 'rejected']

export const parseValidatorVacationRequestsInput: InputParserFn = (event) => {
  const statusRaw = event.queryStringParameters?.status
  const userIdRaw = event.queryStringParameters?.userId
  const pageRaw = event.queryStringParameters?.page
  const pageSizeRaw = event.queryStringParameters?.pageSize
  const page =
    pageRaw === undefined || pageRaw === ''
      ? 1
      : parsePositiveInt(pageRaw, 'page must be a positive integer')
  if (page instanceof Response) {
    return page
  }
  const parsedPageSize =
    pageSizeRaw === undefined || pageSizeRaw === ''
      ? 10
      : parsePositiveInt(pageSizeRaw, 'pageSize must be a positive integer')
  if (parsedPageSize instanceof Response) {
    return parsedPageSize
  }
  const pageSize = Math.min(50, parsedPageSize)

  let status: VacationStatus | undefined
  if (statusRaw) {
    if (!VALID_STATUSES.includes(statusRaw as VacationStatus)) {
      return new Response(400, { error: 'Invalid status filter' })
    }
    status = statusRaw as VacationStatus
  }

  let userId: number | undefined
  if (userIdRaw) {
    const parsedUserId = parsePositiveInt(userIdRaw, 'Invalid userId filter')
    if (parsedUserId instanceof Response) {
      return parsedUserId
    }
    userId = parsedUserId
  }

  return { status, userId, page, pageSize }
}

export const getValidatorVacationRequests: HandlerFn = async (input, event) => {
  requireRole(event, ['validator'])
  return listValidatorVacationRequests(
    input as {
      status?: VacationStatus
      userId?: number
      page: number
      pageSize: number
    },
  )
}

export const postApproveVacationRequest: HandlerFn = async (input, event) => {
  const auth = requireRole(event, ['validator'])
  return approveVacationRequest(auth, (input as { id: number }).id)
}

export const parseRejectVacationInput: InputParserFn = (event) => {
  const id = parseId(event)
  if (id instanceof Response) {
    return id
  }
  const parsed = parseJsonBody(event)
  if (parsed instanceof Response) {
    return parsed
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { comment?: unknown }).comment !== 'string'
  ) {
    return new Response(400, { error: 'comment is required' })
  }
  return { id, comment: (parsed as { comment: string }).comment }
}

export const postRejectVacationRequest: HandlerFn = async (input, event) => {
  const auth = requireRole(event, ['validator'])
  const { id, comment } = input as { id: number; comment: string }
  return rejectVacationRequest(auth, id, comment)
}

export const getTeamVacationRequests: HandlerFn = async (_input, event) => {
  requireAuth(event)
  const items = await listTeamVacationRequests()
  return { items }
}

export const getRequesterUsers: HandlerFn = async (_input, event) => {
  requireRole(event, ['validator'])
  const items = await listUsersForFilters()
  return { items }
}
