import AppDataSource from './data-source'

export interface DatabaseConnectivityResult {
  ok: boolean
  message: string
}

let initializing: Promise<void> | null = null

export async function ensureDatabaseInitialized(): Promise<void> {
  if (AppDataSource.isInitialized) {
    return
  }

  if (!initializing) {
    initializing = AppDataSource.initialize()
      .then(() => undefined)
      .catch((error: unknown) => {
        initializing = null
        throw error
      })
  }

  await initializing
}

export async function checkDatabaseConnectivity(): Promise<DatabaseConnectivityResult> {
  try {
    await ensureDatabaseInitialized()
    await AppDataSource.query('SELECT 1')
    return { ok: true, message: 'connected' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database error'
    return { ok: false, message }
  }
}
