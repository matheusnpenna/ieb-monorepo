import type { AdminAssessmentResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { getAdminAssessmentBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminAssessmentResponse> => {
  let session: AuthSessionContext | null = null
  const assessmentSlug = String(event.context.params?.assessmentSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const assessment = await getAdminAssessmentBySlug(session, assessmentSlug)

    return {
      status: 'success',
      data: assessment
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
        : 'Nao foi possivel carregar a avaliacao.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'assessments',
          targetId: assessmentSlug || 'assessment',
          summary: 'Falha ao carregar avaliacao no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage,
            assessmentSlug: assessmentSlug || null
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
