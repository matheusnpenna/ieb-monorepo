import type { AdminAssessmentSettingsInput, AssessmentPlatformSettings, AuthSessionContext } from '@ieb/shared'
import { getAssessmentSettingsModule } from '../modules/assessment-settings/assessment-settings.module'

export const getAssessmentPlatformSettings = async (): Promise<AssessmentPlatformSettings> => {
  return await getAssessmentSettingsModule().service.getAssessmentPlatformSettings()
}

export const getAdminAssessmentPlatformSettings = async (
  session: AuthSessionContext
): Promise<AssessmentPlatformSettings> => {
  return await getAssessmentSettingsModule().service.getAdminAssessmentPlatformSettings(session)
}

export const updateAdminAssessmentPlatformSettings = async (
  session: AuthSessionContext,
  input: AdminAssessmentSettingsInput
): Promise<AssessmentPlatformSettings> => {
  return await getAssessmentSettingsModule().service.updateAdminAssessmentPlatformSettings(session, input)
}
