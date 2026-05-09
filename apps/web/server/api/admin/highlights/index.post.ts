import type { AdminHighlightInput, AdminHighlightResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { createAdminHighlight } from '../../../utils/highlights'

export default defineEventHandler(async (event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminHighlightInput>(event)
    const highlight = await createAdminHighlight(session, {
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
        : 'Nao foi possivel criar o destaque.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'create',
          targetCollection: 'highlights',
          targetId: 'new',
          summary: 'Falha ao criar destaque no painel administrativo.',
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
