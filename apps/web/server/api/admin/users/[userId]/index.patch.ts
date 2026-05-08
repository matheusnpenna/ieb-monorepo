import type { AdminUserInput, AdminUserResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { updateAdminUserById } from '../../../../utils/users'

export default defineEventHandler(async (event): Promise<AdminUserResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminUserInput>(event)
    const user = await updateAdminUserById(session, userId, {
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

    return {
      status: 'success',
      data: user
    }
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    const statusMessage =
      typeof error === 'object' &&
      error !== null &&
      'statusMessage' in error &&
      typeof error.statusMessage === 'string' &&
      error.statusMessage
        ? error.statusMessage
        : 'Nao foi possivel atualizar o usuario.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'users',
          targetId: userId || 'user',
          summary: 'Falha ao atualizar usuario no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage,
            userId: userId || null
          }
        })
      } catch {
        // Preserve original error response.
      }
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
