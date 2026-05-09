import type { AdminLessonInput, AdminLessonResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { updateAdminLessonBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminLessonResponse> => {
  let session: AuthSessionContext | null = null
  const lessonSlug = String(event.context.params?.lessonSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminLessonInput>(event)
    const lesson = await updateAdminLessonBySlug(session, lessonSlug, {
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

    return {
      status: 'success',
      data: lesson
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
        : 'Nao foi possivel atualizar a aula.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'lessons',
          targetId: lessonSlug || 'lesson',
          summary: 'Falha ao atualizar aula no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage,
            lessonSlug: lessonSlug || null
          }
        })
      } catch {
        // Preserve the original error response if admin log persistence fails.
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
