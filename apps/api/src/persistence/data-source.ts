import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { InitialFoundation1762800000000 } from './migrations/1762800000000-InitialFoundation'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: requiredEnv('POSTGRES_USER'),
  password: requiredEnv('POSTGRES_PASSWORD'),
  database: requiredEnv('POSTGRES_DB'),
  synchronize: false,
  logging: false,
  entities: [],
  migrations: [InitialFoundation1762800000000],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
})

export default AppDataSource
