import type { AdminUserInput, AdminUsersData, AuthSessionContext, User, UserRegion, UserRole, UserStatus } from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from './auth'
import { getFirebaseAdminAuth, getFirebaseAdminCollection } from './firebase-admin'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_ADMIN_USERS_PAGE_SIZE = 12
const MAX_ADMIN_USERS_PAGE_SIZE = 100

const VALID_ROLES = new Set<UserRole>(['admin', 'student'])
const VALID_STATUSES = new Set<UserStatus>(['invited', 'active', 'blocked'])
const VALID_REGIONS = new Set<UserRegion>(['feira-de-santana', 'panambi', 'sertao', 'aluno-externo'])

const toTimestamp = () => new Date().toISOString()

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toUserDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<User, 'id'>)
  }) as User

const normalizeEmail = (value: string) => value.trim().toLowerCase()
const normalizeCpf = (value: string) => value.replace(/\D/g, '')
const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

const listAdminUsers = async () => {
  const snapshot = await getFirebaseAdminCollection('users').get()

  return snapshot.docs
    .map(toUserDocument)
    .filter((user) => !user.deletedAt)
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'pt-BR'))
}

const normalizePositiveInteger = (value: number | undefined, fallbackValue: number) => {
  if (!Number.isFinite(value)) {
    return fallbackValue
  }

  return Math.max(1, Math.trunc(value as number))
}

const getUserById = async (userId: string) => {
  const snapshot = await getFirebaseAdminCollection('users').doc(userId).get()

  if (!snapshot.exists) {
    return null
  }

  return toUserDocument(snapshot)
}

const getUserByCpf = async (cpf: string) => {
  const snapshot = await getFirebaseAdminCollection('users').where('cpf', '==', cpf).get()
  const validDocument = snapshot.docs.find((document) => {
    const user = toUserDocument(document)

    return !user.deletedAt
  })

  return validDocument ? toUserDocument(validDocument) : null
}

const mapFirebaseAuthError = (error: unknown): never => {
  const firebaseError = error as { code?: string }

  switch (firebaseError.code) {
    case 'auth/email-already-exists':
      throw createHttpError(400, 'Ja existe um usuario com este e-mail.')
    case 'auth/invalid-password':
      throw createHttpError(400, 'A senha precisa ter pelo menos 6 caracteres.')
    case 'auth/invalid-email':
      throw createHttpError(400, 'Informe um e-mail valido.')
    case 'auth/user-not-found':
      throw createHttpError(404, 'Usuario nao encontrado no Firebase Authentication.')
    default:
      throw createHttpError(500, 'Nao foi possivel sincronizar o usuario com o Firebase Authentication.')
  }
}

const assertAdminUserPayload = async (
  input: AdminUserInput,
  options?: {
    existingUser?: User | null
  }
) => {
  const existingUser = options?.existingUser || null
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedCpf = normalizeCpf(input.cpf)
  const normalizedPhone = normalizeOptionalText(input.phone)
  const normalizedAvatarUrl = normalizeOptionalText(input.avatarUrl)
  const normalizedPassword = typeof input.password === 'string' ? input.password.trim() : ''

  if (!input.fullName.trim()) {
    throw createHttpError(400, 'Informe o nome completo do usuario.')
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw createHttpError(400, 'Informe um e-mail valido.')
  }

  if (!/^\d{11}$/.test(normalizedCpf)) {
    throw createHttpError(400, 'Informe um CPF valido com 11 digitos.')
  }

  if (!VALID_ROLES.has(input.role)) {
    throw createHttpError(400, 'Informe um perfil de usuario valido.')
  }

  if (!VALID_STATUSES.has(input.status)) {
    throw createHttpError(400, 'Informe um status de usuario valido.')
  }

  if (!VALID_REGIONS.has(input.region)) {
    throw createHttpError(400, 'Informe uma regiao valida para o usuario.')
  }

  if (!existingUser && normalizedPassword.length < 6) {
    throw createHttpError(400, 'Informe uma senha com pelo menos 6 caracteres.')
  }

  if (existingUser && normalizedPassword && normalizedPassword.length < 6) {
    throw createHttpError(400, 'A nova senha precisa ter pelo menos 6 caracteres.')
  }

  const userWithSameCpf = await getUserByCpf(normalizedCpf)

  if (userWithSameCpf && userWithSameCpf.id !== existingUser?.id) {
    throw createHttpError(400, 'Ja existe um usuario com este CPF.')
  }

  return {
    email: normalizedEmail,
    cpf: normalizedCpf,
    phone: normalizedPhone,
    avatarUrl: normalizedAvatarUrl,
    password: normalizedPassword || null
  }
}

