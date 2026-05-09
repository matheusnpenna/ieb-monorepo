import type { AdminAssessmentInput, AdminAssessmentResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { updateAdminAssessmentBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminAssessmentResponse> => {
  let session: AuthSessionContext | null = null
  const assessmentSlug = String(event.context.params?.assessmentSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminAssessmentInput>(event)
    const assessment = await updateAdminAssessmentBySlug(session, assessmentSlug, {
      courseId: body?.courseId || '',
      moduleId: body?.moduleId || '',
      title: body?.title || '',
      slug: body?.slug || '',
      description: body?.description || '',
      questionType: body?.questionType || 'multiple_choice',
      passingScore: Number(body?.passingScore ?? 0),
      timeLimitInMinutes: body?.timeLimitInMinutes === null ? null : Number(body?.timeLimitInMinutes ?? 0),
      questions: Array.isArray(body?.questions) ? body.questions : []
    })

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
        : 'Nao foi possivel atualizar a avaliacao.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'assessments',
          targetId: assessmentSlug || 'assessment',
          summary: 'Falha ao atualizar avaliacao no painel administrativo.',
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
