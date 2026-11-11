import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import {
  cancelOwnPendingRequest,
  createVacationRequest,
  listOwnVacationRequests,
} from '../application/vacationService'
import { requireRole } from '../security/auth'
import { parseJsonBody } from './parseBody'
import type { HandlerFn, InputParserFn } from './types'

function parseId(event: CommonEvent): number | Response {
  const raw = event.pathParameters?.id
  const id = Number(raw)
  if (!raw || !Number.isInteger(id) || id <= 0) {
    return new Response(400, { error: 'Invalid request id' })
  }
  return id
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
