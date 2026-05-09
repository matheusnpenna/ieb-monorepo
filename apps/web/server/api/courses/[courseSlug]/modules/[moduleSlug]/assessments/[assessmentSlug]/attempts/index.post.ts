import type { AuthSessionContext, StudentAssessmentSubmissionInput, StudentAssessmentSubmissionResponse } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../../../../../utils/auth'
import { submitAssessmentAttemptBySlugs } from '../../../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<StudentAssessmentSubmissionResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event)
    const body = await readBody<StudentAssessmentSubmissionInput>(event)
    const courseSlug = String(event.context.params?.courseSlug || '')
    const moduleSlug = String(event.context.params?.moduleSlug || '')
    const assessmentSlug = String(event.context.params?.assessmentSlug || '')
    const submission = await submitAssessmentAttemptBySlugs(
      session,
      courseSlug,
      moduleSlug,
      assessmentSlug,
      body?.answers || {}
    )

    return {
      status: 'success',
      data: submission
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
        : 'Nao foi possivel enviar a avaliacao.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'assessmentAttempts',
          targetId: event.context.params?.assessmentSlug || 'unknown',
          summary: 'Falha ao enviar uma resposta de avaliacao.',
          metadata: {
            courseSlug: event.context.params?.courseSlug || null,
            moduleSlug: event.context.params?.moduleSlug || null,
            assessmentSlug: event.context.params?.assessmentSlug || null,
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
