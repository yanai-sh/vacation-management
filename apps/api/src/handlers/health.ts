import { Response } from 'commoneventframework'
import type { HandlerFn } from './types'
import { checkDatabaseConnectivity } from '../persistence/database'

export const getHealth: HandlerFn = async () => {
  const database = await checkDatabaseConnectivity()

  if (!database.ok) {
    return new Response(503, {
      status: 'degraded',
      database,
    })
  }

  return {
    status: 'ok',
    database,
  }
}
