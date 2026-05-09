import type { AdminActivityLog } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFirebaseAdminCollection } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn()
}))

vi.mock('../../../server/utils/firebase-admin', () => ({
  getFirebaseAdminCollection
}))

import { listAdminLogsForManagement } from '../../../server/utils/logs'

const adminSession = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin' as const,
    status: 'active' as const,
    region: 'feira-de-santana' as const,
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

const createDocumentSnapshot = <TDocument extends { id: string }>(document: TDocument) => ({
  id: document.id,
  data: () => {
    const { id: _id, ...payload } = document

    return payload
  }
})

const createLogsCollectionMock = (logs: AdminActivityLog[]) => {
  const getDocuments = (limitNumber: number, cursor?: { createdAt: string } | null) => {
    const startIndex = cursor ? logs.findIndex((log) => log.createdAt === cursor.createdAt) + 1 : 0

    return logs.slice(Math.max(startIndex, 0), Math.max(startIndex, 0) + limitNumber).map(createDocumentSnapshot)
  }

  const afterLimitQuery = {
    get: vi.fn().mockImplementation(() => Promise.resolve({ docs: getDocuments(3) })),
    startAfter: vi.fn().mockImplementation((createdAt: string) => ({
      get: vi.fn().mockResolvedValue({
        docs: getDocuments(3, { createdAt })
      })
    }))
  }

  const query = {
    orderBy: vi.fn(),
    limit: vi.fn()
  }

  query.orderBy.mockImplementation(() => query)
  query.limit.mockImplementation((_limitValue: number) => afterLimitQuery)

  return query
}

describe('logs utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

    getFirebaseAdminCollection.mockReturnValue(createLogsCollectionMock(logs))

    const firstPage = await listAdminLogsForManagement(adminSession, {
      pageSize: 2
    })

    expect(firstPage.items.map((log) => log.id)).toEqual(['log-3', 'log-2'])
    expect(firstPage.pagination.nextCursor).toBeTruthy()

    const secondPage = await listAdminLogsForManagement(adminSession, {
      pageSize: 2,
      cursor: firstPage.pagination.nextCursor
    })

    expect(secondPage.items.map((log) => log.id)).toEqual(['log-1'])
    expect(secondPage.pagination.nextCursor).toBeNull()
  })
})
