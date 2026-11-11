import { Response } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'
import { parseJsonBody } from './parseBody'
import type { HandlerFn, InputParserFn } from './types'

export interface EchoInput {
  message: string
}

export const parseEchoInput: InputParserFn = (event: CommonEvent) => {
  const parsed = parseJsonBody(event)
  if (parsed instanceof Response) {
    return parsed
  }
  if (parsed == null) {
    return new Response(400, { error: 'Request body is required' })
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as { message?: unknown }).message !== 'string' ||
    (parsed as { message: string }).message.trim().length === 0
  ) {
    return new Response(400, {
      error: 'Body must include a non-empty string field "message"',
    })
  }

  return {
    message: (parsed as { message: string }).message.trim(),
  } satisfies EchoInput
}

export const postEcho: HandlerFn = async (input) => {
  const { message } = input as EchoInput
  return {
    echo: message,
  }
}
