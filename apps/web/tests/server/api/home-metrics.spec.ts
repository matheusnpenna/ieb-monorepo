import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  listAccessibleCourses,
  getAccessibleCourseDetailBySlug,
  getHomeMetrics,
  listAdminCoursesForManagement,
  createAdminCourse,
  getAdminCourseBySlug,
  updateAdminCourseBySlug,
  deleteAdminCourseBySlug
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  listAccessibleCourses: vi.fn(),
  getAccessibleCourseDetailBySlug: vi.fn(),
  getHomeMetrics: vi.fn(),
  listAdminCoursesForManagement: vi.fn(),
  createAdminCourse: vi.fn(),
  getAdminCourseBySlug: vi.fn(),
  updateAdminCourseBySlug: vi.fn(),
  deleteAdminCourseBySlug: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  requireAuthSession
}))

vi.mock('../../../server/modules/courses/infrastructure/firebase-courses.repository', () => ({
  listAccessibleCourses,
  getAccessibleCourseDetailBySlug,
  getHomeMetrics,
  listAdminCoursesForManagement,
  createAdminCourse,
  getAdminCourseBySlug,
  updateAdminCourseBySlug,
  deleteAdminCourseBySlug
}))

import homeMetricsHandler from '../../../server/api/home/metrics/index.get'

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

describe('GET /api/home/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns home metrics for the authenticated user', async () => {
    const event = {} as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getHomeMetrics.mockResolvedValue({
      continueWatching: {
        lessonTitle: 'Aula 04',
        courseTitle: 'Curso de Lideranca',
        href: '/curso/curso-de-lideranca/modulo/fundamentos/aula/aula-04'
      },
      completedCourses: {
        count: 3
      }
    })

    const response = await homeMetricsHandler(event)

    expect(requireAuthSession).toHaveBeenCalledWith(event)
    expect(getHomeMetrics).toHaveBeenCalledWith(sampleSession)
    expect(response).toEqual({
      status: 'success',
      data: {
        continueWatching: {
          lessonTitle: 'Aula 04',
          courseTitle: 'Curso de Lideranca',
          href: '/curso/curso-de-lideranca/modulo/fundamentos/aula/aula-04'
        },
        completedCourses: {
          count: 3
        }
      }
    })
  })

  it('returns the standardized error payload when loading metrics fails', async () => {
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

    const response = await homeMetricsHandler(event)

    expect(event.node.res.statusCode).toBe(401)
    expect(response).toEqual({
      status: 'error',
      messages: ['Sessao expirada. Faca login novamente.'],
      data: null
    })
  })
})
