import type { AdminModuleInput, AdminModuleResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../../utils/auth'
import { updateAdminModuleBySlug } from '../../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  const moduleSlug = String(event.context.params?.moduleSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminModuleInput>(event)
    const module = await updateAdminModuleBySlug(session, moduleSlug, {
      courseId: body?.courseId || '',
      title: body?.title || '',
      slug: body?.slug || '',
      description: body?.description || '',
      order: Number(body?.order ?? 1),
      estimatedDurationInMinutes: Number(body?.estimatedDurationInMinutes ?? 0)
    })

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
        : 'Nao foi possivel atualizar o modulo.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'update',
          targetCollection: 'modules',
          targetId: moduleSlug || 'module',
          summary: 'Falha ao atualizar modulo no painel administrativo.',
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
