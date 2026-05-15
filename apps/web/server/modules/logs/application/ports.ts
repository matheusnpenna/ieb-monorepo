import type { AdminActionType, AdminActivityLog, AuthSessionContext } from '@ieb/shared'

export interface LogRepository {
  listPage(input: {
    limit: number
    cursorCreatedAt?: string | null
  }): Promise<AdminActivityLog[]>
}

export interface AdminLogInput {
  action: AdminActionType
  targetCollection: string
  targetId: string
  summary: string
  metadata?: Record<string, unknown>
}

export interface AdminLogPort {
  write(session: AuthSessionContext, input: AdminLogInput): Promise<void>
}
