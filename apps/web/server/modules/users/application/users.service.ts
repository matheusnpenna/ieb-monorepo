import type { AdminUserInput, AdminUsersData, AuthSessionContext, User } from '@ieb/shared'
import type { AdminLogPort, UserAuthProvider, UserClock, UserRepository } from './ports'
import { createUserError } from '../domain/errors'
import {
  DEFAULT_ADMIN_USERS_PAGE_SIZE,
  MAX_ADMIN_USERS_PAGE_SIZE,
  assertAdminUserInput,
  normalizeCpf,
  normalizeEmail,
  normalizeOptionalText,
  normalizePositiveInteger
} from '../domain/validation'

interface UsersServiceDependencies {
  repository: UserRepository
  authProvider: UserAuthProvider
  adminLog: AdminLogPort
  clock: UserClock
}

interface NormalizedUserPayload extends Omit<User, 'id'> {
  id: string
  password: string | null
}

export class UsersService {
  private readonly repository: UserRepository
  private readonly authProvider: UserAuthProvider
  private readonly adminLog: AdminLogPort
  private readonly clock: UserClock

  constructor(dependencies: UsersServiceDependencies) {
    this.repository = dependencies.repository
    this.authProvider = dependencies.authProvider
    this.adminLog = dependencies.adminLog
    this.clock = dependencies.clock
  }

