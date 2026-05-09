import type { AdminAssessmentSettingsInput, AssessmentPlatformSettings, AuthSessionContext } from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from './auth'
import { getFirebaseAdminCollection } from './firebase-admin'

const DEFAULT_MAX_ATTEMPTS_PER_ASSESSMENT = 3
const SETTINGS_DOCUMENT_ID = 'assessment-config'

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toTimestamp = () => new Date().toISOString()

const getDefaultSettings = (): AssessmentPlatformSettings => {
  const timestamp = toTimestamp()

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

export const getAssessmentPlatformSettings = async (): Promise<AssessmentPlatformSettings> => {
  const snapshot = await getFirebaseAdminCollection('platformSettings').doc(SETTINGS_DOCUMENT_ID).get()

  if (!snapshot.exists) {
    return getDefaultSettings()
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<AssessmentPlatformSettings, 'id'>)
  }
}

export const getAdminAssessmentPlatformSettings = async (
  session: AuthSessionContext
): Promise<AssessmentPlatformSettings> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await getAssessmentPlatformSettings()
}

export const updateAdminAssessmentPlatformSettings = async (
  session: AuthSessionContext,
  input: AdminAssessmentSettingsInput
): Promise<AssessmentPlatformSettings> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  if (!Number.isFinite(input.maxAttemptsPerAssessment) || input.maxAttemptsPerAssessment < 1 || input.maxAttemptsPerAssessment > 20) {
    throw createHttpError(400, 'Informe um limite global de tentativas entre 1 e 20.')
  }

  const existingSettings = await getAssessmentPlatformSettings()
  const timestamp = toTimestamp()
  const nextSettings: AssessmentPlatformSettings = {
    ...existingSettings,
    maxAttemptsPerAssessment: Math.trunc(input.maxAttemptsPerAssessment),
    createdAt: existingSettings.createdAt || timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: existingSettings.createdBy || session.user.id,
    updatedBy: session.user.id,
    deletedBy: null
  }

  await getFirebaseAdminCollection('platformSettings').doc(SETTINGS_DOCUMENT_ID).set(nextSettings)

  await writeAdminLog(session, {
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
