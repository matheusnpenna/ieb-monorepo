import type {
  AdminAssessmentAttemptResponse,
  AdminAssessmentAttemptsResponse,
  AdminAssessmentAttemptScoreInput,
  AdminAssessmentInput,
  AdminAssessmentResponse,
  AdminAssessmentsResponse,
  AuthSessionContext,
  StudentAssessmentSubmissionInput,
  StudentAssessmentSubmissionResponse,
  StudentModuleAssessmentResponse
} from '@ieb/shared'
import { getQuery, readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../auth/interfaces/http/session'
import { getAssessmentsModule } from '../../assessments.module'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const normalizeAdminAssessmentInput = (body: AdminAssessmentInput | null | undefined): AdminAssessmentInput => ({
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

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    action: 'create' | 'update' | 'delete'
    targetCollection: string
    targetId: string
    summary: string
    statusCode: number
    statusMessage: string
    metadata?: Record<string, unknown>
  }
) => {
  if (!session) return

  try {
    await getAssessmentsModule().adminLog.write(session, {
      action: input.action,
      targetCollection: input.targetCollection,
      targetId: input.targetId,
      summary: input.summary,
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage,
        ...(input.metadata || {})
      }
    })
  } catch {
    // Preserve original error response.
  }
}

export const handleListAdminAssessments = async (event: H3Event): Promise<AdminAssessmentsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const assessments = await getAssessmentsModule().service.listAdminAssessmentsForManagement(session, {
      courseId: typeof query.courseId === 'string' ? query.courseId : '',
      moduleId: typeof query.moduleId === 'string' ? query.moduleId : ''
    })

    return { status: 'success', data: assessments }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as avaliacoes do painel.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'assessments',
      targetId: 'list',
      summary: 'Falha ao carregar listagem administrativa de avaliacoes.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: [] }
  }
}

export const handleCreateAdminAssessment = async (event: H3Event): Promise<AdminAssessmentResponse> => {
  let session: AuthSessionContext | null = null
  let requestedSlug = ''

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminAssessmentInput>(event)
    requestedSlug = body?.slug || body?.title || ''
    const assessment = await getAssessmentsModule().service.createAdminAssessment(
      session,
      normalizeAdminAssessmentInput(body)
    )

    return { status: 'success', data: assessment }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar a avaliacao.')

    await writeFailureLog(session, {
      action: 'create',
      targetCollection: 'assessments',
      targetId: requestedSlug || 'new-assessment',
      summary: 'Falha ao criar avaliacao no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { requestedSlug: requestedSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleGetAdminAssessment = async (event: H3Event): Promise<AdminAssessmentResponse> => {
  let session: AuthSessionContext | null = null
  const assessmentSlug = String(event.context.params?.assessmentSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const assessment = await getAssessmentsModule().service.getAdminAssessmentBySlug(session, assessmentSlug)

    return { status: 'success', data: assessment }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar a avaliacao.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'assessments',
      targetId: assessmentSlug || 'assessment',
      summary: 'Falha ao carregar avaliacao no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { assessmentSlug: assessmentSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleUpdateAdminAssessment = async (event: H3Event): Promise<AdminAssessmentResponse> => {
  let session: AuthSessionContext | null = null
  const assessmentSlug = String(event.context.params?.assessmentSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminAssessmentInput>(event)
    const assessment = await getAssessmentsModule().service.updateAdminAssessmentBySlug(
      session,
      assessmentSlug,
      normalizeAdminAssessmentInput(body)
    )

    return { status: 'success', data: assessment }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar a avaliacao.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'assessments',
      targetId: assessmentSlug || 'assessment',
      summary: 'Falha ao atualizar avaliacao no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { assessmentSlug: assessmentSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleDeleteAdminAssessment = async (event: H3Event): Promise<AdminAssessmentResponse> => {
  let session: AuthSessionContext | null = null
  const assessmentSlug = String(event.context.params?.assessmentSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const assessment = await getAssessmentsModule().service.deleteAdminAssessmentBySlug(session, assessmentSlug)

    return { status: 'success', data: assessment }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover a avaliacao.')

    await writeFailureLog(session, {
      action: 'delete',
      targetCollection: 'assessments',
      targetId: assessmentSlug || 'assessment',
      summary: 'Falha ao remover avaliacao no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { assessmentSlug: assessmentSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleListAdminAssessmentAttempts = async (
  event: H3Event
): Promise<AdminAssessmentAttemptsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const attempts = await getAssessmentsModule().service.listAdminAssessmentAttemptsForManagement(session)

    return { status: 'success', data: attempts }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as respostas de avaliacao.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'assessmentAttempts',
      targetId: 'list',
      summary: 'Falha ao carregar as respostas de avaliacao no painel administrativo.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: [] }
  }
}

export const handleUpdateAdminAssessmentAttemptScore = async (
  event: H3Event
): Promise<AdminAssessmentAttemptResponse> => {
  let session: AuthSessionContext | null = null
  const attemptId = String(event.context.params?.attemptId || '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminAssessmentAttemptScoreInput>(event)
    const attempt = await getAssessmentsModule().service.updateAdminAssessmentAttemptScoreById(
      session,
      attemptId,
      Number(body?.score)
    )

    return { status: 'success', data: attempt }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar a nota da resposta.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'assessmentAttempts',
      targetId: attemptId || 'unknown',
      summary: 'Falha ao atualizar a nota de uma resposta de avaliacao.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleDeleteAdminAssessmentAttempt = async (
  event: H3Event
): Promise<AdminAssessmentAttemptResponse> => {
  let session: AuthSessionContext | null = null
  const attemptId = String(event.context.params?.attemptId || '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const attempt = await getAssessmentsModule().service.deleteAdminAssessmentAttemptById(session, attemptId)

    return { status: 'success', data: attempt }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel excluir a resposta de avaliacao.')

    await writeFailureLog(session, {
      action: 'delete',
      targetCollection: 'assessmentAttempts',
      targetId: attemptId || 'unknown',
      summary: 'Falha ao excluir uma resposta de avaliacao.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleGetAccessibleModuleAssessments = async (
  event: H3Event
): Promise<StudentModuleAssessmentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const assessmentData = await getAssessmentsModule().service.getAccessibleModuleAssessmentsBySlugs(
      session,
      courseSlug,
      moduleSlug
    )

    return { status: 'success', data: assessmentData }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as avaliacoes do modulo.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleSubmitAssessmentAttempt = async (
  event: H3Event
): Promise<StudentAssessmentSubmissionResponse> => {
  let session: AuthSessionContext | null = null
  const courseSlug = String(event.context.params?.courseSlug || '')
  const moduleSlug = String(event.context.params?.moduleSlug || '')
  const assessmentSlug = String(event.context.params?.assessmentSlug || '')

  try {
    session = await requireAuthSession(event)
    const body = await readBody<StudentAssessmentSubmissionInput>(event)
    const submission = await getAssessmentsModule().service.submitAssessmentAttemptBySlugs(
      session,
      courseSlug,
      moduleSlug,
      assessmentSlug,
      body?.answers || {}
    )

    return { status: 'success', data: submission }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel enviar a avaliacao.')

    await writeFailureLog(session, {
      action: 'update',
      targetCollection: 'assessmentAttempts',
      targetId: assessmentSlug || 'unknown',
      summary: 'Falha ao enviar uma resposta de avaliacao.',
      statusCode,
      statusMessage,
      metadata: {
        courseSlug: courseSlug || null,
        moduleSlug: moduleSlug || null,
        assessmentSlug: assessmentSlug || null
      }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}
