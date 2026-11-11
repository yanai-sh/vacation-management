import type { EntityManager, FindOptionsWhere } from 'typeorm'
import { In, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm'
import { AppError } from './errors'
import {
  assertCalendarDate,
  assertDateOrder,
  assertNotInPast,
  assertPendingStatus,
  assertRejectComment,
  assertValidatorRole,
} from './dateRules'
import type { VacationStatus } from '../domain'
import AppDataSource from '../persistence/data-source'
import { User } from '../persistence/entities/User'
import { VacationRequest } from '../persistence/entities/VacationRequest'
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
    order: { createdAt: 'DESC', id: 'DESC' },
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

/** Lock the decision row so a second approve, reject, or cancel cannot overwrite it. */
async function lockRequest(manager: EntityManager, id: number, userId?: number) {
  const request = await manager.getRepository(VacationRequest).findOne({
    where: userId === undefined ? { id } : { id, userId },
    lock: { mode: 'pessimistic_write' },
  })
  if (!request) {
    throw new AppError('Vacation request not found', 404)
  }
  return request
}

async function withUser(manager: EntityManager, request: VacationRequest) {
  const user = await manager.getRepository(User).findOne({ where: { id: request.userId } })
  if (user) request.user = user
  return request
}

export async function approveVacationRequest(auth: AuthUser, id: number) {
  assertValidatorRole(auth.role)

  return AppDataSource.transaction(async (manager) => {
    const request = await lockRequest(manager, id)
    assertPendingStatus(request.status, 'approved')
    await assertNoOverlap(manager, request.userId, request.startDate, request.endDate, request.id)

    request.status = 'approved'
    const saved = await manager.getRepository(VacationRequest).save(request)
    return serialize(await withUser(manager, saved))
  })
}

export async function rejectVacationRequest(auth: AuthUser, id: number, comment: string) {
  assertValidatorRole(auth.role)
  assertRejectComment(comment)
  const trimmed = comment.trim()

  return AppDataSource.transaction(async (manager) => {
    const request = await lockRequest(manager, id)
    assertPendingStatus(request.status, 'rejected')

    request.status = 'rejected'
    request.comments = trimmed
    const saved = await manager.getRepository(VacationRequest).save(request)
    return serialize(await withUser(manager, saved))
  })
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

  return AppDataSource.transaction(async (manager) => {
    const request = await lockRequest(manager, id, auth.sub)
    assertPendingStatus(request.status, 'cancelled')
    await manager.getRepository(VacationRequest).remove(request)
    return { ok: true }
  })
}

export async function listUsersForFilters() {
  const users = await AppDataSource.getRepository(User).find({
    where: { role: 'requester' },
    order: { name: 'ASC' },
  })
  return users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }))
}
