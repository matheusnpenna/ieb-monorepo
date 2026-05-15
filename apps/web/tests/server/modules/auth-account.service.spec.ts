import type { User } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { AuthAccountService } from '../../../server/modules/auth/application/auth-account.service'
import { AuthSessionService } from '../../../server/modules/auth/application/auth-session.service'
import type { AuthUserRepository, IdentityProvider } from '../../../server/modules/auth/application/ports'

const buildService = () => {
  const users = new Map<string, User>()
  const identityProvider = {
    signInWithEmailAndPassword: vi.fn(async () => ({
      uid: 'user-1',
      email: 'jane@example.com',
      idToken: 'id-token'
    })),
    signUpWithEmailAndPassword: vi.fn(async () => ({
      uid: 'user-1',
      email: 'jane@example.com',
      idToken: 'id-token'
    })),
    sendPasswordRecoveryEmail: vi.fn(),
    createSessionCookie: vi.fn(),
    verifySessionCookie: vi.fn(),
    getUser: vi.fn(),
    deleteUser: vi.fn()
  } satisfies IdentityProvider
  const userRepository: AuthUserRepository = {
    findById: vi.fn(async (uid) => users.get(uid) || null),
    findActiveByCpf: vi.fn(async (cpf) => [...users.values()].find((user) => user.cpf === cpf && !user.deletedAt) || null),
    save: vi.fn(async (user) => {
      users.set(user.id, user)
    }),
    update: vi.fn(async (uid, payload) => {
      const currentUser = users.get(uid)

      if (currentUser) {
        users.set(uid, {
          ...currentUser,
          ...payload
        })
      }
    })
  }
  const clock = {
    now: () => '2026-05-08T12:00:00.000Z'
  }
  const sessionService = new AuthSessionService({
    identityProvider,
    userRepository,
    clock
  })
  const accountService = new AuthAccountService({
    identityProvider,
    userRepository,
    sessionService,
    clock
  })

  return {
    accountService,
    identityProvider,
    users
  }
}

describe('auth account service', () => {
  it('registers an account through identity and user repository ports', async () => {
    const { accountService, identityProvider, users } = buildService()

    const result = await accountService.registerAccount({
      fullName: 'Jane Doe',
      cpf: '123.456.789-01',
      email: 'jane@example.com',
      password: '123456',
      phone: null,
      region: 'feira-de-santana'
    })

    expect(result).toEqual({
      user: expect.objectContaining({
        id: 'user-1',
        email: 'jane@example.com'
      }),
      idToken: 'id-token'
    })
    expect(identityProvider.signUpWithEmailAndPassword).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: '123456'
    })
    expect(users.get('user-1')?.email).toBe('jane@example.com')
  })

  it('logs in and updates last login using ports only', async () => {
    const { accountService, users } = buildService()
    users.set('user-1', {
      id: 'user-1',
      role: 'student',
      status: 'active',
      fullName: 'Jane Doe',
      cpf: '12345678901',
      email: 'jane@example.com',
      phone: null,
      avatarUrl: null,
      region: 'aluno-externo',
      lastLoginAt: null,
      createdAt: '2026-05-08T00:00:00.000Z',
      updatedAt: '2026-05-08T00:00:00.000Z',
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      deletedBy: null
    })

    const result = await accountService.loginWithEmailAndPassword({
      email: 'jane@example.com',
      password: '123456'
    })

    expect(result.user.id).toBe('user-1')
    expect(result.idToken).toBe('id-token')
    expect(users.get('user-1')?.lastLoginAt).toBe('2026-05-08T12:00:00.000Z')
  })
})
