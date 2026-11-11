import type { EntityManager, FindOptionsWhere } from 'typeorm'
import { In, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm'
import { AppError } from './errors'
import { assertCalendarDate, assertDateOrder, assertNotInPast, assertRejectComment } from './dateRules'
import AppDataSource from '../persistence/data-source'
import { User } from '../persistence/entities/User'
import {
  VacationRequest,
  type VacationStatus,
} from '../persistence/entities/VacationRequest'
import type { AuthUser } from '../security/auth'

async function assertNoOverlap(
  manager: EntityManager,
  userId: number,
  startDate: string,
  endDate: string,
  excludeId?: number,
) {
  const where: FindOptionsWhere<VacationRequest> = {
    userId,
    status: In(['pending', 'approved']),
    startDate: LessThanOrEqual(endDate),
    endDate: MoreThanOrEqual(startDate),
  }
  if (excludeId !== undefined) {
    where.id = Not(excludeId)
  }

  const conflict = await manager.getRepository(VacationRequest).findOne({ where })
  if (conflict) {
    throw new AppError('Vacation request overlaps an existing pending or approved request', 409)
  }
}

function serialize(request: VacationRequest) {
  return {
    id: request.id,
    userId: request.userId,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    status: request.status,
    comments: request.comments,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    user: request.user
      ? {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          role: request.user.role,
        }
      : undefined,
  }
}

export async function createVacationRequest(
  auth: AuthUser,
  input: { startDate: string; endDate: string; reason?: string | null },
) {
  if (auth.role !== 'requester') {
    throw new AppError('Only requesters can submit vacation requests', 403)
  }

  assertCalendarDate(input.startDate)
  assertCalendarDate(input.endDate)
  assertDateOrder(input.startDate, input.endDate)
  assertNotInPast(input.startDate)

  return AppDataSource.transaction(async (manager) => {
    await assertNoOverlap(manager, auth.sub, input.startDate, input.endDate)

    const entity = manager.create(VacationRequest, {
      userId: auth.sub,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason?.trim() ? input.reason.trim() : null,
      status: 'pending',
      comments: null,
    })

    const saved = await manager.save(entity)
    return serialize(saved)
  })
}

export async function listOwnVacationRequests(auth: AuthUser) {
  if (auth.role !== 'requester') {
    throw new AppError('Forbidden', 403)
  }

  const items = await AppDataSource.getRepository(VacationRequest).find({
    where: { userId: auth.sub },
    order: { createdAt: 'DESC' },
  })
  return items.map(serialize)
}

export async function listValidatorVacationRequests(input: {
  status?: VacationStatus
  userId?: number
  page: number
  pageSize: number
}) {
  const repo = AppDataSource.getRepository(VacationRequest)

  const where: FindOptionsWhere<VacationRequest> = {}
  if (input.status) {
    where.status = input.status
  }
  if (input.userId !== undefined) {
    where.userId = input.userId
  }

  const [items, total] = await repo.findAndCount({
    where,
    relations: { user: true },
    order: { createdAt: 'DESC' },
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
  })

  return {
    items: items.map(serialize),
    total,
    page: input.page,
    pageSize: input.pageSize,
  }
}

export async function approveVacationRequest(id: number) {
  return AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(VacationRequest)
    const request = await repo.findOne({ where: { id }, relations: { user: true } })
    if (!request) {
      throw new AppError('Vacation request not found', 404)
    }
    if (request.status !== 'pending') {
      throw new AppError('Only pending requests can be approved', 409)
    }

    await assertNoOverlap(manager, request.userId, request.startDate, request.endDate, request.id)

    request.status = 'approved'
    const saved = await repo.save(request)
    saved.user = request.user
    return serialize(saved)
  })
}

export async function rejectVacationRequest(id: number, comment: string) {
  assertRejectComment(comment)
  const trimmed = comment.trim()

  const repo = AppDataSource.getRepository(VacationRequest)
  const request = await repo.findOne({ where: { id }, relations: { user: true } })
  if (!request) {
    throw new AppError('Vacation request not found', 404)
  }
  if (request.status !== 'pending') {
    throw new AppError('Only pending requests can be rejected', 409)
  }

  request.status = 'rejected'
  request.comments = trimmed
  const saved = await repo.save(request)
  saved.user = request.user
  return serialize(saved)
}

export async function listTeamVacationRequests() {
  const items = await AppDataSource.getRepository(VacationRequest).find({
    where: { status: In(['pending', 'approved']) },
    relations: { user: true },
    order: { startDate: 'ASC' },
  })
  return items.map(serialize)
}

export async function cancelOwnPendingRequest(auth: AuthUser, id: number) {
  if (auth.role !== 'requester') {
    throw new AppError('Forbidden', 403)
  }

  const repo = AppDataSource.getRepository(VacationRequest)
  const request = await repo.findOne({ where: { id } })
  if (!request || request.userId !== auth.sub) {
    throw new AppError('Vacation request not found', 404)
  }
  if (request.status !== 'pending') {
    throw new AppError('Only pending requests can be cancelled', 409)
  }

  await repo.remove(request)
  return { ok: true }
}

export async function listUsersForFilters() {
  const users = await AppDataSource.getRepository(User).find({
    where: { role: 'requester' },
    order: { name: 'ASC' },
  })
  return users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
}
