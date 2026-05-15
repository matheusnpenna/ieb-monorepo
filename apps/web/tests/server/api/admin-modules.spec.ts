import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
  getAccessibleModuleDetailBySlugs,
  listAdminModulesForManagement,
  createAdminModule,
  getAdminModuleBySlug,
  updateAdminModuleBySlug,
  deleteAdminModuleBySlug,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  writeAdminLog: vi.fn(),
  getAccessibleModuleDetailBySlugs: vi.fn(),
  listAdminModulesForManagement: vi.fn(),
  createAdminModule: vi.fn(),
  getAdminModuleBySlug: vi.fn(),
  updateAdminModuleBySlug: vi.fn(),
  deleteAdminModuleBySlug: vi.fn(),
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

vi.mock('../../../server/modules/course-modules/infrastructure/firebase-course-modules.repository', () => ({
  getAccessibleModuleDetailBySlugs,
  listAdminModulesForManagement,
  createAdminModule,
  getAdminModuleBySlug,
  updateAdminModuleBySlug,
  deleteAdminModuleBySlug
}))

import listModulesHandler from '../../../server/api/admin/modules/index.get'
import createModuleHandler from '../../../server/api/admin/modules/index.post'
import getModuleHandler from '../../../server/api/admin/modules/[moduleSlug]/index.get'
import updateModuleHandler from '../../../server/api/admin/modules/[moduleSlug]/index.patch'
import deleteModuleHandler from '../../../server/api/admin/modules/[moduleSlug]/index.delete'

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

const sampleModule = {
  id: 'fundamentos-da-fe',
  courseId: 'teologia-basica',
  title: 'Fundamentos da Fe',
  slug: 'fundamentos-da-fe',
  description: 'Bases introdutorias do curso.',
  order: 1,
  lessonIds: [],
  assessmentIds: [],
  estimatedDurationInMinutes: 90,
  createdAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

describe('admin modules api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin modules', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    listAdminModulesForManagement.mockResolvedValue([sampleModule])

    const response = await listModulesHandler({} as never)

    expect(requireAuthSession).toHaveBeenCalledWith(expect.anything(), { admin: true })
    expect(response).toEqual({
      status: 'success',
      data: [sampleModule]
    })
  })

  it('creates a module', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      courseId: 'teologia-basica',
      title: 'Fundamentos da Fe',
      slug: 'fundamentos-da-fe',
      description: 'Bases introdutorias do curso.',
      order: 1,
      estimatedDurationInMinutes: 90
    })
    createAdminModule.mockResolvedValue(sampleModule)

    const response = await createModuleHandler({} as never)

    expect(createAdminModule).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({ slug: 'fundamentos-da-fe', courseId: 'teologia-basica' })
    )
    expect(response).toEqual({
      status: 'success',
      data: sampleModule
    })
  })

  it('gets a single module', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAdminModuleBySlug.mockResolvedValue(sampleModule)

    const response = await getModuleHandler({
      context: {
        params: {
          moduleSlug: 'fundamentos-da-fe'
        }
      }
    } as never)

    expect(getAdminModuleBySlug).toHaveBeenCalledWith(sampleSession, 'fundamentos-da-fe')
    expect(response).toEqual({
      status: 'success',
      data: sampleModule
    })
  })

  it('updates a module', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleModule,
      title: 'Fundamentos revisados'
    })
    updateAdminModuleBySlug.mockResolvedValue({
      ...sampleModule,
      title: 'Fundamentos revisados'
    })

    const response = await updateModuleHandler({
      context: {
        params: {
          moduleSlug: 'fundamentos-da-fe'
        }
      }
    } as never)

    expect(updateAdminModuleBySlug).toHaveBeenCalledWith(
      sampleSession,
      'fundamentos-da-fe',
      expect.objectContaining({ title: 'Fundamentos revisados' })
    )
    expect(response.status).toBe('success')
  })

  it('soft deletes a module', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    deleteAdminModuleBySlug.mockResolvedValue({
      ...sampleModule,
      deletedAt: '2026-05-07T12:00:00.000Z'
    })

    const response = await deleteModuleHandler({
      context: {
        params: {
          moduleSlug: 'fundamentos-da-fe'
        }
      }
    } as never)

    expect(deleteAdminModuleBySlug).toHaveBeenCalledWith(sampleSession, 'fundamentos-da-fe')
    expect(response.status).toBe('success')
  })
})
