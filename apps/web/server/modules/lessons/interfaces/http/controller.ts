import type {
  AdminLessonInput,
  AdminLessonResponse,
  AdminLessonsResponse,
  AuthSessionContext,
  LessonCommentResponse,
  LessonCommentsResponse,
  LessonCompletionResponse,
  LessonDetailResponse,
  LessonProgressUpdateResponse
} from '@ieb/shared'
import { getQuery, readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../auth/interfaces/http/session'
import { getLessonsModule } from '../../lessons.module'

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

const normalizeAdminLessonInput = (body: AdminLessonInput | null | undefined): AdminLessonInput => ({
  courseId: body?.courseId || '',
  moduleId: body?.moduleId || '',
  title: body?.title || '',
  slug: body?.slug || '',
  description: body?.description || '',
  order: Number(body?.order ?? 1),
  contentType: body?.contentType || 'video',
  videoProvider: body?.videoProvider ?? null,
  mediaUrl: body?.mediaUrl ?? null,
  thumbnailUrl: body?.thumbnailUrl ?? null,
  durationInMinutes: Number(body?.durationInMinutes ?? 0),
  bodyContent: body?.bodyContent ?? null,
  allowManualCompletion: Boolean(body?.allowManualCompletion)
})

const getLessonRouteParams = (event: H3Event) => ({
  courseSlug: String(event.context.params?.courseSlug ?? ''),
  moduleSlug: String(event.context.params?.moduleSlug ?? ''),
  lessonSlug: String(event.context.params?.lessonSlug ?? '')
})

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    action: 'create' | 'update' | 'delete'
    targetId: string
    summary: string
    statusCode: number
    statusMessage: string
    metadata?: Record<string, unknown>
  }
) => {
  if (!session) return

  try {
    await getLessonsModule().adminLog.write(session, {
      action: input.action,
      targetCollection: 'lessons',
      targetId: input.targetId,
      summary: input.summary,
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage,
        ...(input.metadata || {})
      }
    })
  } catch {
    // Preserve the original error response if admin log persistence fails.
  }
}

export const handleListAdminLessons = async (event: H3Event): Promise<AdminLessonsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const lessons = await getLessonsModule().service.listAdminLessonsForManagement(session, {
      courseId: typeof query.courseId === 'string' ? query.courseId : '',
      moduleId: typeof query.moduleId === 'string' ? query.moduleId : ''
    })

    return { status: 'success', data: lessons }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar as aulas do painel.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: 'list',
      summary: 'Falha ao carregar listagem administrativa de aulas.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: [] }
  }
}

export const handleCreateAdminLesson = async (event: H3Event): Promise<AdminLessonResponse> => {
  let session: AuthSessionContext | null = null
  let requestedSlug = ''

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminLessonInput>(event)
    requestedSlug = body?.slug || body?.title || ''
    const lesson = await getLessonsModule().service.createAdminLesson(session, normalizeAdminLessonInput(body))

    return { status: 'success', data: lesson }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar a aula.')

    await writeFailureLog(session, {
      action: 'create',
      targetId: requestedSlug || 'new-lesson',
      summary: 'Falha ao criar aula no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { requestedSlug: requestedSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleGetAdminLesson = async (event: H3Event): Promise<AdminLessonResponse> => {
  let session: AuthSessionContext | null = null
  const lessonSlug = String(event.context.params?.lessonSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const lesson = await getLessonsModule().service.getAdminLessonBySlug(session, lessonSlug)

    return { status: 'success', data: lesson }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar a aula.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: lessonSlug || 'lesson',
      summary: 'Falha ao carregar aula no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { lessonSlug: lessonSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleUpdateAdminLesson = async (event: H3Event): Promise<AdminLessonResponse> => {
  let session: AuthSessionContext | null = null
  const lessonSlug = String(event.context.params?.lessonSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminLessonInput>(event)
    const lesson = await getLessonsModule().service.updateAdminLessonBySlug(
      session,
      lessonSlug,
      normalizeAdminLessonInput(body)
    )

    return { status: 'success', data: lesson }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar a aula.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: lessonSlug || 'lesson',
      summary: 'Falha ao atualizar aula no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { lessonSlug: lessonSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleDeleteAdminLesson = async (event: H3Event): Promise<AdminLessonResponse> => {
  let session: AuthSessionContext | null = null
  const lessonSlug = String(event.context.params?.lessonSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const lesson = await getLessonsModule().service.deleteAdminLessonBySlug(session, lessonSlug)

    return { status: 'success', data: lesson }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover a aula.')

    await writeFailureLog(session, {
      action: 'delete',
      targetId: lessonSlug || 'lesson',
      summary: 'Falha ao remover aula no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: { lessonSlug: lessonSlug || null }
    })

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleGetAccessibleLessonDetail = async (event: H3Event): Promise<LessonDetailResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const lessonDetail = await getLessonsModule().service.getAccessibleLessonDetailBySlugs(
      session,
      courseSlug,
      moduleSlug,
      lessonSlug
    )

    return { status: 'success', data: lessonDetail }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar a aula.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleUpdateLessonProgress = async (event: H3Event): Promise<LessonProgressUpdateResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const body = await readBody<{ lastPositionInSeconds?: number; markAsCompleted?: boolean }>(event)
    const hasCompletionOverride =
      typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'markAsCompleted')
    const progress = await getLessonsModule().service.updateLessonProgressBySlugs(
      session,
      courseSlug,
      moduleSlug,
      lessonSlug,
      {
        lastPositionInSeconds: typeof body?.lastPositionInSeconds === 'number' ? body.lastPositionInSeconds : 0,
        markAsCompleted: Boolean(body?.markAsCompleted),
        hasCompletionOverride
      }
    )

    return { status: 'success', data: progress }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar o progresso da aula.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleMarkLessonCompleted = async (event: H3Event): Promise<LessonCompletionResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const completion = await getLessonsModule().service.markLessonAsCompletedBySlugs(
      session,
      courseSlug,
      moduleSlug,
      lessonSlug
    )

    return { status: 'success', data: completion }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel concluir a aula.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleListLessonComments = async (event: H3Event): Promise<LessonCommentsResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const comments = await getLessonsModule().service.listLessonCommentsBySlugs(
      session,
      courseSlug,
      moduleSlug,
      lessonSlug
    )

    return { status: 'success', data: comments }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os comentarios.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: [] }
  }
}

export const handleCreateLessonComment = async (event: H3Event): Promise<LessonCommentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const body = await readBody<{ content?: string }>(event)
    const comment = await getLessonsModule().service.createLessonCommentBySlugs(
      session,
      courseSlug,
      moduleSlug,
      lessonSlug,
      body?.content || ''
    )

    return { status: 'success', data: comment }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel publicar o comentario.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleUpdateLessonComment = async (event: H3Event): Promise<LessonCommentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const commentId = String(event.context.params?.commentId ?? '')
    const body = await readBody<{ content?: string }>(event)
    const comment = await getLessonsModule().service.updateLessonCommentBySlugs(
      session,
      courseSlug,
      moduleSlug,
      lessonSlug,
      commentId,
      body?.content || ''
    )

    return { status: 'success', data: comment }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel editar o comentario.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleDeleteLessonComment = async (event: H3Event): Promise<LessonCommentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const { courseSlug, moduleSlug, lessonSlug } = getLessonRouteParams(event)
    const commentId = String(event.context.params?.commentId ?? '')

    await getLessonsModule().service.deleteLessonCommentBySlugs(session, courseSlug, moduleSlug, lessonSlug, commentId)

    return { status: 'success', data: null }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel excluir o comentario.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}
