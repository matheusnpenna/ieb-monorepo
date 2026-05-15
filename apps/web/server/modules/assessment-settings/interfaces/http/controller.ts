import type {
  AdminAssessmentSettingsInput,
  AdminAssessmentSettingsResponse,
  AuthSessionContext
} from '@ieb/shared'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { getAssessmentSettingsModule } from '../../assessment-settings.module'
import { SETTINGS_DOCUMENT_ID } from '../../domain/validation'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    summary: string
    statusCode: number
    statusMessage: string
  }
) => {
  if (!session) {
    return
  }

  try {
    await getAssessmentSettingsModule().adminLog.write(session, {
      action: 'update',
      targetCollection: 'platformSettings',
      targetId: SETTINGS_DOCUMENT_ID,
      summary: input.summary,
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage
      }
    })
  } catch {
    // Preserve original error response.
  }
}

export const handleGetAdminAssessmentSettings = async (
  event: H3Event
): Promise<AdminAssessmentSettingsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const settings = await getAssessmentSettingsModule().service.getAdminAssessmentPlatformSettings(session)

    return {
      status: 'success',
      data: settings
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar a configuracao de tentativas.')

    await writeFailureLog(session, {
      summary: 'Falha ao carregar a configuracao de tentativas das avaliacoes.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleUpdateAdminAssessmentSettings = async (
  event: H3Event
): Promise<AdminAssessmentSettingsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminAssessmentSettingsInput>(event)
    const settings = await getAssessmentSettingsModule().service.updateAdminAssessmentPlatformSettings(session, {
      maxAttemptsPerAssessment: Number(body?.maxAttemptsPerAssessment || 0)
    })

    return {
      status: 'success',
      data: settings
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel salvar a configuracao de tentativas.')

    await writeFailureLog(session, {
      summary: 'Falha ao salvar a configuracao de tentativas das avaliacoes.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
