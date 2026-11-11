import { loadEnv } from 'commoneventframework'

const envReady = loadEnv()

import './generated/HandlerRegistry'

import {
  APIGatewayProxyStructuredResultV2,
  Context,
  buildCommonEvent,
  getRouteConfig,
  resolveHandlerRef,
  Response,
  setLambdaContext,
  startDevServer,
} from 'commoneventframework'
import type { CommonEvent, LambdaEvent } from 'commoneventframework/dist/types/commonEvent'
import { isAppError } from './application/errors'
import type { HandlerFn, InputParserFn } from './handlers/types'
import { ensureDatabaseInitialized } from './persistence/database'
import { vacationConstraintResponse } from './persistence/overlapError'

export const handler = async (
  event: LambdaEvent,
  context: Context,
): Promise<APIGatewayProxyStructuredResultV2> => {
  await envReady
  await setLambdaContext(context)
  const commonEvent: CommonEvent = await buildCommonEvent(event)

  try {
    const routeConfig = getRouteConfig(commonEvent)

    if (!routeConfig || !routeConfig.handler) {
      return new Response(404, { error: 'Route not found' })
    }

    // Health probes DB itself; everything else initializes once here.
    if (routeConfig.handler !== 'handlers/health#getHealth') {
      await ensureDatabaseInitialized()
    }

    const handlerFn = resolveHandlerRef(routeConfig.handler) as HandlerFn | undefined
    const parserFn = routeConfig.inputParser
      ? (resolveHandlerRef(routeConfig.inputParser) as InputParserFn | undefined)
      : undefined

    if (!handlerFn) {
      return new Response(500, { error: `Handler "${routeConfig.handler}" not found` })
    }

    const input = parserFn ? parserFn(commonEvent) : {}
    if (input instanceof Response) {
      return input
    }

    const result = await handlerFn(input, commonEvent)

    if (result && typeof result === 'object' && 'statusCode' in result) {
      return result as APIGatewayProxyStructuredResultV2
    }

    return new Response(200, result as object)
  } catch (err) {
    if (isAppError(err)) {
      return new Response(err.statusCode, { error: err.message })
    }
    const constraintError = vacationConstraintResponse(err)
    if (constraintError) {
      return new Response(constraintError.statusCode, { error: constraintError.error })
    }
    console.error('handler error', err)
    return new Response(500, { error: 'Internal server error' })
  }
}

if (process.argv.includes('--local')) {
  startDevServer(handler)
}
