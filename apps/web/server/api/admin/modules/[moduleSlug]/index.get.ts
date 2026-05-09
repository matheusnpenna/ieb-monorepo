import type { AdminModuleResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { getAdminModuleBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  const moduleSlug = String(event.context.params?.moduleSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const module = await getAdminModuleBySlug(session, moduleSlug)

    return {
      status: 'success',
      data: module
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
        : 'Nao foi possivel carregar o modulo.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'modules',
          targetId: moduleSlug || 'module',
          summary: 'Falha ao carregar modulo no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage,
            moduleSlug: moduleSlug || null
          }
        })
      } catch {
        // Preserve the original error response if admin log persistence fails.
      }
    }

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
})
