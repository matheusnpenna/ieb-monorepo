import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  listLessonCommentsBySlugs,
  createLessonCommentBySlugs,
  updateLessonCommentBySlugs,
  deleteLessonCommentBySlugs,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  listLessonCommentsBySlugs: vi.fn(),
  createLessonCommentBySlugs: vi.fn(),
  updateLessonCommentBySlugs: vi.fn(),
  deleteLessonCommentBySlugs: vi.fn(),
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

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession
}))

vi.mock('../../../server/utils/courses', () => ({
  listLessonCommentsBySlugs,
  createLessonCommentBySlugs,
  updateLessonCommentBySlugs,
  deleteLessonCommentBySlugs
}))

import listCommentsHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/comments/index.get'
import createCommentHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/comments/index.post'
import updateCommentHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/comments/[commentId].patch'
import deleteCommentHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/lessons/[lessonSlug]/comments/[commentId].delete'

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

describe('lesson comments api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists the comments for the authenticated user', async () => {
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
    listLessonCommentsBySlugs.mockResolvedValue([{ id: 'comment-1', content: 'Primeiro comentario' }])

    const response = await listCommentsHandler(event)

    expect(response).toEqual({
      status: 'success',
      data: [{ id: 'comment-1', content: 'Primeiro comentario' }]
    })
  })

  it('creates a new comment', async () => {
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
    readBody.mockResolvedValue({ content: 'Novo comentario' })
    createLessonCommentBySlugs.mockResolvedValue({ id: 'comment-2', content: 'Novo comentario' })

    const response = await createCommentHandler(event)

    expect(createLessonCommentBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-teologia-basica',
      'fundamentos',
      'introducao',
      'Novo comentario'
    )
    expect(response).toEqual({
      status: 'success',
      data: { id: 'comment-2', content: 'Novo comentario' }
    })
  })

  it('updates an existing comment', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'fundamentos',
          lessonSlug: 'introducao',
          commentId: 'comment-1'
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({ content: 'Comentario editado' })
    updateLessonCommentBySlugs.mockResolvedValue({ id: 'comment-1', content: 'Comentario editado' })

    const response = await updateCommentHandler(event)

    expect(response).toEqual({
      status: 'success',
      data: { id: 'comment-1', content: 'Comentario editado' }
    })
  })

  it('deletes an existing comment', async () => {
    const event = {
      context: {
        params: {
          courseSlug: 'curso-de-teologia-basica',
          moduleSlug: 'fundamentos',
          lessonSlug: 'introducao',
          commentId: 'comment-1'
        }
      }
    } as never

    requireAuthSession.mockResolvedValue(sampleSession)
    deleteLessonCommentBySlugs.mockResolvedValue(undefined)

    const response = await deleteCommentHandler(event)

    expect(deleteLessonCommentBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-teologia-basica',
      'fundamentos',
      'introducao',
      'comment-1'
    )
    expect(response).toEqual({
      status: 'success',
      data: null
    })
  })
})
