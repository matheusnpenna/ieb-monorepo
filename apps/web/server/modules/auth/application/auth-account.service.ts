import type { AuthSessionUser, User } from '@ieb/shared'
import type { AuthClock, AuthUserRepository, IdentityProvider, RegisterAccountInput } from './ports'
import { createAuthError } from '../domain/errors'
import {
  EMAIL_REGEX,
  assertEmailAndPassword,
  assertRegisterPayload,
  mapIdentityErrorMessage,
  normalizeCpf,
  normalizeEmail,
  normalizeOptionalText
} from '../domain/validation'
import { AuthSessionService } from './auth-session.service'

interface AuthAccountServiceDependencies {
  identityProvider: IdentityProvider
  userRepository: AuthUserRepository
  sessionService: AuthSessionService
  clock: AuthClock
}

export class AuthAccountService {
  private readonly identityProvider: IdentityProvider
  private readonly userRepository: AuthUserRepository
  private readonly sessionService: AuthSessionService
  private readonly clock: AuthClock

  constructor(dependencies: AuthAccountServiceDependencies) {
    this.identityProvider = dependencies.identityProvider
    this.userRepository = dependencies.userRepository
    this.sessionService = dependencies.sessionService
    this.clock = dependencies.clock
  }

  async loginWithEmailAndPassword(input: { email: string; password: string }) {
    const email = normalizeEmail(input.email)
    const password = input.password

    assertEmailAndPassword(email, password)

    const authResponse = await this.mapIdentityErrors(() =>
      this.identityProvider.signInWithEmailAndPassword({
        email,
        password
      })
    )
    const session = await this.sessionService.buildSessionContext(authResponse.uid, authResponse.email)

    await this.updateLastLoginAt(authResponse.uid)

    return {
      user: session.user,
      idToken: authResponse.idToken,
      session
    }
  }

  async registerAccount(input: RegisterAccountInput): Promise<{
    user: AuthSessionUser
    idToken: string
  }> {
    const normalizedEmail = normalizeEmail(input.email)
    const normalizedCpf = normalizeCpf(input.cpf)

    assertRegisterPayload({
      ...input,
      email: normalizedEmail,
      cpf: normalizedCpf
    })

    await this.assertCpfIsAvailable(normalizedCpf)

    let identityUserId: string | null = null

    try {
      const signUpResponse = await this.mapIdentityErrors(() =>
        this.identityProvider.signUpWithEmailAndPassword({
          email: normalizedEmail,
          password: input.password
        })
      )

      identityUserId = signUpResponse.uid

      const userDocument = await this.createRegisteredStudentDocument(identityUserId, {
        ...input,
        email: normalizedEmail,
        cpf: normalizedCpf
      })

      return {
        user: this.toSessionUser(userDocument),
        idToken: signUpResponse.idToken
      }
    } catch (error) {
      if (identityUserId) {
        await this.identityProvider.deleteUser(identityUserId).catch(() => undefined)
      }

      throw error
    }
  }

  async sendPasswordRecoveryEmail(emailInput: string) {
    const email = normalizeEmail(emailInput)

    if (!EMAIL_REGEX.test(email)) {
      throw createAuthError(400, 'Informe um e-mail valido.')
    }

    try {
      await this.mapIdentityErrors(() => this.identityProvider.sendPasswordRecoveryEmail(email))
    } catch (error) {
      const httpError = error as { statusMessage?: string }

      if (httpError.statusMessage === 'Nao encontramos uma conta com este e-mail.') {
        return
      }

      throw error
    }
  }

  private async updateLastLoginAt(uid: string) {
    const now = this.clock.now()

    await this.userRepository.update(uid, {
      updatedAt: now,
      lastLoginAt: now
    })
  }

  private async assertCpfIsAvailable(cpf: string) {
    const activeMatch = await this.userRepository.findActiveByCpf(cpf)

    if (activeMatch) {
      throw createAuthError(400, 'Ja existe uma conta cadastrada com este CPF.')
    }
  }

  private async createRegisteredStudentDocument(uid: string, input: RegisterAccountInput) {
    const now = this.clock.now()
    const normalizedEmail = normalizeEmail(input.email)
    const normalizedCpf = normalizeCpf(input.cpf)
    const userDocument: User = {
      id: uid,
      role: 'student',
      status: 'active',
      fullName: input.fullName.trim(),
      cpf: normalizedCpf,
      email: normalizedEmail,
      phone: normalizeOptionalText(input.phone),
      avatarUrl: null,
      region: input.region,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      deletedBy: null
    }

    await this.userRepository.save(userDocument)

    return userDocument
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

  private async mapIdentityErrors<TResponse>(operation: () => Promise<TResponse>) {
    try {
      return await operation()
    } catch (error) {
      const identityError = error as { code?: string; data?: { error?: { message?: string } }; message?: string }
      const code = identityError?.data?.error?.message || identityError?.code || identityError?.message

      throw createAuthError(400, mapIdentityErrorMessage(code))
    }
  }
}
