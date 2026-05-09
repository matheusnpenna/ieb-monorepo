import type { AdminCourseResponse } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { deleteAdminCourseBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminCourseResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const course = await deleteAdminCourseBySlug(session, courseSlug)

    return {
      status: 'success',
      data: course
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
        : 'Nao foi possivel remover o curso.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