  async listAdminUsersForManagement(
    session: AuthSessionContext,
    options?: {
      page?: number
      pageSize?: number
    }
  ): Promise<AdminUsersData> {
    this.assertAdminSession(session)

    const users = (await this.repository.listAll())
      .filter((user) => !user.deletedAt)
      .sort((left, right) => left.fullName.localeCompare(right.fullName, 'pt-BR'))
    const pageSize = Math.min(
      normalizePositiveInteger(options?.pageSize, DEFAULT_ADMIN_USERS_PAGE_SIZE),
      MAX_ADMIN_USERS_PAGE_SIZE
    )
    const totalItems = users.length
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1
    const requestedPage = normalizePositiveInteger(options?.page, 1)
    const page = Math.min(requestedPage, totalPages)
    const startIndex = (page - 1) * pageSize
    const items = users.slice(startIndex, startIndex + pageSize)

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    }
  }

  async getAdminUserById(session: AuthSessionContext, userId: string): Promise<User> {
    this.assertAdminSession(session)

    return await this.getActiveUserById(userId)
  }

  async createAdminUser(session: AuthSessionContext, input: AdminUserInput): Promise<User> {
    this.assertAdminSession(session)

    const payload = await this.buildUserPayload(input)
    let createdAuthUid: string | null = null

    try {
      const authRecord = await this.authProvider.createUser({
        email: payload.email,
        password: payload.password || undefined,
        displayName: payload.fullName,
        disabled: payload.status === 'blocked'
      })

      createdAuthUid = authRecord.uid

      const userDocument: User = {
        id: authRecord.uid,
        role: payload.role,
        status: payload.status,
        fullName: payload.fullName,
        cpf: payload.cpf,
        email: payload.email,
        phone: payload.phone,
        avatarUrl: payload.avatarUrl,
        region: payload.region,
        lastLoginAt: null,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        deletedAt: null,
        createdBy: session.user.id,
        updatedBy: session.user.id,
        deletedBy: null
      }

      await this.repository.save(userDocument)

      await this.adminLog.write(session, {
        action: 'create',
        targetCollection: 'users',
        targetId: userDocument.id,
        summary: 'Criou um novo usuario no painel administrativo.',
        metadata: {
          role: userDocument.role,
          status: userDocument.status,
          region: userDocument.region
        }
      })

      return userDocument
    } catch (error) {
      if (createdAuthUid) {
        await this.authProvider.deleteUser(createdAuthUid).catch(() => undefined)
      }

      this.mapAuthError(error)
    }
  }

  async updateAdminUserById(session: AuthSessionContext, userId: string, input: AdminUserInput) {
    this.assertAdminSession(session)

    const existingUser = await this.getActiveUserById(userId)
    const payload = await this.buildUserPayload(input, {
      existingUser,
      userId: existingUser.id
    })

    try {
      await this.authProvider.updateUser(existingUser.id, {
        email: payload.email,
        password: payload.password || undefined,
        displayName: payload.fullName,
        disabled: payload.status === 'blocked'
      })
    } catch (error) {
      this.mapAuthError(error)
    }

    const updatedUser: User = {
      id: existingUser.id,
      role: payload.role,
      status: payload.status,
      fullName: payload.fullName,
      cpf: payload.cpf,
      email: payload.email,
      phone: payload.phone,
      avatarUrl: payload.avatarUrl,
      region: payload.region,
      lastLoginAt: existingUser.lastLoginAt,
      createdAt: existingUser.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: null,
      createdBy: existingUser.createdBy,
      updatedBy: session.user.id,
      deletedBy: null
    }

    await this.repository.save(updatedUser, { merge: true })

    await this.adminLog.write(session, {
      action: 'update',
      targetCollection: 'users',
      targetId: updatedUser.id,
      summary: 'Atualizou um usuario do painel administrativo.',
      metadata: {
        role: updatedUser.role,
        status: updatedUser.status,
        region: updatedUser.region
      }
    })

    return updatedUser
  }

  async deleteAdminUserById(session: AuthSessionContext, userId: string) {
    this.assertAdminSession(session)

    const existingUser = await this.getActiveUserById(userId)
    const timestamp = this.clock.now()

    await this.repository.save(
      {
        ...existingUser,
        status: 'blocked',
        deletedAt: timestamp,
        deletedBy: session.user.id,
        updatedAt: timestamp,
        updatedBy: session.user.id
      },
      { merge: true }
    )

    try {
      await this.authProvider.updateUser(existingUser.id, {
        disabled: true
      })
      await this.authProvider.revokeRefreshTokens(existingUser.id)
    } catch (error) {
      this.mapAuthError(error)
    }

    const deletedUser: User = {
      ...existingUser,
      status: 'blocked',
      deletedAt: timestamp,
      deletedBy: session.user.id,
      updatedAt: timestamp,
      updatedBy: session.user.id
    }

    await this.adminLog.write(session, {
      action: 'delete',
      targetCollection: 'users',
      targetId: deletedUser.id,
      summary: 'Excluiu um usuario do painel administrativo.',
      metadata: {
        role: deletedUser.role,
        email: deletedUser.email
      }
    })

    return deletedUser
  }

  private async getActiveUserById(userId: string) {
    const normalizedUserId = userId.trim()

    if (!normalizedUserId) {
      throw createUserError(400, 'Informe um identificador valido para o usuario.')
    }

    const user = await this.repository.findById(normalizedUserId)

    if (!user || user.deletedAt) {
      throw createUserError(404, 'Usuario nao encontrado.')
    }

    return user
  }

  private async buildUserPayload(
    input: AdminUserInput,
    options?: {
      existingUser?: User | null
      userId?: string
    }
  ): Promise<NormalizedUserPayload> {
    const existingUser = options?.existingUser || null

    assertAdminUserInput(input, {
      hasExistingUser: Boolean(existingUser)
    })

    const normalizedEmail = normalizeEmail(input.email)
    const normalizedCpf = normalizeCpf(input.cpf)
    const normalizedPassword = typeof input.password === 'string' ? input.password.trim() : ''
    const userWithSameCpf = await this.repository.findActiveByCpf(normalizedCpf)

    if (userWithSameCpf && userWithSameCpf.id !== existingUser?.id) {
      throw createUserError(400, 'Ja existe um usuario com este CPF.')
    }

    const timestamp = this.clock.now()

    return {
      id: options?.userId || existingUser?.id || '',
      role: input.role,
      status: input.status,
      fullName: input.fullName.trim(),
      cpf: normalizedCpf,
      email: normalizedEmail,
      phone: normalizeOptionalText(input.phone),
      avatarUrl: normalizeOptionalText(input.avatarUrl),
      region: input.region,
      lastLoginAt: existingUser?.lastLoginAt || null,
      createdAt: existingUser?.createdAt || timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      createdBy: existingUser?.createdBy || null,
      updatedBy: null,
      deletedBy: null,
      password: normalizedPassword || null
    }
  }

  private mapAuthError(error: unknown): never {
    const firebaseError = error as { code?: string }

    switch (firebaseError.code) {
      case 'auth/email-already-exists':
        throw createUserError(400, 'Ja existe um usuario com este e-mail.')
      case 'auth/invalid-password':
        throw createUserError(400, 'A senha precisa ter pelo menos 6 caracteres.')
      case 'auth/invalid-email':
        throw createUserError(400, 'Informe um e-mail valido.')
      case 'auth/user-not-found':
        throw createUserError(404, 'Usuario nao encontrado no Firebase Authentication.')
      default:
        throw createUserError(500, 'Nao foi possivel sincronizar o usuario com o Firebase Authentication.')
    }
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createUserError(403, 'Acesso restrito ao painel administrativo.')
    }
  }
}
