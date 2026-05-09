import type { AdminAssessmentAttemptResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { deleteAdminAssessmentAttemptById } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminAssessmentAttemptResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const attemptId = String(event.context.params?.attemptId || '')
    const attempt = await deleteAdminAssessmentAttemptById(session, attemptId)

    return {
      status: 'success',
      data: attempt
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
        : 'Nao foi possivel excluir a resposta de avaliacao.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'delete',
          targetCollection: 'assessmentAttempts',
          targetId: event.context.params?.attemptId || 'unknown',
          summary: 'Falha ao excluir uma resposta de avaliacao.',
          metadata: {
            statusCode,
            statusMessage
          }
        })
      } catch {}
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
