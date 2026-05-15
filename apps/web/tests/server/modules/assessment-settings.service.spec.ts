import type { AssessmentPlatformSettings, AuthSessionContext } from '@ieb/shared'
import { describe, expect, it, vi } from 'vitest'
import { AssessmentSettingsService } from '../../../server/modules/assessment-settings/application/assessment-settings.service'
import type {
  AdminLogPort,
  AssessmentSettingsRepository
} from '../../../server/modules/assessment-settings/application/ports'

const adminSession: AuthSessionContext = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
}

const buildService = () => {
  let settings: AssessmentPlatformSettings | null = null
  const repository: AssessmentSettingsRepository = {
    getById: vi.fn(async () => settings),
    save: vi.fn(async (nextSettings) => {
      settings = nextSettings
    })
  }
  const adminLog: AdminLogPort = {
    write: vi.fn()
  }
  const service = new AssessmentSettingsService({
    repository,
    adminLog,
    clock: {
      now: () => '2026-05-08T12:00:00.000Z'
    }
  })

  return {
    adminLog,
    repository,
    service
  }
}

describe('assessment settings service', () => {
  it('returns default settings when no document exists', async () => {
    const { service } = buildService()

    const settings = await service.getAssessmentPlatformSettings()

    expect(settings).toMatchObject({
      id: 'assessment-config',
      maxAttemptsPerAssessment: 3
    })
  })

  it('updates settings through repository and log ports', async () => {
    const { adminLog, repository, service } = buildService()

    const settings = await service.updateAdminAssessmentPlatformSettings(adminSession, {
      maxAttemptsPerAssessment: 5
    })

    expect(settings.maxAttemptsPerAssessment).toBe(5)
    expect(repository.save).toHaveBeenCalledWith(settings)
    expect(adminLog.write).toHaveBeenCalledWith(
      adminSession,
      expect.objectContaining({
        action: 'update',
        targetCollection: 'platformSettings',
        targetId: 'assessment-config'
      })
    )
  })
})
