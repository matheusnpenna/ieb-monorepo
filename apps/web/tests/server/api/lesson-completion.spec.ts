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
  deleteAdminLessonBySlug
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
  deleteAdminLessonBySlug: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession
}))

vi.mock('../../../server/utils/courses', () => ({
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

import lessonCompletionHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/complete.post'

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

describe('POST /api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks the requested lesson as completed for the authenticated user', async () => {
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
    markLessonAsCompletedBySlugs.mockResolvedValue({
      lessonId: 'aula-01',
      isCompleted: true
    })

    const response = await lessonCompletionHandler(event)

    expect(requireAuthSession).toHaveBeenCalledWith(event)
    expect(markLessonAsCompletedBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-teologia-basica',
      'fundamentos',
      'introducao'
    )
    expect(response).toEqual({
      status: 'success',
      data: {
        lessonId: 'aula-01',
        isCompleted: true
      }
    })
  })

  it('returns the standardized error payload when lesson completion fails', async () => {
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
    markLessonAsCompletedBySlugs.mockRejectedValue({
      statusCode: 404,
      statusMessage: 'Aula nao encontrada.'
    })

    const response = await lessonCompletionHandler(event)

    expect(event.node.res.statusCode).toBe(404)
    expect(response).toEqual({
      status: 'error',
      messages: ['Aula nao encontrada.'],
      data: null
    })
  })
})
