import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAuthSession, listAccessibleCourses } = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  listAccessibleCourses: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession
}))

vi.mock('../../../server/utils/courses', () => ({
  listAccessibleCourses
}))

import coursesHandler from '../../../server/api/courses/index.get'

const sampleSession = {
  user: {
    id: 'user-1',
    email: 'jane@example.com',
    fullName: 'Jane Doe',
    role: 'student',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-06T00:00:00.000Z'
} as const

const sampleCourses = [
  {
    id: 'course-1',
    title: 'Curso de Teologia Basica',
    slug: 'curso-de-teologia-basica',
    shortDescription: 'Fundamentos da fe cristã.',
    description: 'Descricao completa.',
    visibility: 'published',
    coverImageUrl: null,
    heroImageUrl: null,
    totalDurationInMinutes: 1200,
    moduleIds: ['module-1'],
    highlightIds: [],
    requiredCompletionRate: 80,
    certificateEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null
  }
]

describe('GET /api/courses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the list of accessible courses for the authenticated user', async () => {
    const event = {} as never

    requireAuthSession.mockResolvedValue(sampleSession)
    listAccessibleCourses.mockResolvedValue(sampleCourses)

    const response = await coursesHandler(event)

    expect(requireAuthSession).toHaveBeenCalledWith(event)
    expect(listAccessibleCourses).toHaveBeenCalledWith(sampleSession)
    expect(response).toEqual({
      status: 'success',
      data: sampleCourses
    })
  })

  it('returns the standardized error payload when the request fails', async () => {
    const event = {
      node: {
        res: {
          statusCode: 200
        }
      }
    } as never

    requireAuthSession.mockRejectedValue({
      statusCode: 401,
      statusMessage: 'Sessao expirada. Faca login novamente.'
    })

    const response = await coursesHandler(event)

    expect(event.node.res.statusCode).toBe(401)
    expect(response).toEqual({
      status: 'error',
      messages: ['Sessao expirada. Faca login novamente.'],
      data: []
    })
  })
})
