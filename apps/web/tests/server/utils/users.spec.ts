import type { User } from '@ieb/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getFirebaseAdminCollection, getFirebaseAdminAuth, writeAdminLog } = vi.hoisted(() => ({
  getFirebaseAdminCollection: vi.fn(),
  getFirebaseAdminAuth: vi.fn(),
  writeAdminLog: vi.fn()
}))

vi.mock('../../../server/utils/firebase-admin', () => ({
  getFirebaseAdminCollection,
  getFirebaseAdminAuth
}))

vi.mock('../../../server/utils/auth', () => ({
  writeAdminLog
}))

import {
  createAdminUser,
  deleteAdminUserById,
  getAdminUserById,
  listAdminUsersForManagement,
  updateAdminUserById
} from '../../../server/utils/users'

const createDocumentSnapshot = <TDocument extends { id: string }>(document: TDocument) => ({
  id: document.id,
  exists: true,
  data: () => {
    const { id: _id, ...payload } = document

    return payload
  }
})

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

const adminSession = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin' as const,
    status: 'active' as const,
    region: 'feira-de-santana' as const,
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
}

describe('users utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin users for management', async () => {
    const userOne = buildUser({
      id: 'uid-1',
      fullName: 'Zeca',
      cpf: '12345678901',
      email: 'zeca@example.com'
    })
    const userTwo = buildUser({
      id: 'uid-2',
      fullName: 'Ana',
      cpf: '12345678902',
      email: 'ana@example.com'
    })

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [createDocumentSnapshot(userOne), createDocumentSnapshot(userTwo)]
          })
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const response = await listAdminUsersForManagement(adminSession, {
      page: 1,
      pageSize: 1
    })

    expect(response.items.map((user) => user.fullName)).toEqual(['Ana'])
    expect(response.pagination).toEqual({
      page: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false
    })
  })

  it('creates, updates, loads and soft deletes a user while syncing Firebase Authentication', async () => {
    const storedUsers = new Map<string, User>()
    const authCreateUser = vi.fn().mockResolvedValue({ uid: 'uid-1' })
    const authUpdateUser = vi.fn().mockResolvedValue(undefined)
    const authRevokeRefreshTokens = vi.fn().mockResolvedValue(undefined)

    getFirebaseAdminAuth.mockReturnValue({
      createUser: authCreateUser,
      updateUser: authUpdateUser,
      revokeRefreshTokens: authRevokeRefreshTokens
    })

    getFirebaseAdminCollection.mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          get: vi.fn().mockResolvedValue({
            docs: [...storedUsers.values()].map(createDocumentSnapshot)
          }),
          where: vi.fn((_fieldName: string, _operator: string, value: string) => ({
            get: vi.fn().mockResolvedValue({
              docs: [...storedUsers.values()]
                .filter((user) => user.cpf === value)
                .map(createDocumentSnapshot)
            })
          })),
          doc: vi.fn((documentId?: string) => ({
            get: vi.fn().mockResolvedValue(
              documentId && storedUsers.has(documentId)
                ? createDocumentSnapshot(storedUsers.get(documentId)!)
                : { exists: false }
            ),
            set: vi.fn(async (payload: User | Partial<User>) => {
              const current = documentId && storedUsers.has(documentId) ? storedUsers.get(documentId)! : null
              const nextDocument = {
                ...(current || {}),
                ...(payload as Record<string, unknown>),
                id: documentId || String((payload as { id?: string }).id || '')
              } as User

              storedUsers.set(nextDocument.id, nextDocument)
            })
          }))
        }
      }

      throw new Error(`Unexpected collection ${collectionName}`)
    })

    const createdUser = await createAdminUser(adminSession, {
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

    expect(createdUser.id).toBe('uid-1')
    expect(authCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@example.com',
        password: '123456',
        disabled: false
      })
    )

    const loadedUser = await getAdminUserById(adminSession, createdUser.id)

    expect(loadedUser.email).toBe('maria@example.com')

    const updatedUser = await updateAdminUserById(adminSession, createdUser.id, {
      fullName: 'Maria Souza',
      cpf: '12345678901',
      email: 'maria.souza@example.com',
      password: null,
      role: 'admin',
      status: 'blocked',
      phone: '75999999999',
      avatarUrl: 'https://example.com/avatar.png',
      region: 'feira-de-santana'
    })

    expect(updatedUser.fullName).toBe('Maria Souza')
    expect(authUpdateUser).toHaveBeenCalledWith(
      createdUser.id,
      expect.objectContaining({
        email: 'maria.souza@example.com',
        disabled: true
      })
    )

    const deletedUser = await deleteAdminUserById(adminSession, createdUser.id)

    expect(deletedUser.deletedAt).not.toBeNull()
    expect(authUpdateUser).toHaveBeenLastCalledWith(createdUser.id, { disabled: true })
    expect(authRevokeRefreshTokens).toHaveBeenCalledWith(createdUser.id)
    expect(writeAdminLog).toHaveBeenCalledTimes(3)
  })
})
