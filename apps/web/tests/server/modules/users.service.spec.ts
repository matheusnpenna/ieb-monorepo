import type { AuthSessionContext, User } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { UsersService } from '../../../server/modules/users/application/users.service'
import type {
  AdminLogPort,
  UserAuthProvider,
  UserRepository
} from '../../../server/modules/users/application/ports'

const adminSession: AuthSessionContext = {
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
}

const buildUser = (overrides: Partial<User> & Pick<User, 'id' | 'fullName' | 'cpf' | 'email'>): User => ({
  id: overrides.id,
  role: overrides.role || 'student',
  status: overrides.status || 'active',
  fullName: overrides.fullName,
  cpf: overrides.cpf,
  email: overrides.email,
  phone: overrides.phone || null,
  avatarUrl: overrides.avatarUrl || null,
  region: overrides.region || 'aluno-externo',
  lastLoginAt: overrides.lastLoginAt || null,
  createdAt: overrides.createdAt || '2026-05-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-05-08T00:00:00.000Z',
  deletedAt: overrides.deletedAt || null,
  createdBy: overrides.createdBy || 'admin-1',
  updatedBy: overrides.updatedBy || 'admin-1',
  deletedBy: overrides.deletedBy || null
})

const buildService = () => {
  const users = new Map<string, User>()
  const repository: UserRepository = {
    listAll: vi.fn(async () => [...users.values()]),
    findById: vi.fn(async (userId) => users.get(userId) || null),
    findActiveByCpf: vi.fn(async (cpf) => [...users.values()].find((user) => user.cpf === cpf && !user.deletedAt) || null),
    save: vi.fn(async (user) => {
      users.set(user.id, user)
    })
  }
  const authProvider: UserAuthProvider = {
    createUser: vi.fn(async () => ({ uid: 'uid-1' })),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    revokeRefreshTokens: vi.fn()
  }
  const adminLog: AdminLogPort = {
    write: vi.fn()
  }
  const service = new UsersService({
    repository,
    authProvider,
    adminLog,
    clock: {
      now: () => '2026-05-08T12:00:00.000Z'
    }
  })

  return {
    adminLog,
    authProvider,
    service,
    users
  }
}

describe('users service', () => {
  it('creates an admin user through auth, repository and log ports', async () => {
    const { adminLog, authProvider, service, users } = buildService()

    const user = await service.createAdminUser(adminSession, {
      fullName: 'Maria Silva',
      cpf: '123.456.789-01',
      email: 'maria@example.com',
      password: '123456',
      role: 'student',
      status: 'active',
      phone: null,
      avatarUrl: null,
      region: 'aluno-externo'
    })

    expect(user.id).toBe('uid-1')
    expect(user.cpf).toBe('12345678901')
    expect(users.get('uid-1')).toEqual(user)
    expect(authProvider.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@example.com',
        disabled: false
      })
    )
    expect(adminLog.write).toHaveBeenCalledWith(
      adminSession,
      expect.objectContaining({
        action: 'create',
        targetCollection: 'users',
        targetId: 'uid-1'
      })
    )
  })

  it('lists active users sorted and paginated', async () => {
    const { service, users } = buildService()
    users.set('uid-1', buildUser({ id: 'uid-1', fullName: 'Zeca', cpf: '12345678901', email: 'zeca@example.com' }))
    users.set('uid-2', buildUser({ id: 'uid-2', fullName: 'Ana', cpf: '12345678902', email: 'ana@example.com' }))

    const result = await service.listAdminUsersForManagement(adminSession, {
      page: 1,
      pageSize: 1
    })

    expect(result.items.map((user) => user.fullName)).toEqual(['Ana'])
    expect(result.pagination.totalPages).toBe(2)
  })
})
