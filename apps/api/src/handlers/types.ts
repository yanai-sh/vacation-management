import type { APIGatewayProxyStructuredResultV2 } from 'commoneventframework'
import type { CommonEvent } from 'commoneventframework/dist/types/commonEvent'

export type InputParserFn = (event: CommonEvent) => unknown

export type HandlerFn = (
  input: unknown,
  event: CommonEvent,
) => Promise<APIGatewayProxyStructuredResultV2 | object>
