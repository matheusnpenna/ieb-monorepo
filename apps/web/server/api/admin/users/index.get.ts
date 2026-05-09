import type { AdminUsersResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { listAdminUsersForManagement } from '../../../utils/users'

export default defineEventHandler(async (event): Promise<AdminUsersResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const query = getQuery(event)
    const page = typeof query.page === 'string' ? Number(query.page) : undefined
    const pageSize = typeof query.pageSize === 'string' ? Number(query.pageSize) : undefined
    const users = await listAdminUsersForManagement(session, {
      page,
      pageSize
    })

    return {
      status: 'success',
      data: users
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
        : 'Nao foi possivel carregar os usuarios do painel.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'users',
          targetId: 'list',
          summary: 'Falha ao carregar listagem administrativa de usuarios.',
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
