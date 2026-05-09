import type { AdminAssessmentAttemptsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { listAdminAssessmentAttemptsForManagement } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminAssessmentAttemptsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const attempts = await listAdminAssessmentAttemptsForManagement(session)

    return {
      status: 'success',
      data: attempts
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
        : 'Nao foi possivel carregar as respostas de avaliacao.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'assessmentAttempts',
          targetId: 'list',
          summary: 'Falha ao carregar as respostas de avaliacao no painel administrativo.',
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
      data: []
    }
  }
})
