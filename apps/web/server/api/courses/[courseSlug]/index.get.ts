import type { CourseDetailResponse } from '@ieb/shared'
import { setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../utils/auth'
import { getAccessibleCourseDetailBySlug } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<CourseDetailResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const courseDetail = await getAccessibleCourseDetailBySlug(session, courseSlug)

    return {
      status: 'success',
      data: courseDetail
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
        : 'Nao foi possivel carregar o curso.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
