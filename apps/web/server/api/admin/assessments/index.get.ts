import type { AdminAssessmentsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { listAdminAssessmentsForManagement } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminAssessmentsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const assessments = await listAdminAssessmentsForManagement(session, {
      courseId: typeof query.courseId === 'string' ? query.courseId : '',
      moduleId: typeof query.moduleId === 'string' ? query.moduleId : ''
    })

    return {
      status: 'success',
      data: assessments
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
        : 'Nao foi possivel carregar as avaliacoes do painel.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'assessments',
          targetId: 'list',
          summary: 'Falha ao carregar listagem administrativa de avaliacoes.',
          metadata: {
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
      data: []
    }
  }
})
