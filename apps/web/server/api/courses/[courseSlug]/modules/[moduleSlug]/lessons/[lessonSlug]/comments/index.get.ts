import type { LessonCommentsResponse } from '@ieb/shared'
import { setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../../../../utils/auth'
import { listLessonCommentsBySlugs } from '../../../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<LessonCommentsResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const lessonSlug = String(event.context.params?.lessonSlug ?? '')
    const comments = await listLessonCommentsBySlugs(session, courseSlug, moduleSlug, lessonSlug)

    return {
      status: 'success',
      data: comments
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
        : 'Nao foi possivel carregar os comentarios.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
})
