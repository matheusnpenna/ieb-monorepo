import type { AuthSessionContext, PlatformHighlight } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HighlightsService } from '../../../server/modules/highlights/application/highlights.service'
import type { AdminLogPort, HighlightRepository } from '../../../server/modules/highlights/application/ports'

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

const buildService = () => {
  const highlights = new Map<string, PlatformHighlight>()
  const repository: HighlightRepository = {
    listAll: vi.fn(async () => [...highlights.values()]),
    findById: vi.fn(async (highlightId: string) => highlights.get(highlightId) || null),
    save: vi.fn(async (highlight: PlatformHighlight) => {
      highlights.set(highlight.id, highlight)
    })
  }
  const adminLog: AdminLogPort = {
    write: vi.fn()
  }
  const service = new HighlightsService({
    repository,
    adminLog,
    clock: {
      now: () => '2026-05-08T12:00:00.000Z'
    },
    idGenerator: {
      create: vi.fn()
        .mockReturnValueOnce('highlight-1')
        .mockReturnValue('action-1')
    }
  })

  return {
    service,
    repository,
    adminLog,
    highlights
  }
}

describe('highlights service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an admin highlight through repository and log ports', async () => {
    const { service, repository, adminLog } = buildService()

    const highlight = await service.createAdminHighlight(adminSession, {
      title: ' Aviso ',
      description: ' Descricao ',
      isActive: true,
      mediaType: null,
      mediaUrl: null,
      actions: [],
      order: 1
    })

    expect(highlight).toMatchObject({
      id: 'highlight-1',
      title: 'Aviso',
      description: 'Descricao',
      publishedAt: '2026-05-08T12:00:00.000Z'
    })
    expect(repository.save).toHaveBeenCalledWith(highlight)
    expect(adminLog.write).toHaveBeenCalledWith(
      adminSession,
      expect.objectContaining({
        action: 'create',
        targetCollection: 'highlights',
        targetId: 'highlight-1'
      })
    )
  })

  it('does not expose deleted highlights to admin lists', async () => {
    const { service, highlights } = buildService()
    highlights.set('active-highlight', {
      id: 'active-highlight',
      kind: 'announcement',
      title: 'Ativo',
      description: 'Descricao',
      isActive: true,
      mediaType: null,
      mediaUrl: null,
      actions: [],
      order: 2,
      publishedAt: null,
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
      deletedAt: null,
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedBy: null
    })
    highlights.set('deleted-highlight', {
      ...highlights.get('active-highlight')!,
      id: 'deleted-highlight',
      title: 'Excluido',
      deletedAt: '2026-05-08T13:00:00.000Z',
      deletedBy: 'admin-1'
    })

    const result = await service.listAdminHighlightsForManagement(adminSession)

    expect(result.map((highlight) => highlight.id)).toEqual(['active-highlight'])
  })
})
