import type { AdminUserEnrollmentsInput, AdminUserEnrollmentsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../../utils/auth'
import { updateAdminUserEnrollments } from '../../../../../utils/enrollments'

export default defineEventHandler(async (event): Promise<AdminUserEnrollmentsResponse> => {
  let session: AuthSessionContext | null = null
  const userId = String(event.context.params?.userId ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminUserEnrollmentsInput>(event)
    const data = await updateAdminUserEnrollments(session, userId, {
      courseIds: Array.isArray(body?.courseIds) ? body.courseIds : []
    })

    return {
      status: 'success',
      message: 'Matriculas atualizadas com sucesso.',
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
        : 'Nao foi possivel atualizar as matriculas do usuario.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'enrollments',
          targetId: userId || 'user',
          summary: 'Falha ao atualizar matriculas de usuario no painel administrativo.',
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
