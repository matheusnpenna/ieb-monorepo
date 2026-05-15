import type { AdminLogsResponse, AuthSessionContext } from '@ieb/shared'
import { getQuery, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { getLogsModule } from '../../logs.module'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    statusCode: number
    statusMessage: string
  }
) => {
  if (!session) {
    return
  }

  try {
    await getLogsModule().adminLog.write(session, {
      action: 'update',
      targetCollection: 'adminLogs',
      targetId: 'list',
      summary: 'Falha ao carregar a listagem de logs administrativos.',
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage
      }
    })
  } catch {
    // Preserve original error response.
  }
}

export const handleListAdminLogs = async (event: H3Event): Promise<AdminLogsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const cursor = typeof query.cursor === 'string' ? query.cursor : null
    const pageSize =
      typeof query.pageSize === 'string' && query.pageSize.trim()
        ? Number.parseInt(query.pageSize, 10)
        : null
    const logs = await getLogsModule().service.listAdminLogsForManagement(session, {
      cursor,
      pageSize
    })

    return {
      status: 'success',
      data: logs
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os logs do sistema.')

    await writeFailureLog(session, {
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
