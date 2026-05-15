import type {
  AdminUserEnrollmentsInput,
  AdminUserEnrollmentsResponse,
  AdminUserInput,
  AdminUserResponse,
  AdminUsersResponse,
  AuthSessionContext
} from '@ieb/shared'
import { getQuery, readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../auth/interfaces/http/session'
import { getUsersModule } from '../../users.module'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const normalizeAdminUserInput = (body: AdminUserInput | null | undefined): AdminUserInput => ({
  fullName: body?.fullName || '',
  cpf: body?.cpf || '',
  email: body?.email || '',
  password: body?.password ?? null,
  role: body?.role || 'student',
  status: body?.status || 'active',
  phone: body?.phone ?? null,
  avatarUrl: body?.avatarUrl ?? null,
  region: body?.region || 'aluno-externo'
})

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    action: 'create' | 'update' | 'delete'
    targetCollection: 'users' | 'enrollments'
    targetId: string
    summary: string
    statusCode: number
    statusMessage: string
    userId?: string | null
  }
) => {
  if (!session) {
    return
  }

  try {
    await getUsersModule().adminLog.write(session, {
      action: input.action,
      targetCollection: input.targetCollection,
      targetId: input.targetId,
      summary: input.summary,
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage,
        ...(input.userId === undefined ? {} : { userId: input.userId })
      }
    })
  } catch {
    // Preserve original error response.
  }
}

export const handleListAdminUsers = async (event: H3Event): Promise<AdminUsersResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const page = typeof query.page === 'string' ? Number(query.page) : undefined
    const pageSize = typeof query.pageSize === 'string' ? Number(query.pageSize) : undefined
    const users = await getUsersModule().usersService.listAdminUsersForManagement(session, {
      page,
      pageSize
    })

    return {
      status: 'success',
      data: users
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os usuarios do painel.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'users',
      targetId: 'list',
      summary: 'Falha ao carregar listagem administrativa de usuarios.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleCreateAdminUser = async (event: H3Event): Promise<AdminUserResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminUserInput>(event)
    const user = await getUsersModule().usersService.createAdminUser(session, normalizeAdminUserInput(body))

    return {
      status: 'success',
      data: user
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar o usuario.')

    await writeFailureLog(session, {
      action: 'create',
      targetCollection: 'users',
      targetId: 'new',
      summary: 'Falha ao criar usuario no painel administrativo.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleGetAdminUser = async (event: H3Event): Promise<AdminUserResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const user = await getUsersModule().usersService.getAdminUserById(session, userId)

    return {
      status: 'success',
      data: user
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar o usuario.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'users',
      targetId: userId || 'user',
      summary: 'Falha ao carregar usuario no painel administrativo.',
      statusCode,
      statusMessage,
      userId: userId || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleUpdateAdminUser = async (event: H3Event): Promise<AdminUserResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminUserInput>(event)
    const user = await getUsersModule().usersService.updateAdminUserById(
      session,
      userId,
      normalizeAdminUserInput(body)
    )

    return {
      status: 'success',
      data: user
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar o usuario.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'users',
      targetId: userId || 'user',
      summary: 'Falha ao atualizar usuario no painel administrativo.',
      statusCode,
      statusMessage,
      userId: userId || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleDeleteAdminUser = async (event: H3Event): Promise<AdminUserResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const user = await getUsersModule().usersService.deleteAdminUserById(session, userId)

    return {
      status: 'success',
      data: user
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover o usuario.')

    await writeFailureLog(session, {
      action: 'delete',
      targetCollection: 'users',
      targetId: userId || 'user',
      summary: 'Falha ao remover usuario no painel administrativo.',
      statusCode,
      statusMessage,
      userId: userId || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleListAdminUserEnrollments = async (
  event: H3Event
): Promise<AdminUserEnrollmentsResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const data = await getUsersModule().userEnrollmentsService.listAdminUserEnrollments(session, userId)

    return {
      status: 'success',
      data
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as matriculas do usuario.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'enrollments',
      targetId: userId || 'user',
      summary: 'Falha ao carregar matriculas de usuario no painel administrativo.',
      statusCode,
      statusMessage,
      userId: userId || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleUpdateAdminUserEnrollments = async (
  event: H3Event
): Promise<AdminUserEnrollmentsResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminUserEnrollmentsInput>(event)
    const data = await getUsersModule().userEnrollmentsService.updateAdminUserEnrollments(session, userId, {
      courseIds: Array.isArray(body?.courseIds) ? body.courseIds : []
    })

    return {
      status: 'success',
      message: 'Matriculas atualizadas com sucesso.',
      data
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar as matriculas do usuario.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'enrollments',
      targetId: userId || 'user',
      summary: 'Falha ao atualizar matriculas de usuario no painel administrativo.',
      statusCode,
      statusMessage,
      userId: userId || null
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
