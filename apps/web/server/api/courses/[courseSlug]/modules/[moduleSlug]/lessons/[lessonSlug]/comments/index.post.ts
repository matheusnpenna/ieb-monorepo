import type { LessonCommentResponse } from '@ieb/shared'
import { readBody, setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../../../../utils/auth'
import { createLessonCommentBySlugs } from '../../../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<LessonCommentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const lessonSlug = String(event.context.params?.lessonSlug ?? '')
    const body = await readBody<{ content?: string }>(event)
    const comment = await createLessonCommentBySlugs(session, courseSlug, moduleSlug, lessonSlug, body?.content || '')

    return {
      status: 'success',
      data: comment
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
        : 'Nao foi possivel publicar o comentario.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
