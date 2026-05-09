import type { AdminLogsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { listAdminLogsForManagement } from '../../../utils/logs'

export default defineEventHandler(async (event): Promise<AdminLogsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const cursor = typeof query.cursor === 'string' ? query.cursor : null
    const pageSize =
      typeof query.pageSize === 'string' && query.pageSize.trim()
        ? Number.parseInt(query.pageSize, 10)
        : null
    const logs = await listAdminLogsForManagement(session, {
      cursor,
      pageSize
    })

    return {
      status: 'success',
      data: logs
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
        : 'Nao foi possivel carregar os logs do sistema.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'adminLogs',
          targetId: 'list',
          summary: 'Falha ao carregar a listagem de logs administrativos.',
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
