import type { StudentModuleAssessmentResponse } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../../utils/auth'
import { getAccessibleModuleAssessmentsBySlugs } from '../../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<StudentModuleAssessmentResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const assessmentData = await getAccessibleModuleAssessmentsBySlugs(session, courseSlug, moduleSlug)

    return {
      status: 'success',
      data: assessmentData
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
        : 'Nao foi possivel carregar as avaliacoes do modulo.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
