import type { HomeMetricsResponse } from '@ieb/shared'
import { setResponseStatus, defineEventHandler } from 'h3'
import { requireAuthSession } from '../../../utils/auth'
import { getHomeMetrics } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<HomeMetricsResponse> => {
  try {
    const session = await requireAuthSession(event)
    const metrics = await getHomeMetrics(session)

    return {
      status: 'success',
      data: metrics
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
        : 'Nao foi possivel carregar as metricas da home.'

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
