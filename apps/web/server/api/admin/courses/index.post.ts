import type { AdminCourseInput, AdminCourseResponse } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../utils/auth'
import { createAdminCourse } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminCourseResponse> => {
  try {
    const session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminCourseInput>(event)
    const course = await createAdminCourse(session, {
      title: body?.title || '',
      slug: body?.slug || '',
      shortDescription: body?.shortDescription || '',
      description: body?.description || '',
      visibility: body?.visibility || 'draft',
      coverImageUrl: body?.coverImageUrl ?? null,
      heroImageUrl: body?.heroImageUrl ?? null,
      totalDurationInMinutes: Number(body?.totalDurationInMinutes ?? 0),
      requiredCompletionRate: Number(body?.requiredCompletionRate ?? 0),
      certificateEnabled: Boolean(body?.certificateEnabled)
    })

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
        : 'Nao foi possivel criar o curso.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
