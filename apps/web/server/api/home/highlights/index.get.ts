import type { AuthSessionContext, HomeHighlightsResponse } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { listActiveHomeHighlights } from '../../../utils/highlights'

export default defineEventHandler(async (event): Promise<HomeHighlightsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event)
    const highlights = await listActiveHomeHighlights(session)

    return {
      status: 'success',
      data: highlights
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
        : 'Nao foi possivel carregar os destaques da plataforma.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'highlights',
          targetId: 'home',
          summary: 'Falha ao carregar os destaques da home.',
          metadata: {
            statusCode,
            statusMessage
          }
        })
      } catch {
        // Preserve original error response.
      }
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
})
