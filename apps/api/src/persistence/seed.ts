import 'reflect-metadata'
import AppDataSource from './data-source'
import { User } from './entities/User'
import { VacationRequest } from './entities/VacationRequest'
import { hashPassword } from '../security/password'

const DEMO_PASSWORD = 'Password123!'

async function upsertUser(input: {
  name: string
  email: string
  role: User['role']
}): Promise<User> {
  const repo = AppDataSource.getRepository(User)
  let user = await repo.findOne({ where: { email: input.email } })
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  if (!user) {
    user = repo.create({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
    })
  } else {
    user.name = input.name
    user.role = input.role
    user.passwordHash = passwordHash
  }

  return repo.save(user)
}

async function main() {
  await AppDataSource.initialize()

  const validator = await upsertUser({
    name: 'Vera Validator',
    email: 'validator@example.com',
    role: 'validator',
  })
  const alice = await upsertUser({
    name: 'Alice Requester',
    email: 'alice@example.com',
    role: 'requester',
  })
  const bob = await upsertUser({
    name: 'Bob Requester',
    email: 'bob@example.com',
    role: 'requester',
  })

  const requests = AppDataSource.getRepository(VacationRequest)
  const existing = await requests.count({ where: { userId: alice.id } })
  if (existing === 0) {
    const start = new Date()
    start.setUTCDate(start.getUTCDate() + 14)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 4)

    await requests.save(
      requests.create({
        userId: alice.id,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        reason: 'Family trip',
        status: 'pending',
        comments: null,
      }),
    )
  }

  console.log('Seed complete')
  console.log(`  validator: validator@example.com / ${DEMO_PASSWORD} (id=${validator.id})`)
  console.log(`  requester: alice@example.com / ${DEMO_PASSWORD} (id=${alice.id})`)
  console.log(`  requester: bob@example.com / ${DEMO_PASSWORD} (id=${bob.id})`)

  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy()
  }
  process.exit(1)
})
