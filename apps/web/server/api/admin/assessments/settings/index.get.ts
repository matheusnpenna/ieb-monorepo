import type { AdminAssessmentSettingsResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { getAdminAssessmentPlatformSettings } from '../../../../utils/assessment-settings'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'

export default defineEventHandler(async (event): Promise<AdminAssessmentSettingsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const settings = await getAdminAssessmentPlatformSettings(session)

    return {
      status: 'success',
      data: settings
    }
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    const statusMessage =
      typeof error === 'object' &&
      error !== null &&
      'statusMessage' in error &&
      typeof error.statusMessage === 'string' &&
      error.statusMessage
        ? error.statusMessage
        : 'Nao foi possivel carregar a configuracao de tentativas.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'platformSettings',
          targetId: 'assessment-config',
          summary: 'Falha ao carregar a configuracao de tentativas das avaliacoes.',
          metadata: {
            statusCode,
            statusMessage
          }
        })
      } catch {}
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
