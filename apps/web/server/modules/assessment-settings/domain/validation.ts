import type { AdminAssessmentSettingsInput } from '@ieb/shared'
import { createAssessmentSettingsError } from './errors'

export const DEFAULT_MAX_ATTEMPTS_PER_ASSESSMENT = 3
export const SETTINGS_DOCUMENT_ID = 'assessment-config'

export const normalizeMaxAttemptsPerAssessment = (input: AdminAssessmentSettingsInput) => {
  const maxAttemptsPerAssessment = Number(input.maxAttemptsPerAssessment)

  if (
    !Number.isFinite(maxAttemptsPerAssessment) ||
    maxAttemptsPerAssessment < 1 ||
    maxAttemptsPerAssessment > 20
  ) {
    throw createAssessmentSettingsError(400, 'Informe um limite global de tentativas entre 1 e 20.')
  }

  return Math.trunc(maxAttemptsPerAssessment)
}
