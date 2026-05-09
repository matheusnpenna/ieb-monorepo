import type { AdminUserEnrollmentsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../../utils/auth'
import { listAdminUserEnrollments } from '../../../../../utils/enrollments'

export default defineEventHandler(async (event): Promise<AdminUserEnrollmentsResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const data = await listAdminUserEnrollments(session, userId)

    return {
      status: 'success',
      data
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
        : 'Nao foi possivel carregar as matriculas do usuario.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'enrollments',
          targetId: userId || 'user',
          summary: 'Falha ao carregar matriculas de usuario no painel administrativo.',
          metadata: {
            userId: userId || null,
            statusCode,
            statusMessage
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
