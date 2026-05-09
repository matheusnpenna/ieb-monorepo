import type { AdminHighlightResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { getAdminHighlightById } from '../../../../utils/highlights'

export default defineEventHandler(async (event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const highlightId = event.context.params?.highlightId || ''
    const highlight = await getAdminHighlightById(session, highlightId)

    return {
      status: 'success',
      data: highlight
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
        : 'Nao foi possivel carregar o destaque.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'highlights',
          targetId: event.context.params?.highlightId || 'unknown',
          summary: 'Falha ao carregar um destaque do painel administrativo.',
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
      data: null
    }
  }
})
