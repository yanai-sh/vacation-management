import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { User } from './entities/User'
import { VacationRequest } from './entities/VacationRequest'
import { InitialFoundation1762800000000 } from './migrations/1762800000000-InitialFoundation'
import { CreateDomainSchema1762810000000 } from './migrations/1762810000000-CreateDomainSchema'
import { AddOverlapExclusion1762820000000 } from './migrations/1762820000000-AddOverlapExclusion'
import { AllowOneDayStay1762830000000 } from './migrations/1762830000000-AllowOneDayStay'
import { RequireEndAfterStart1762840000000 } from './migrations/1762840000000-RequireEndAfterStart'
import { AddValidatorListIndexes1762850000000 } from './migrations/1762850000000-AddValidatorListIndexes'
import { RequireRejectionComment1762860000000 } from './migrations/1762860000000-RequireRejectionComment'
import { DropRedundantVacationIndexes1762870000000 } from './migrations/1762870000000-DropRedundantVacationIndexes'

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
  migrations: [
    InitialFoundation1762800000000,
    CreateDomainSchema1762810000000,
    AddOverlapExclusion1762820000000,
    AllowOneDayStay1762830000000,
    RequireEndAfterStart1762840000000,
    AddValidatorListIndexes1762850000000,
    RequireRejectionComment1762860000000,
    DropRedundantVacationIndexes1762870000000,
  ],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,
})

export default AppDataSource
