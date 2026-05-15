import type { AuthSessionContext, AuthSessionUser, User } from '@ieb/shared'
import type { AuthClock, AuthUserRepository, IdentityProvider } from './ports'
import { createAuthError } from '../domain/errors'
import { assertUserCanAccessPlatform, fallbackNameFromEmail } from '../domain/validation'

interface AuthSessionServiceDependencies {
  identityProvider: IdentityProvider
  userRepository: AuthUserRepository
  clock: AuthClock
}

export class AuthSessionService {
  private readonly identityProvider: IdentityProvider
  private readonly userRepository: AuthUserRepository
  private readonly clock: AuthClock

  constructor(dependencies: AuthSessionServiceDependencies) {
    this.identityProvider = dependencies.identityProvider
    this.userRepository = dependencies.userRepository
    this.clock = dependencies.clock
  }

  async createSessionCookie(idToken: string, options: { expiresIn: number }) {
    return await this.identityProvider.createSessionCookie(idToken, options)
  }

  async resolveAuthSession(sessionCookie: string | null | undefined) {
    if (!sessionCookie) {
      return null
    }

    try {
      const decodedSession = await this.identityProvider.verifySessionCookie(sessionCookie)
      const fallbackEmail =
        typeof decodedSession.email === 'string' && decodedSession.email ? decodedSession.email : undefined

      return await this.buildSessionContext(decodedSession.uid, fallbackEmail)
    } catch {
      return null
    }
  }

  async buildSessionContext(uid: string, fallbackEmail?: string): Promise<AuthSessionContext> {
    const user = await this.ensureUserDocument(uid, fallbackEmail || '')

    assertUserCanAccessPlatform(user)

    return {
      user: this.toSessionUser(user),
      issuedAt: this.clock.now()
    }
  }

  requireResolvedSession(
    session: AuthSessionContext | null,
    options?: {
      admin?: boolean
    }
  ) {
    if (!session) {
      throw createAuthError(401, 'Sessao expirada. Faca login novamente.')
    }

    if (options?.admin && session.user.role !== 'admin') {
      throw createAuthError(403, 'Acesso restrito ao painel administrativo.')
    }

    return session
  }

  private async ensureUserDocument(uid: string, email: string) {
    const existingUser = await this.userRepository.findById(uid)

    if (existingUser) {
      return existingUser
    }

    const authRecord = await this.identityProvider.getUser(uid)
    const userDocument = this.buildDefaultUserDocument(uid, authRecord.email || email, authRecord.displayName)

    await this.userRepository.save(userDocument)

    return userDocument
  }

  private buildDefaultUserDocument(uid: string, email: string, displayName?: string | null): User {
    const now = this.clock.now()

    return {
      id: uid,
      role: 'student',
      status: 'active',
      fullName: displayName?.trim() || fallbackNameFromEmail(email) || 'Aluno',
      cpf: '',
      email,
      phone: null,
      avatarUrl: null,
      region: 'aluno-externo',
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      deletedBy: null
    }
  }

  private toSessionUser(user: User): AuthSessionUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      region: user.region,
      avatarUrl: user.avatarUrl
    }
  }
}
