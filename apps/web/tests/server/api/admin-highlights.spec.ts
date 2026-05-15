import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  service,
  adminLog,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  service: {
    listAdminHighlightsForManagement: vi.fn(),
    createAdminHighlight: vi.fn(),
    getAdminHighlightById: vi.fn(),
    updateAdminHighlightById: vi.fn(),
    deleteAdminHighlightById: vi.fn()
  },
  adminLog: {
    write: vi.fn()
  },
  readBody: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')

  return {
    ...actual,
    readBody
  }
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

import listHighlightsHandler from '../../../server/api/admin/highlights/index.get'
import createHighlightHandler from '../../../server/api/admin/highlights/index.post'
import getHighlightHandler from '../../../server/api/admin/highlights/[highlightId]/index.get'
import updateHighlightHandler from '../../../server/api/admin/highlights/[highlightId]/index.patch'
import deleteHighlightHandler from '../../../server/api/admin/highlights/[highlightId]/index.delete'

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

const sampleHighlight = {
  id: 'highlight-1',
  kind: 'announcement',
  title: 'Aviso',
  description: 'Descricao do aviso',
  isActive: true,
  mediaType: 'image',
  mediaUrl: 'https://example.com/image.jpg',
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

describe('admin highlights api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin highlights', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.listAdminHighlightsForManagement.mockResolvedValue([sampleHighlight])

    const response = await listHighlightsHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: [sampleHighlight]
    })
  })

  it('creates a highlight', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue(sampleHighlight)
    service.createAdminHighlight.mockResolvedValue(sampleHighlight)

    const response = await createHighlightHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: sampleHighlight
    })
  })

  it('gets a single highlight', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.getAdminHighlightById.mockResolvedValue(sampleHighlight)

    const response = await getHighlightHandler({
      context: {
        params: {
          highlightId: sampleHighlight.id
        }
      }
    } as never)

    expect(response).toEqual({
      status: 'success',
      data: sampleHighlight
    })
  })

  it('updates a highlight', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleHighlight,
      title: 'Aviso atualizado'
    })
    service.updateAdminHighlightById.mockResolvedValue({
      ...sampleHighlight,
      title: 'Aviso atualizado'
    })

    const response = await updateHighlightHandler({
      context: {
        params: {
          highlightId: sampleHighlight.id
        }
      }
    } as never)

    expect(response.status).toBe('success')
  })

  it('soft deletes a highlight', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.deleteAdminHighlightById.mockResolvedValue({
      ...sampleHighlight,
      deletedAt: '2026-05-08T12:00:00.000Z'
    })

    const response = await deleteHighlightHandler({
      context: {
        params: {
          highlightId: sampleHighlight.id
        }
      }
    } as never)

    expect(response.status).toBe('success')
  })
})
