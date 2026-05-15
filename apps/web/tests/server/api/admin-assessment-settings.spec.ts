import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
  getAdminAssessmentPlatformSettings,
  updateAdminAssessmentPlatformSettings,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  writeAdminLog: vi.fn(),
  getAdminAssessmentPlatformSettings: vi.fn(),
  updateAdminAssessmentPlatformSettings: vi.fn(),
  readBody: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')

  return {
    ...actual,
    readBody
  }
})

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession,
  writeAdminLog
}))

vi.mock('../../../server/utils/assessment-settings', () => ({
  getAdminAssessmentPlatformSettings,
  updateAdminAssessmentPlatformSettings
}))

vi.mock('../../../server/modules/assessment-settings/assessment-settings.module', () => ({
  getAssessmentSettingsModule: () => ({
    adminLog: {
      write: writeAdminLog
    },
    service: {
      getAdminAssessmentPlatformSettings,
      updateAdminAssessmentPlatformSettings
    }
  })
}))

import getSettingsHandler from '../../../server/api/admin/assessments/settings/index.get'
import updateSettingsHandler from '../../../server/api/admin/assessments/settings/index.patch'

const sampleSession = {
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
} as const

describe('admin assessment settings api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gets assessment settings', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAdminAssessmentPlatformSettings.mockResolvedValue({
      id: 'assessment-config',
      maxAttemptsPerAssessment: 3
    })

    const response = await getSettingsHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: {
        id: 'assessment-config',
        maxAttemptsPerAssessment: 3
      }
    })
  })

  it('updates assessment settings', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      maxAttemptsPerAssessment: 5
    })
    updateAdminAssessmentPlatformSettings.mockResolvedValue({
      id: 'assessment-config',
      maxAttemptsPerAssessment: 5
    })

    const response = await updateSettingsHandler({} as never)

    expect(updateAdminAssessmentPlatformSettings).toHaveBeenCalledWith(sampleSession, {
      maxAttemptsPerAssessment: 5
    })
    expect(response.status).toBe('success')
  })
})
