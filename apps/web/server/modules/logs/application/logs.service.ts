import type { AdminLogsData, AuthSessionContext } from '@ieb/shared'
import type { LogRepository } from './ports'
import { createLogsError } from '../domain/errors'
import { decodeLogsCursor, encodeLogsCursor, normalizeLogsPageSize } from '../domain/pagination'

interface LogsServiceDependencies {
  repository: LogRepository
}

export class LogsService {
  private readonly repository: LogRepository

  constructor(dependencies: LogsServiceDependencies) {
    this.repository = dependencies.repository
  }

  async listAdminLogsForManagement(
    session: AuthSessionContext,
    input?: {
      cursor?: string | null
      pageSize?: number | null
    }
  ): Promise<AdminLogsData> {
    this.assertAdminSession(session)

    const pageSize = normalizeLogsPageSize(input?.pageSize)
    const decodedCursor = input?.cursor?.trim() ? decodeLogsCursor(input.cursor.trim()) : null
    const logs = (await this.repository.listPage({
      limit: pageSize + 1,
      cursorCreatedAt: decodedCursor?.createdAt || null
    })).filter((log) => !log.deletedAt)

    const items = logs.slice(0, pageSize)
    const nextCursor = logs.length > pageSize && items.length > 0 ? encodeLogsCursor(items[items.length - 1]!) : null

    return {
      items,
      pagination: {
        nextCursor,
        pageSize
      }
    }
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createLogsError(403, 'Acesso restrito ao painel administrativo.')
    }
  }
}
