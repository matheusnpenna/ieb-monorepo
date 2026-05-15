import type { User } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { AuthSessionService } from '../../../server/modules/auth/application/auth-session.service'
import type { AuthUserRepository, IdentityProvider } from '../../../server/modules/auth/application/ports'

const buildUser = (overrides: Partial<User> & Pick<User, 'id' | 'email'>): User => ({
  id: overrides.id,
  role: overrides.role || 'student',
  status: overrides.status || 'active',
  fullName: overrides.fullName || 'Jane Doe',
  cpf: overrides.cpf || '12345678901',
  email: overrides.email,
  phone: overrides.phone || null,
  avatarUrl: overrides.avatarUrl || null,
  region: overrides.region || 'aluno-externo',
  lastLoginAt: overrides.lastLoginAt || null,
  createdAt: overrides.createdAt || '2026-05-08T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-05-08T00:00:00.000Z',
  deletedAt: overrides.deletedAt || null,
  createdBy: overrides.createdBy || null,
  updatedBy: overrides.updatedBy || null,
  deletedBy: overrides.deletedBy || null
})

const buildService = () => {
  const users = new Map<string, User>()
  const identityProvider = {
    verifySessionCookie: vi.fn(async () => ({
      uid: 'user-1',
      email: 'jane@example.com'
    })),
    getUser: vi.fn(async () => ({
      uid: 'user-1',
      email: 'jane@example.com',
      displayName: 'Jane Doe'
    })),
    createSessionCookie: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signUpWithEmailAndPassword: vi.fn(),
    sendPasswordRecoveryEmail: vi.fn(),
    deleteUser: vi.fn()
  } satisfies IdentityProvider
  const userRepository: AuthUserRepository = {
    findById: vi.fn(async (uid) => users.get(uid) || null),
    findActiveByCpf: vi.fn(),
    save: vi.fn(async (user) => {
      users.set(user.id, user)
    }),
    update: vi.fn()
  }
  const service = new AuthSessionService({
    identityProvider,
    userRepository,
    clock: {
      now: () => '2026-05-08T12:00:00.000Z'
    }
  })

  return {
    identityProvider,
    service,
    users
  }
}

describe('auth session service', () => {
  it('resolves a session through identity and user ports', async () => {
    const { service, users } = buildService()
    users.set('user-1', buildUser({ id: 'user-1', email: 'jane@example.com' }))

    const session = await service.resolveAuthSession('session-cookie')

    expect(session?.user.email).toBe('jane@example.com')
    expect(session?.issuedAt).toBe('2026-05-08T12:00:00.000Z')
  })

  it('creates a default user document when identity exists but Firestore user is missing', async () => {
    const { identityProvider, service, users } = buildService()

    const session = await service.resolveAuthSession('session-cookie')

    expect(identityProvider.getUser).toHaveBeenCalledWith('user-1')
    expect(users.get('user-1')?.fullName).toBe('Jane Doe')
    expect(session?.user.id).toBe('user-1')
  })
})
