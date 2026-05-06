import type { CourseListResponse } from '@ieb/shared'
import { setResponseStatus, defineEventHandler } from 'h3'
import { requireAuthSession } from '../../utils/auth'
import { listAccessibleCourses } from '../../utils/courses'

export default defineEventHandler(async (event): Promise<CourseListResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courses = await listAccessibleCourses(session)

    return {
      status: 'success',
      data: courses
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
        : 'Nao foi possivel carregar os cursos.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
})
