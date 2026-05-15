import type { AdminActionType, AuthSessionContext, PlatformHighlight } from '@ieb/shared'

export interface HighlightRepository {
  listAll(): Promise<PlatformHighlight[]>
  findById(highlightId: string): Promise<PlatformHighlight | null>
  save(highlight: PlatformHighlight): Promise<void>
}

export interface HighlightClock {
  now(): string
}

export interface HighlightIdGenerator {
  create(): string
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
