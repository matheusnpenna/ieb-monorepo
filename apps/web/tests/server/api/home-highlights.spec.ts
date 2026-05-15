import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAuthSession, service, adminLog } = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  service: {
    listActiveHomeHighlights: vi.fn()
  },
  adminLog: {
    write: vi.fn()
  }
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  requireAuthSession
}))

vi.mock('../../../server/modules/highlights/highlights.module', () => ({
  getHighlightsModule: () => ({
    service,
    adminLog
  })
}))

import listHomeHighlightsHandler from '../../../server/api/home/highlights/index.get'

const sampleSession = {
  user: {
    id: 'student-1',
    email: 'student@example.com',
    fullName: 'Student User',
    role: 'student',
    status: 'active',
    region: 'aluno-externo',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
} as const

describe('home highlights api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists active home highlights', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.listActiveHomeHighlights.mockResolvedValue([
      {
        id: 'highlight-1',
        kind: 'announcement',
        title: 'Aviso',
        description: 'Descricao',
        isActive: true,
        mediaType: null,
        mediaUrl: null,
        actions: [],
        order: 1,
        publishedAt: '2026-05-08T00:00:00.000Z',
        createdAt: '2026-05-08T00:00:00.000Z',
        updatedAt: '2026-05-08T00:00:00.000Z',
        deletedAt: null,
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
        deletedBy: null
      }
    ])

    const response = await listHomeHighlightsHandler({} as never)

    expect(response.status).toBe('success')
    expect(response.data).toHaveLength(1)
  })
})
