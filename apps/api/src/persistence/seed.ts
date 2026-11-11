import 'reflect-metadata'
import { In, Not } from 'typeorm'
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

function isoDaysFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function stay(startOffset: number, days: number) {
  return {
    startDate: isoDaysFromToday(startOffset),
    endDate: isoDaysFromToday(startOffset + days - 1),
  }
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

  const demoEmails = [validator.email, alice.email, bob.email]
  await AppDataSource.getRepository(User).delete({ email: Not(In(demoEmails)) })

  const requests = AppDataSource.getRepository(VacationRequest)
  await requests.createQueryBuilder().delete().execute()
  await requests.save([
    requests.create({
      userId: alice.id,
      ...stay(14, 5),
      reason: 'Family trip',
      status: 'pending',
      comments: null,
    }),
    requests.create({
      userId: alice.id,
      ...stay(45, 5),
      reason: 'Winter holiday',
      status: 'approved',
      comments: null,
    }),
    requests.create({
      userId: alice.id,
      ...stay(75, 4),
      reason: 'Conference',
      status: 'rejected',
      comments: 'Overlaps a team deadline.',
    }),
    requests.create({
      userId: bob.id,
      ...stay(21, 5),
      reason: 'School break',
      status: 'pending',
      comments: null,
    }),
  ])

  const seeded = await requests.find({ order: { startDate: 'ASC' }, relations: { user: true } })

  console.log('Seed complete')
  console.log(`  validator: validator@example.com / ${DEMO_PASSWORD} (id=${validator.id})`)
  console.log(`  requester: alice@example.com / ${DEMO_PASSWORD} (id=${alice.id})`)
  console.log(`  requester: bob@example.com / ${DEMO_PASSWORD} (id=${bob.id})`)
  for (const request of seeded) {
    console.log(
      `  ${request.user.name}: ${request.status} ${request.startDate}–${request.endDate} ${request.reason}`,
    )
  }

  await AppDataSource.destroy()
}

main().catch(async (error) => {
  console.error(error)
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy()
  }
  process.exit(1)
})
