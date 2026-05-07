import type { ModuleDetailResponse } from '@ieb/shared'
import { setResponseStatus } from 'h3'
import { requireAuthSession } from '../../../../../utils/auth'
import { getAccessibleModuleDetailBySlugs } from '../../../../../utils/courses'

export default defineEventHandler(async (event): Promise<ModuleDetailResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const moduleDetail = await getAccessibleModuleDetailBySlugs(session, courseSlug, moduleSlug)

    return {
      status: 'success',
      data: moduleDetail
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
        : 'Nao foi possivel carregar o modulo.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
