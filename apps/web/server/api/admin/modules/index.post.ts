import type { AdminModuleInput, AdminModuleResponse, AuthSessionContext } from '@ieb/shared'
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { requireAuthSession, writeAdminLog } from '../../../utils/auth'
import { createAdminModule } from '../../../utils/courses'

export default defineEventHandler(async (event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  let requestedSlug = ''

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminModuleInput>(event)
    requestedSlug = body?.slug || body?.title || ''
    const module = await createAdminModule(session, {
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
        : 'Nao foi possivel criar o modulo.'

    if (session) {
      try {
        await writeAdminLog(session, {
          action: 'create',
          targetCollection: 'modules',
          targetId: requestedSlug || 'new-module',
          summary: 'Falha ao criar modulo no painel administrativo.',
          metadata: {
            statusCode,
            statusMessage,
            requestedSlug: requestedSlug || null
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
