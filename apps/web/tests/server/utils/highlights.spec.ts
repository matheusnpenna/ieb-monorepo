import type { PlatformHighlight } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFirebaseAdminCollection, writeAdminLog } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn(),
  writeAdminLog: vi.fn()
}))

vi.mock('../../../server/utils/firebase-admin', () => ({
  getFirebaseAdminCollection
}))

vi.mock('../../../server/utils/auth', () => ({
  writeAdminLog
}))

import {
  createAdminHighlight,
  deleteAdminHighlightById,
  getAdminHighlightById,
  listActiveHomeHighlights,
  listAdminHighlightsForManagement,
  updateAdminHighlightById
} from '../../../server/utils/highlights'

const createDocumentSnapshot = <TDocument extends { id: string }>(document: TDocument) => ({
  id: document.id,
  exists: true,
  data: () => {
    const { id: _id, ...payload } = document

    return payload
  }
})

const buildHighlight = (
  overrides: Partial<PlatformHighlight> & Pick<PlatformHighlight, 'id' | 'title' | 'description'>
): PlatformHighlight => ({
  id: overrides.id,
  kind: overrides.kind || 'announcement',
  title: overrides.title,
  description: overrides.description,
  isActive: overrides.isActive ?? true,
  mediaType: overrides.mediaType ?? null,
  mediaUrl: overrides.mediaUrl ?? null,
  actions: overrides.actions || [],
  order: overrides.order ?? 0,
  publishedAt: overrides.publishedAt || '2026-05-08T00:00:00.000Z',
  createdAt: overrides.createdAt || '2026-05-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-05-08T00:00:00.000Z',
  deletedAt: overrides.deletedAt || null,
  createdBy: overrides.createdBy || 'admin-1',
  updatedBy: overrides.updatedBy || 'admin-1',
  deletedBy: overrides.deletedBy || null
})

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

const studentSession = {
  user: {
    id: 'student-1',
    email: 'student@example.com',
    fullName: 'Student User',
    role: 'student' as const,
    status: 'active' as const,
    region: 'aluno-externo' as const,
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
}

describe('highlights utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates, updates, loads and soft deletes a highlight', async () => {
    const storedHighlights = new Map<string, PlatformHighlight>()

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'highlights') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [...storedHighlights.values()].map(createDocumentSnapshot)
          }),
          doc: vi.fn((documentId: string) => ({
            get: vi.fn().mockResolvedValue(
              storedHighlights.has(documentId)
                ? createDocumentSnapshot(storedHighlights.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: PlatformHighlight) => {
              storedHighlights.set(documentId, payload)
            })
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdHighlight = await createAdminHighlight(adminSession, {
      title: 'Aviso',
      description: 'Descricao do aviso',
      isActive: true,
      mediaType: 'image',
      mediaUrl: 'https://example.com/image.jpg',
      actions: [
        {
          id: 'action-1',
          label: 'Abrir',
          href: '/home',
          target: '_self',
          variant: 'primary'
        }
      ],
      order: 1
    })

    expect(createdHighlight.id).toBeTruthy()
    expect(createdHighlight.actions).toHaveLength(1)

    const loadedHighlight = await getAdminHighlightById(adminSession, createdHighlight.id)

    expect(loadedHighlight.title).toBe('Aviso')

    const updatedHighlight = await updateAdminHighlightById(adminSession, createdHighlight.id, {
      title: 'Aviso atualizado',
      description: 'Descricao atualizada',
      isActive: false,
      mediaType: null,
      mediaUrl: null,
      actions: [],
      order: 2
    })

    expect(updatedHighlight.title).toBe('Aviso atualizado')
    expect(updatedHighlight.isActive).toBe(false)

    const deletedHighlight = await deleteAdminHighlightById(adminSession, createdHighlight.id)

    expect(deletedHighlight.deletedAt).not.toBeNull()
    expect(writeAdminLog).toHaveBeenCalledTimes(3)
  })

  it('lists admin and active home highlights in the expected order', async () => {
    const highlightOne = buildHighlight({
      id: 'highlight-1',
      title: 'Primeiro',
      description: 'Descricao 1',
      order: 2,
      publishedAt: '2026-05-08T08:00:00.000Z'
    })
    const highlightTwo = buildHighlight({
      id: 'highlight-2',
      title: 'Segundo',
      description: 'Descricao 2',
      order: 1,
      publishedAt: '2026-05-08T09:00:00.000Z'
    })

    getFirebaseAdminCollection.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [createDocumentSnapshot(highlightOne), createDocumentSnapshot(highlightTwo)]
      }),
      doc: vi.fn()
    })

    const adminHighlights = await listAdminHighlightsForManagement(adminSession)
    const homeHighlights = await listActiveHomeHighlights(studentSession)

    expect(adminHighlights.map((highlight) => highlight.id)).toEqual(['highlight-2', 'highlight-1'])
    expect(homeHighlights.map((highlight) => highlight.id)).toEqual(['highlight-2', 'highlight-1'])
  })
})
