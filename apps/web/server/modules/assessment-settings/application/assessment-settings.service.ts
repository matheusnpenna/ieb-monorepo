import type { AdminAssessmentSettingsInput, AssessmentPlatformSettings, AuthSessionContext } from '@ieb/shared'
import type { AdminLogPort, AssessmentSettingsClock, AssessmentSettingsRepository } from './ports'
import {
  DEFAULT_MAX_ATTEMPTS_PER_ASSESSMENT,
  SETTINGS_DOCUMENT_ID,
  normalizeMaxAttemptsPerAssessment
} from '../domain/validation'
import { createAssessmentSettingsError } from '../domain/errors'

interface AssessmentSettingsServiceDependencies {
  repository: AssessmentSettingsRepository
  adminLog: AdminLogPort
  clock: AssessmentSettingsClock
}

export class AssessmentSettingsService {
  private readonly repository: AssessmentSettingsRepository
  private readonly adminLog: AdminLogPort
  private readonly clock: AssessmentSettingsClock

  constructor(dependencies: AssessmentSettingsServiceDependencies) {
    this.repository = dependencies.repository
    this.adminLog = dependencies.adminLog
    this.clock = dependencies.clock
  }

  async getAssessmentPlatformSettings(): Promise<AssessmentPlatformSettings> {
    return (await this.repository.getById(SETTINGS_DOCUMENT_ID)) || this.getDefaultSettings()
  }

  async getAdminAssessmentPlatformSettings(session: AuthSessionContext): Promise<AssessmentPlatformSettings> {
    this.assertAdminSession(session)

    return await this.getAssessmentPlatformSettings()
  }

  async updateAdminAssessmentPlatformSettings(
    session: AuthSessionContext,
    input: AdminAssessmentSettingsInput
  ): Promise<AssessmentPlatformSettings> {
    this.assertAdminSession(session)

    const maxAttemptsPerAssessment = normalizeMaxAttemptsPerAssessment(input)
    const existingSettings = await this.getAssessmentPlatformSettings()
    const timestamp = this.clock.now()
    const nextSettings: AssessmentPlatformSettings = {
      ...existingSettings,
      maxAttemptsPerAssessment,
      createdAt: existingSettings.createdAt || timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      createdBy: existingSettings.createdBy || session.user.id,
      updatedBy: session.user.id,
      deletedBy: null
    }

    await this.repository.save(nextSettings)

    await this.adminLog.write(session, {
      action: 'update',
      targetCollection: 'platformSettings',
      targetId: SETTINGS_DOCUMENT_ID,
      summary: 'Atualizou o limite global de tentativas das avaliacoes.',
      metadata: {
        maxAttemptsPerAssessment: nextSettings.maxAttemptsPerAssessment
      }
    })

    return nextSettings
  }

  private getDefaultSettings(): AssessmentPlatformSettings {
    const timestamp = this.clock.now()

    return {
      id: SETTINGS_DOCUMENT_ID,
      maxAttemptsPerAssessment: DEFAULT_MAX_ATTEMPTS_PER_ASSESSMENT,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      createdBy: null,
      updatedBy: null,
      deletedBy: null
    }
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createAssessmentSettingsError(403, 'Acesso restrito ao painel administrativo.')
    }
  }
}
