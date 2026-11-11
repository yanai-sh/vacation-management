import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'

export function parseJsonBody(event: CommonEvent): unknown | Response {
  if (!event.body) {
    return null
  }
  try {
    return JSON.parse(event.body) as unknown
  } catch {
    return new Response(400, { error: 'Request body must be valid JSON' })
  }
}
