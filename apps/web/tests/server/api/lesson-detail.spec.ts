import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  getAccessibleLessonDetailBySlugs,
  updateLessonProgressBySlugs,
  markLessonAsCompletedBySlugs,
  listLessonCommentsBySlugs,
  createLessonCommentBySlugs,
  updateLessonCommentBySlugs,
  deleteLessonCommentBySlugs,
  listAdminLessonsForManagement,
  createAdminLesson,
  getAdminLessonBySlug,
  updateAdminLessonBySlug,
  deleteAdminLessonBySlug,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  getAccessibleLessonDetailBySlugs: vi.fn(),
  updateLessonProgressBySlugs: vi.fn(),
  markLessonAsCompletedBySlugs: vi.fn(),
  listLessonCommentsBySlugs: vi.fn(),
  createLessonCommentBySlugs: vi.fn(),
  updateLessonCommentBySlugs: vi.fn(),
  deleteLessonCommentBySlugs: vi.fn(),
  listAdminLessonsForManagement: vi.fn(),
  createAdminLesson: vi.fn(),
  getAdminLessonBySlug: vi.fn(),
  updateAdminLessonBySlug: vi.fn(),
  deleteAdminLessonBySlug: vi.fn(),
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

vi.mock('../../../server/modules/shared/infrastructure/course-catalog', () => ({
  getAccessibleLessonDetailBySlugs,
  updateLessonProgressBySlugs,
  markLessonAsCompletedBySlugs,
  listLessonCommentsBySlugs,
  createLessonCommentBySlugs,
  updateLessonCommentBySlugs,
  deleteLessonCommentBySlugs,
  listAdminLessonsForManagement,
  createAdminLesson,
  getAdminLessonBySlug,
  updateAdminLessonBySlug,
  deleteAdminLessonBySlug
}))

import lessonDetailHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/index.get'
import lessonProgressHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/progress.patch'

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

describe('lesson detail api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns lesson detail for the authenticated user', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'fundamentos',
          lessonSlug: 'introducao'
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getAccessibleLessonDetailBySlugs.mockResolvedValue({
      lesson: {
        id: 'aula-01',
        courseId: 'curso-de-teologia-basica',
        moduleId: 'modulo-01',
        title: 'Aula 01',
        slug: 'introducao'
      },
      module: {
        id: 'modulo-01',
        courseId: 'curso-de-teologia-basica',
        title: 'Modulo 01',
        slug: 'fundamentos'
      },
      videoUrl: 'https://cdn.example.com/aula-01.m3u8',
      progress: {
        lastPositionInSeconds: 240,
        watchedMinutes: 4,
        completionRate: 32,
        isCompleted: false
      },
      previousLesson: null,
      nextLesson: {
        id: 'aula-02',
        title: 'Aula 02',
        slug: 'aplicacoes',
        href: '/curso/curso-de-teologia-basica/modulo/fundamentos/aula/aplicacoes'
      }
    })

    const response = await lessonDetailHandler(event)

    expect(getAccessibleLessonDetailBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-teologia-basica',
      'fundamentos',
      'introducao'
    )
    expect(response.status).toBe('success')
  })

  it('returns the standardized error payload when lesson detail loading fails', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'fundamentos',
          lessonSlug: 'introducao'
        }
      },
      node: {
        res: {
          statusCode: 200
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    getAccessibleLessonDetailBySlugs.mockRejectedValue({
      statusCode: 404,
      statusMessage: 'Aula nao encontrada.'
    })

    const response = await lessonDetailHandler(event)

    expect(event.node.res.statusCode).toBe(404)
    expect(response).toEqual({
      status: 'error',
      messages: ['Aula nao encontrada.'],
      data: null
    })
  })

  it('updates lesson progress with the submitted video position', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'fundamentos',
          lessonSlug: 'introducao'
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      lastPositionInSeconds: 312,
      markAsCompleted: false
    })
    updateLessonProgressBySlugs.mockResolvedValue({
      lessonId: 'aula-01',
      lastPositionInSeconds: 312,
      watchedMinutes: 6,
      completionRate: 52,
      isCompleted: false
    })

    const response = await lessonProgressHandler(event)

    expect(updateLessonProgressBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-teologia-basica',
      'fundamentos',
      'introducao',
      {
        lastPositionInSeconds: 312,
        markAsCompleted: false,
        hasCompletionOverride: true
      }
    )
    expect(response).toEqual({
      status: 'success',
      data: {
        lessonId: 'aula-01',
        lastPositionInSeconds: 312,
        watchedMinutes: 6,
        completionRate: 52,
        isCompleted: false
      }
    })
  })
})
