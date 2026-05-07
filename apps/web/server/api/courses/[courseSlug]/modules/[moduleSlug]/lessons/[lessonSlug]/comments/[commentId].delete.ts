import type { LessonCommentResponse } from '@ieb/shared'
import { setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../../../../utils/auth'
import { deleteLessonCommentBySlugs } from '../../../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<LessonCommentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const lessonSlug = String(event.context.params?.lessonSlug ?? '')
    const commentId = String(event.context.params?.commentId ?? '')

    await deleteLessonCommentBySlugs(session, courseSlug, moduleSlug, lessonSlug, commentId)

    return {
      status: 'success',
      data: null
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
        : 'Nao foi possivel excluir o comentario.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
