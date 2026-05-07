import type { LessonCompletionResponse } from '@ieb/shared'
import { setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../../../utils/auth'
import { markLessonAsCompletedBySlugs } from '../../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<LessonCompletionResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const lessonSlug = String(event.context.params?.lessonSlug ?? '')
    const completion = await markLessonAsCompletedBySlugs(session, courseSlug, moduleSlug, lessonSlug)

    return {
      status: 'success',
      data: completion
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
        : 'Nao foi possivel concluir a aula.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
