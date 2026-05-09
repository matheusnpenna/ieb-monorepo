import type { AdminAssessmentAttemptResponse, AdminAssessmentAttemptScoreInput, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { updateAdminAssessmentAttemptScoreById } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminAssessmentAttemptResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminAssessmentAttemptScoreInput>(event)
    const attemptId = String(event.context.params?.attemptId || '')
    const attempt = await updateAdminAssessmentAttemptScoreById(session, attemptId, Number(body?.score))

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
        : 'Nao foi possivel atualizar a nota da resposta.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'assessmentAttempts',
          targetId: event.context.params?.attemptId || 'unknown',
          summary: 'Falha ao atualizar a nota de uma resposta de avaliacao.',
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
