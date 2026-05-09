import type { AdminHighlightInput, AdminHighlightResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { updateAdminHighlightById } from '../../../../utils/highlights'

export default defineEventHandler(async (event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminHighlightInput>(event)
    const highlightId = event.context.params?.highlightId || ''
    const highlight = await updateAdminHighlightById(session, highlightId, {
      title: body?.title || '',
      description: body?.description || '',
      isActive: Boolean(body?.isActive),
      mediaType: body?.mediaType ?? null,
      mediaUrl: body?.mediaUrl ?? null,
      actions: Array.isArray(body?.actions) ? body.actions : [],
      order: Number(body?.order || 0)
    })

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
        : 'Nao foi possivel atualizar o destaque.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'highlights',
          targetId: event.context.params?.highlightId || 'unknown',
          summary: 'Falha ao atualizar destaque no painel administrativo.',
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
