import type { AuthSessionContext } from '@ieb/shared'
import { getLogsModule } from '../modules/logs/logs.module'

export const listAdminLogsForManagement = async (
  session: AuthSessionContext,
  input?: {
    cursor?: string | null
    pageSize?: number | null
  }
) => await getLogsModule().service.listAdminLogsForManagement(session, input)
