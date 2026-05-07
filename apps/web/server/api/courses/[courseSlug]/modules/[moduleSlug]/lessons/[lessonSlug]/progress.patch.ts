import type { LessonProgressUpdateResponse } from '@ieb/shared'
import { readBody, setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../../../utils/auth'
import { updateLessonProgressBySlugs } from '../../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<LessonProgressUpdateResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const lessonSlug = String(event.context.params?.lessonSlug ?? '')
    const body = await readBody<{ lastPositionInSeconds?: number; markAsCompleted?: boolean }>(event)
    const progress = await updateLessonProgressBySlugs(session, courseSlug, moduleSlug, lessonSlug, {
      lastPositionInSeconds: typeof body?.lastPositionInSeconds === 'number' ? body.lastPositionInSeconds : 0,
      markAsCompleted: Boolean(body?.markAsCompleted)
    })

    return {
      status: 'success',
      data: progress
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
        : 'Nao foi possivel atualizar o progresso da aula.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
