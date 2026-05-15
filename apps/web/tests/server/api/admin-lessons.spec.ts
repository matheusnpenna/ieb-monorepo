import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
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
  writeAdminLog: vi.fn(),
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
  requireAuthSession,
  writeAdminLog
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

import listLessonsHandler from '../../../server/api/admin/lessons/index.get'
import createLessonHandler from '../../../server/api/admin/lessons/index.post'
import getLessonHandler from '../../../server/api/admin/lessons/[lessonSlug]/index.get'
import updateLessonHandler from '../../../server/api/admin/lessons/[lessonSlug]/index.patch'
import deleteLessonHandler from '../../../server/api/admin/lessons/[lessonSlug]/index.delete'

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

const sampleLesson = {
  id: 'introducao-a-teologia',
  courseId: 'teologia-basica',
  moduleId: 'fundamentos-da-fe',
  title: 'Introducao a Teologia',
  slug: 'introducao-a-teologia',
  description: 'Panorama inicial da disciplina.',
  order: 1,
  contentType: 'video',
  videoProvider: 'youtube',
  mediaUrl: 'https://youtube.com/watch?v=123',
  thumbnailUrl: null,
  durationInMinutes: 18,
  bodyContent: null,
  allowManualCompletion: true,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

describe('admin lessons api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin lessons', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    listAdminLessonsForManagement.mockResolvedValue([sampleLesson])

    const response = await listLessonsHandler({} as never)

    expect(requireAuthSession).toHaveBeenCalledWith(expect.anything(), { admin: true })
    expect(response).toEqual({
      status: 'success',
      data: [sampleLesson]
    })
  })

  it('creates a lesson', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue(sampleLesson)
    createAdminLesson.mockResolvedValue(sampleLesson)

    const response = await createLessonHandler({} as never)

    expect(createAdminLesson).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({ slug: 'introducao-a-teologia', moduleId: 'fundamentos-da-fe' })
    )
    expect(response).toEqual({
      status: 'success',
      data: sampleLesson
    })
  })

  it('gets a single lesson', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAdminLessonBySlug.mockResolvedValue(sampleLesson)

    const response = await getLessonHandler({
      context: {
        params: {
          lessonSlug: 'introducao-a-teologia'
        }
      }
    } as never)

    expect(getAdminLessonBySlug).toHaveBeenCalledWith(sampleSession, 'introducao-a-teologia')
    expect(response).toEqual({
      status: 'success',
      data: sampleLesson
    })
  })

  it('updates a lesson', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleLesson,
      title: 'Introducao revisada'
    })
    updateAdminLessonBySlug.mockResolvedValue({
      ...sampleLesson,
      title: 'Introducao revisada'
    })

    const response = await updateLessonHandler({
      context: {
        params: {
          lessonSlug: 'introducao-a-teologia'
        }
      }
    } as never)

    expect(updateAdminLessonBySlug).toHaveBeenCalledWith(
      sampleSession,
      'introducao-a-teologia',
      expect.objectContaining({ title: 'Introducao revisada' })
    )
    expect(response.status).toBe('success')
  })

  it('soft deletes a lesson', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    deleteAdminLessonBySlug.mockResolvedValue({
      ...sampleLesson,
      deletedAt: '2026-05-08T12:00:00.000Z'
    })

    const response = await deleteLessonHandler({
      context: {
        params: {
          lessonSlug: 'introducao-a-teologia'
        }
      }
    } as never)

    expect(deleteAdminLessonBySlug).toHaveBeenCalledWith(sampleSession, 'introducao-a-teologia')
    expect(response.status).toBe('success')
  })
})
