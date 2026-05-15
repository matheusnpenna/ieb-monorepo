import type { AuthSessionContext, AssessmentPlatformSettings } from '@ieb/shared'

export interface AssessmentSettingsRepository {
  getById(settingsId: string): Promise<AssessmentPlatformSettings | null>
  save(settings: AssessmentPlatformSettings): Promise<void>
}

export interface AdminLogPort {
  write(
    session: AuthSessionContext,
    entry: {
      action: 'create' | 'update' | 'delete'
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void>
}

export interface AssessmentSettingsClock {
  now(): string
}
