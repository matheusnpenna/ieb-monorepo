import type { AdminActivityLog, AuthSessionContext } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { LogsService } from '../../../server/modules/logs/application/logs.service'
import type { LogRepository } from '../../../server/modules/logs/application/ports'

const adminSession: AuthSessionContext = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
}

const buildLog = (
  overrides: Partial<AdminActivityLog> & Pick<AdminActivityLog, 'id' | 'summary' | 'createdAt'>
): AdminActivityLog => ({
  id: overrides.id,
  actorUserId: overrides.actorUserId || 'admin-1',
  actorEmail: overrides.actorEmail || 'admin@example.com',
  action: overrides.action || 'update',
  targetCollection: overrides.targetCollection || 'courses',
  targetId: overrides.targetId || 'course-1',
  summary: overrides.summary,
  metadata: overrides.metadata || {},
  createdAt: overrides.createdAt,
  updatedAt: overrides.updatedAt || overrides.createdAt,
  deletedAt: overrides.deletedAt || null
})

describe('logs service', () => {
  it('lists admin logs with cursor pagination', async () => {
    const logs = [
      buildLog({
        id: 'log-3',
        summary: 'Terceiro log',
        createdAt: '2026-05-08T12:00:00.000Z'
      }),
      buildLog({
        id: 'log-2',
        summary: 'Segundo log',
        createdAt: '2026-05-08T11:00:00.000Z'
      }),
      buildLog({
        id: 'log-1',
        summary: 'Primeiro log',
        createdAt: '2026-05-08T10:00:00.000Z'
      })
    ]
    const repository: LogRepository = {
      listPage: vi.fn(async ({ limit, cursorCreatedAt }) => {
        const startIndex = cursorCreatedAt ? logs.findIndex((log) => log.createdAt === cursorCreatedAt) + 1 : 0

        return logs.slice(Math.max(startIndex, 0), Math.max(startIndex, 0) + limit)
      })
    }
    const service = new LogsService({ repository })

    const firstPage = await service.listAdminLogsForManagement(adminSession, {
      pageSize: 2
    })
    const secondPage = await service.listAdminLogsForManagement(adminSession, {
      pageSize: 2,
      cursor: firstPage.pagination.nextCursor
    })

    expect(firstPage.items.map((log) => log.id)).toEqual(['log-3', 'log-2'])
    expect(firstPage.pagination.nextCursor).toBeTruthy()
    expect(secondPage.items.map((log) => log.id)).toEqual(['log-1'])
    expect(secondPage.pagination.nextCursor).toBeNull()
  })

  it('rejects non-admin sessions', async () => {
    const repository: LogRepository = {
      listPage: vi.fn()
    }
    const service = new LogsService({ repository })

    await expect(
      service.listAdminLogsForManagement({
        ...adminSession,
        user: {
          ...adminSession.user,
          role: 'student'
        }
      })
    ).rejects.toMatchObject({
      statusCode: 403
    })
  })
})