const buildUserPayload = async (
  input: AdminUserInput,
  options?: {
    existingUser?: User | null
    userId?: string
  }
) => {
  const existingUser = options?.existingUser || null
  const normalized = await assertAdminUserPayload(input, { existingUser })
  const timestamp = toTimestamp()

  return {
    id: options?.userId || existingUser?.id || '',
    role: input.role,
    status: input.status,
    fullName: input.fullName.trim(),
    cpf: normalized.cpf,
    email: normalized.email,
    phone: normalized.phone,
    avatarUrl: normalized.avatarUrl,
    region: input.region,
    lastLoginAt: existingUser?.lastLoginAt || null,
    createdAt: existingUser?.createdAt || timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: existingUser?.createdBy || null,
    updatedBy: null,
    deletedBy: null,
    password: normalized.password
  }
}

export const listAdminUsersForManagement = async (
  session: AuthSessionContext,
  options?: {
    page?: number
    pageSize?: number
  }
): Promise<AdminUsersData> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const users = await listAdminUsers()
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

export const getAdminUserById = async (session: AuthSessionContext, userId: string): Promise<User> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedUserId = userId.trim()

  if (!normalizedUserId) {
    throw createHttpError(400, 'Informe um identificador valido para o usuario.')
  }

  const user = await getUserById(normalizedUserId)

  if (!user || user.deletedAt) {
    throw createHttpError(404, 'Usuario nao encontrado.')
  }

  return user
}

export const createAdminUser = async (session: AuthSessionContext, input: AdminUserInput): Promise<User> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const payload = await buildUserPayload(input)
  let createdAuthUid: string | null = null

  try {
    const authRecord = await getFirebaseAdminAuth().createUser({
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

    await getFirebaseAdminCollection('users').doc(authRecord.uid).set(userDocument)

    await writeAdminLog(session, {
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
      await getFirebaseAdminAuth().deleteUser(createdAuthUid).catch(() => undefined)
    }

    mapFirebaseAuthError(error)

    throw error
  }
}

export const updateAdminUserById = async (session: AuthSessionContext, userId: string, input: AdminUserInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const existingUser = await getAdminUserById(session, userId)
  const payload = await buildUserPayload(input, {
    existingUser,
    userId: existingUser.id
  })

  try {
    await getFirebaseAdminAuth().updateUser(existingUser.id, {
      email: payload.email,
      password: payload.password || undefined,
      displayName: payload.fullName,
      disabled: payload.status === 'blocked'
    })
  } catch (error) {
    mapFirebaseAuthError(error)
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

  await getFirebaseAdminCollection('users').doc(existingUser.id).set(updatedUser, { merge: true })

  await writeAdminLog(session, {
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

export const deleteAdminUserById = async (session: AuthSessionContext, userId: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const existingUser = await getAdminUserById(session, userId)
  const timestamp = toTimestamp()

  await getFirebaseAdminCollection('users').doc(existingUser.id).set(
    {
      deletedAt: timestamp,
      deletedBy: session.user.id,
      updatedAt: timestamp,
      updatedBy: session.user.id,
      status: 'blocked'
    },
    { merge: true }
  )

  try {
    await getFirebaseAdminAuth().updateUser(existingUser.id, {
      disabled: true
    })
    await getFirebaseAdminAuth().revokeRefreshTokens(existingUser.id)
  } catch (error) {
    mapFirebaseAuthError(error)
  }

  const deletedUser: User = {
    ...existingUser,
    status: 'blocked',
    deletedAt: timestamp,
    deletedBy: session.user.id,
    updatedAt: timestamp,
    updatedBy: session.user.id
  }

  await writeAdminLog(session, {
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
