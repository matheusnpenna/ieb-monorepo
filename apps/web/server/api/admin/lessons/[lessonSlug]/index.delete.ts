import type { AdminLessonResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { deleteAdminLessonBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminLessonResponse> => {
  let session: AuthSessionContext | null = null
  const lessonSlug = String(event.context.params?.lessonSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const lesson = await deleteAdminLessonBySlug(session, lessonSlug)

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
        : 'Nao foi possivel remover a aula.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'delete',
          targetCollection: 'lessons',
          targetId: lessonSlug || 'lesson',
          summary: 'Falha ao remover aula no painel administrativo.',
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
