import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAuthSession, getAccessibleCourseDetailBySlug } = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  getAccessibleCourseDetailBySlug: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession
}))

vi.mock('../../../server/utils/courses', () => ({
  getAccessibleCourseDetailBySlug
}))

import courseDetailHandler from '../../../server/api/courses/[courseSlug]/index.get'

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

const sampleCourseDetail = {
  course: {
    id: 'curso-de-teologia-basica',
    title: 'Curso de Teologia Basica',
    slug: 'curso-de-teologia-basica',
    shortDescription: 'Fundamentos da fe cristã.',
    description: 'Descricao completa.',
    visibility: 'published',
    coverImageUrl: null,
    heroImageUrl: null,
    totalDurationInMinutes: 1200,
    moduleIds: ['modulo-01'],
    highlightIds: [],
    requiredCompletionRate: 80,
    certificateEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null
  },
  modules: [
    {
      id: 'modulo-01',
      courseId: 'curso-de-teologia-basica',
      title: 'Modulo 01 - Fundamentos',
      slug: 'modulo-01',
      description: 'Resumo do modulo.',
      order: 1,
      lessonIds: [],
      assessmentIds: [],
      estimatedDurationInMinutes: 90,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      deletedBy: null
    }
  ],
  actions: {
    startCourseHref: '/curso/curso-de-teologia-basica/modulo/modulo-01/aula/aula-01',
    continueWatchingHref: '/curso/curso-de-teologia-basica/modulo/modulo-01/aula/aula-02'
  }
}

describe('GET /api/courses/[courseSlug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns course detail and modules for the authenticated user', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica'
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getAccessibleCourseDetailBySlug.mockResolvedValue(sampleCourseDetail)

    const response = await courseDetailHandler(event)

    expect(requireAuthSession).toHaveBeenCalledWith(event)
    expect(getAccessibleCourseDetailBySlug).toHaveBeenCalledWith(sampleSession, 'curso-de-teologia-basica')
    expect(response).toEqual({
      status: 'success',
      data: sampleCourseDetail
    })
  })

  it('returns the standardized error payload when loading the course detail fails', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-inexistente'
        }
      },
      node: {
        res: {
          statusCode: 200
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getAccessibleCourseDetailBySlug.mockRejectedValue({
      statusCode: 404,
      statusMessage: 'Curso nao encontrado.'
    })

    const response = await courseDetailHandler(event)

    expect(event.node.res.statusCode).toBe(404)
    expect(response).toEqual({
      status: 'error',
      messages: ['Curso nao encontrado.'],
      data: null
    })
  })
})
