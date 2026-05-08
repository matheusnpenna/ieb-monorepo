import type { AdminUserResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { getAdminUserById } from '../../../../utils/users'

export default defineEventHandler(async (event): Promise<AdminUserResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const user = await getAdminUserById(session, userId)

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
        : 'Nao foi possivel carregar o usuario.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'users',
          targetId: userId || 'user',
          summary: 'Falha ao carregar usuario no painel administrativo.',
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
