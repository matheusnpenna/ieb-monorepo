import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAuthSession, writeAdminLog, listAdminLogsForManagement, getQuery } = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  writeAdminLog: vi.fn(),
  listAdminLogsForManagement: vi.fn(),
  getQuery: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')

  return {
    ...actual,
    getQuery
  }
})

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession,
  writeAdminLog
}))

vi.mock('../../../server/utils/logs', () => ({
  listAdminLogsForManagement
}))

import listLogsHandler from '../../../server/api/admin/logs/index.get'

const sampleSession = {
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
} as const

describe('admin logs api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists paginated admin logs', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getQuery.mockReturnValue({
      pageSize: '20',
      cursor: 'cursor-token'
    })
    listAdminLogsForManagement.mockResolvedValue({
      items: [
        {
          id: 'log-1',
          actorUserId: 'admin-1',
          actorEmail: 'admin@example.com',
          action: 'update',
          targetCollection: 'courses',
          targetId: 'course-1',
          summary: 'Atualizou curso',
          metadata: {},
          createdAt: '2026-05-08T10:00:00.000Z',
          updatedAt: '2026-05-08T10:00:00.000Z',
          deletedAt: null
        }
      ],
      pagination: {
        nextCursor: 'next-cursor',
        pageSize: 20
      }
    })

    const response = await listLogsHandler({} as never)

    expect(listAdminLogsForManagement).toHaveBeenCalledWith(sampleSession, {
      cursor: 'cursor-token',
      pageSize: 20
    })
    expect(response).toEqual({
      status: 'success',
      data: {
        items: [
          expect.objectContaining({
            id: 'log-1',
            summary: 'Atualizou curso'
          })
        ],
        pagination: {
          nextCursor: 'next-cursor',
          pageSize: 20
        }
      }
    })
  })

  it('returns the standardized error payload when logs listing fails', async () => {
    const event = {
      node: {
        res: {
          statusCode: 200
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getQuery.mockReturnValue({})
    listAdminLogsForManagement.mockRejectedValue({
      statusCode: 500,
      statusMessage: 'Falha ao consultar os logs.'
    })

    const response = await listLogsHandler(event)

    expect(event.node.res.statusCode).toBe(500)
    expect(writeAdminLog).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({
        action: 'update',
        targetCollection: 'adminLogs',
        summary: 'Falha ao carregar a listagem de logs administrativos.'
      })
    )
    expect(response).toEqual({
      status: 'error',
      messages: ['Falha ao consultar os logs.'],
      data: null
    })
  })
})
