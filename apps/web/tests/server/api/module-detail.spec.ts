import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  getAccessibleModuleDetailBySlugs,
  listAdminModulesForManagement,
  createAdminModule,
  getAdminModuleBySlug,
  updateAdminModuleBySlug,
  deleteAdminModuleBySlug
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  getAccessibleModuleDetailBySlugs: vi.fn(),
  listAdminModulesForManagement: vi.fn(),
  createAdminModule: vi.fn(),
  getAdminModuleBySlug: vi.fn(),
  updateAdminModuleBySlug: vi.fn(),
  deleteAdminModuleBySlug: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  requireAuthSession
}))

vi.mock('../../../server/modules/course-modules/infrastructure/firebase-course-modules.repository', () => ({
  getAccessibleModuleDetailBySlugs,
  listAdminModulesForManagement,
  createAdminModule,
  getAdminModuleBySlug,
  updateAdminModuleBySlug,
  deleteAdminModuleBySlug
}))

import moduleDetailHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/index.get'

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
  issuedAt: '2026-05-07T00:00:00.000Z'
} as const

const sampleModuleDetail = {
  module: {
    id: 'modulo-01',
    courseId: 'curso-de-teologia-basica',
    title: 'Modulo 01 - Fundamentos',
    slug: 'fundamentos',
    description: 'Resumo do modulo.',
    order: 1,
    lessonIds: ['aula-01'],
    assessmentIds: ['avaliacao-01'],
    estimatedDurationInMinutes: 90,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null
  },
  lessons: [
    {
      id: 'aula-01',
      courseId: 'curso-de-teologia-basica',
      moduleId: 'modulo-01',
      title: 'Aula 01',
      slug: 'aula-01',
      description: 'Descricao da aula.',
      order: 1,
      contentType: 'video',
      videoProvider: 'youtube',
      mediaUrl: 'https://example.com/aula-01',
      thumbnailUrl: null,
      durationInMinutes: 12,
      bodyContent: null,
      allowManualCompletion: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      deletedBy: null
    }
  ],
  assessment: {
    id: 'avaliacao-01',
    courseId: 'curso-de-teologia-basica',
    moduleId: 'modulo-01',
    title: 'Avaliacao do modulo',
    slug: 'avaliacao-modulo',
    description: 'Perguntas do modulo.',
    passingScore: 70,
    timeLimitInMinutes: 30,
    questions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null
  },
  progress: {
    completionPercentage: 50,
    completedLessons: 1,
    totalLessons: 2
  }
}

describe('GET /api/courses/[courseSlug]/modules/[moduleSlug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns module detail for the authenticated user', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'fundamentos'
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getAccessibleModuleDetailBySlugs.mockResolvedValue(sampleModuleDetail)

    const response = await moduleDetailHandler(event)

    expect(requireAuthSession).toHaveBeenCalledWith(event)
    expect(getAccessibleModuleDetailBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-teologia-basica',
      'fundamentos'
    )
    expect(response).toEqual({
      status: 'success',
      data: sampleModuleDetail
    })
  })

  it('returns the standardized error payload when loading the module detail fails', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'modulo-inexistente'
        }
      },
      node: {
        res: {
          statusCode: 200
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getAccessibleModuleDetailBySlugs.mockRejectedValue({
      statusCode: 404,
      statusMessage: 'Modulo nao encontrado.'
    })

    const response = await moduleDetailHandler(event)

    expect(event.node.res.statusCode).toBe(404)
    expect(response).toEqual({
      status: 'error',
      messages: ['Modulo nao encontrado.'],
      data: null
    })
  })
})
