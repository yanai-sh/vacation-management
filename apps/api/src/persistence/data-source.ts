import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User } from './entities/User'
import { VacationRequest } from './entities/VacationRequest'
import { InitialFoundation1762800000000 } from './migrations/1762800000000-InitialFoundation'
import { CreateDomainSchema1762810000000 } from './migrations/1762810000000-CreateDomainSchema'

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
  entities: [User, VacationRequest],
  migrations: [InitialFoundation1762800000000, CreateDomainSchema1762810000000],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
})

export default AppDataSource
