import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  listAdminCoursesForManagement,
  createAdminCourse,
  getAdminCourseBySlug,
  updateAdminCourseBySlug,
  deleteAdminCourseBySlug,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  listAdminCoursesForManagement: vi.fn(),
  createAdminCourse: vi.fn(),
  getAdminCourseBySlug: vi.fn(),
  updateAdminCourseBySlug: vi.fn(),
  deleteAdminCourseBySlug: vi.fn(),
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
  listAdminCoursesForManagement,
  createAdminCourse,
  getAdminCourseBySlug,
  updateAdminCourseBySlug,
  deleteAdminCourseBySlug
}))

import listCoursesHandler from '../../../server/api/admin/courses/index.get'
import createCourseHandler from '../../../server/api/admin/courses/index.post'
import getCourseHandler from '../../../server/api/admin/courses/[courseSlug]/index.get'
import updateCourseHandler from '../../../server/api/admin/courses/[courseSlug]/index.patch'
import deleteCourseHandler from '../../../server/api/admin/courses/[courseSlug]/index.delete'

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
  issuedAt: '2026-05-07T00:00:00.000Z'
} as const

const sampleCourse = {
  id: 'curso-de-lideranca',
  title: 'Curso de Lideranca',
  slug: 'curso-de-lideranca',
  shortDescription: 'Descricao curta',
  description: 'Descricao completa',
  visibility: 'draft',
  coverImageUrl: null,
  heroImageUrl: null,
  totalDurationInMinutes: 180,
  moduleIds: [],
  highlightIds: [],
  requiredCompletionRate: 80,
  certificateEnabled: true,
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

describe('admin courses api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin courses', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    listAdminCoursesForManagement.mockResolvedValue([sampleCourse])

    const response = await listCoursesHandler({} as never)

    expect(requireAuthSession).toHaveBeenCalledWith(expect.anything(), { admin: true })
    expect(response).toEqual({
      status: 'success',
      data: [sampleCourse]
    })
  })

  it('creates a course', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      title: 'Curso de Lideranca',
      slug: 'curso-de-lideranca',
      shortDescription: 'Descricao curta',
      description: 'Descricao completa',
      visibility: 'draft',
      coverImageUrl: null,
      heroImageUrl: null,
      totalDurationInMinutes: 180,
      requiredCompletionRate: 80,
      certificateEnabled: true
    })
    createAdminCourse.mockResolvedValue(sampleCourse)

    const response = await createCourseHandler({} as never)

    expect(createAdminCourse).toHaveBeenCalledWith(sampleSession, expect.objectContaining({ slug: 'curso-de-lideranca' }))
    expect(response).toEqual({
      status: 'success',
      data: sampleCourse
    })
  })

  it('gets a single course', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAdminCourseBySlug.mockResolvedValue(sampleCourse)

    const response = await getCourseHandler({
      context: {
        params: {
          courseSlug: 'curso-de-lideranca'
        }
      }
    } as never)

    expect(getAdminCourseBySlug).toHaveBeenCalledWith(sampleSession, 'curso-de-lideranca')
    expect(response).toEqual({
      status: 'success',
      data: sampleCourse
    })
  })

  it('updates a course', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleCourse,
      title: 'Curso Atualizado'
    })
    updateAdminCourseBySlug.mockResolvedValue({
      ...sampleCourse,
      title: 'Curso Atualizado'
    })

    const response = await updateCourseHandler({
      context: {
        params: {
          courseSlug: 'curso-de-lideranca'
        }
      }
    } as never)

    expect(updateAdminCourseBySlug).toHaveBeenCalledWith(
      sampleSession,
      'curso-de-lideranca',
      expect.objectContaining({ title: 'Curso Atualizado' })
    )
    expect(response.status).toBe('success')
  })

  it('soft deletes a course', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    deleteAdminCourseBySlug.mockResolvedValue({
      ...sampleCourse,
      deletedAt: '2026-05-07T12:00:00.000Z'
    })

    const response = await deleteCourseHandler({
      context: {
        params: {
          courseSlug: 'curso-de-lideranca'
        }
      }
    } as never)

    expect(deleteAdminCourseBySlug).toHaveBeenCalledWith(sampleSession, 'curso-de-lideranca')
    expect(response.status).toBe('success')
  })
})
