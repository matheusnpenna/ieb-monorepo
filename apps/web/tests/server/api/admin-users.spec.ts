import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
  listAdminUsersForManagement,
  createAdminUser,
  getAdminUserById,
  updateAdminUserById,
  deleteAdminUserById,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  writeAdminLog: vi.fn(),
  listAdminUsersForManagement: vi.fn(),
  createAdminUser: vi.fn(),
  getAdminUserById: vi.fn(),
  updateAdminUserById: vi.fn(),
  deleteAdminUserById: vi.fn(),
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

vi.mock('../../../server/modules/users/users.module', () => ({
  getUsersModule: () => ({
    adminLog: {
      write: writeAdminLog
    },
    usersService: {
      listAdminUsersForManagement,
      createAdminUser,
      getAdminUserById,
      updateAdminUserById,
      deleteAdminUserById
    }
  })
}))

import listUsersHandler from '../../../server/api/admin/users/index.get'
import createUserHandler from '../../../server/api/admin/users/index.post'
import getUserHandler from '../../../server/api/admin/users/[userId]/index.get'
import updateUserHandler from '../../../server/api/admin/users/[userId]/index.patch'
import deleteUserHandler from '../../../server/api/admin/users/[userId]/index.delete'

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

const sampleUser = {
  id: 'uid-1',
  role: 'student',
  status: 'active',
  fullName: 'Maria Silva',
  cpf: '12345678901',
  email: 'maria@example.com',
  phone: null,
  avatarUrl: null,
  region: 'aluno-externo',
  lastLoginAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

describe('admin users api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin users', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    listAdminUsersForManagement.mockResolvedValue({
      items: [sampleUser],
      pagination: {
        page: 1,
        pageSize: 12,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      }
    })

    const response = await listUsersHandler({
      node: {
        req: {
          url: '/api/admin/users?page=1&pageSize=12'
        }
      }
    } as never)

    expect(response).toEqual({
      status: 'success',
      data: {
        items: [sampleUser],
        pagination: {
          page: 1,
          pageSize: 12,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
    })
    expect(listAdminUsersForManagement).toHaveBeenCalledWith(sampleSession, {
      page: undefined,
      pageSize: undefined
    })
  })

  it('creates a user', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleUser,
      password: '123456'
    })
    createAdminUser.mockResolvedValue(sampleUser)

    const response = await createUserHandler({} as never)

    expect(createAdminUser).toHaveBeenCalledWith(
      sampleSession,
      expect.objectContaining({ email: sampleUser.email, password: '123456' })
    )
    expect(response).toEqual({
      status: 'success',
      data: sampleUser
    })
  })

  it('gets a single user', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAdminUserById.mockResolvedValue(sampleUser)

    const response = await getUserHandler({
      context: {
        params: {
          userId: sampleUser.id
        }
      }
    } as never)

    expect(response).toEqual({
      status: 'success',
      data: sampleUser
    })
  })

  it('updates a user', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleUser,
      fullName: 'Maria Souza',
      password: null
    })
    updateAdminUserById.mockResolvedValue({
      ...sampleUser,
      fullName: 'Maria Souza'
    })

    const response = await updateUserHandler({
      context: {
        params: {
          userId: sampleUser.id
        }
      }
    } as never)

    expect(updateAdminUserById).toHaveBeenCalledWith(
      sampleSession,
      sampleUser.id,
      expect.objectContaining({ fullName: 'Maria Souza' })
    )
    expect(response.status).toBe('success')
  })

  it('soft deletes a user', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    deleteAdminUserById.mockResolvedValue({
      ...sampleUser,
      deletedAt: '2026-05-08T12:00:00.000Z'
    })

    const response = await deleteUserHandler({
      context: {
        params: {
          userId: sampleUser.id
        }
      }
    } as never)

    expect(deleteAdminUserById).toHaveBeenCalledWith(sampleSession, sampleUser.id)
    expect(response.status).toBe('success')
  })
})
