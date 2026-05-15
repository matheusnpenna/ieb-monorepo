import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  service,
  adminLog,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  service: {
    listAdminClassroomsForManagement: vi.fn(),
    createAdminClassroom: vi.fn(),
    getAdminClassroomByUuid: vi.fn(),
    updateAdminClassroomByUuid: vi.fn(),
    deleteAdminClassroomByUuid: vi.fn()
  },
  adminLog: {
    write: vi.fn()
  },
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

vi.mock('../../../server/modules/classrooms/classrooms.module', () => ({
  getClassroomsModule: () => ({
    service,
    adminLog
  })
}))

import listClassroomsHandler from '../../../server/api/admin/classrooms/index.get'
import createClassroomHandler from '../../../server/api/admin/classrooms/index.post'
import getClassroomHandler from '../../../server/api/admin/classrooms/[classroomUuid]/index.get'
import updateClassroomHandler from '../../../server/api/admin/classrooms/[classroomUuid]/index.patch'
import deleteClassroomHandler from '../../../server/api/admin/classrooms/[classroomUuid]/index.delete'

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

const sampleClassroom = {
  id: '83b5fb4a-50ad-453e-a401-8deecf95804d',
  name: 'Turma Principal 2026',
  uuid: '83b5fb4a-50ad-453e-a401-8deecf95804d',
  description: 'Turma principal do ano letivo.',
  registrationOpen: true,
  registrationStartsAt: '2026-05-08T10:00:00.000Z',
  registrationEndsAt: '2026-05-30T22:00:00.000Z',
  linkedCourseIds: ['curso-de-teologia-basica'],
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

describe('admin classrooms api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin classrooms', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.listAdminClassroomsForManagement.mockResolvedValue([sampleClassroom])

    const response = await listClassroomsHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: [sampleClassroom]
    })
  })

  it('creates a classroom', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue(sampleClassroom)
    service.createAdminClassroom.mockResolvedValue(sampleClassroom)

    const response = await createClassroomHandler({} as never)

    expect(service.createAdminClassroom).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({ uuid: sampleClassroom.uuid })
    )
    expect(response).toEqual({
      status: 'success',
      data: sampleClassroom
    })
  })

  it('gets a single classroom', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.getAdminClassroomByUuid.mockResolvedValue(sampleClassroom)

    const response = await getClassroomHandler({
      context: {
        params: {
          classroomUuid: sampleClassroom.uuid
        }
      }
    } as never)

    expect(response).toEqual({
      status: 'success',
      data: sampleClassroom
    })
  })

  it('updates a classroom', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleClassroom,
      name: 'Turma Principal revisada'
    })
    service.updateAdminClassroomByUuid.mockResolvedValue({
      ...sampleClassroom,
      name: 'Turma Principal revisada'
    })

    const response = await updateClassroomHandler({
      context: {
        params: {
          classroomUuid: sampleClassroom.uuid
        }
      }
    } as never)

    expect(service.updateAdminClassroomByUuid).toHaveBeenCalledWith(
      sampleSession,
      sampleClassroom.uuid,
      expect.objectContaining({ name: 'Turma Principal revisada' })
    )
    expect(response.status).toBe('success')
  })

  it('soft deletes a classroom', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    service.deleteAdminClassroomByUuid.mockResolvedValue({
      ...sampleClassroom,
      deletedAt: '2026-05-08T12:00:00.000Z'
    })

    const response = await deleteClassroomHandler({
      context: {
        params: {
          classroomUuid: sampleClassroom.uuid
        }
      }
    } as never)

    expect(service.deleteAdminClassroomByUuid).toHaveBeenCalledWith(sampleSession, sampleClassroom.uuid)
    expect(response.status).toBe('success')
  })
})
