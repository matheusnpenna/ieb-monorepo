import type {
  AdminModuleInput,
  AdminModuleResponse,
  AdminModulesResponse,
  AuthSessionContext,
  ModuleDetailResponse
} from '@ieb/shared'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { getCourseModulesModule } from '../../course-modules.module'

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

const normalizeAdminModuleInput = (body: AdminModuleInput | null | undefined): AdminModuleInput => ({
  courseId: body?.courseId || '',
  title: body?.title || '',
  slug: body?.slug || '',
  description: body?.description || '',
  order: Number(body?.order ?? 1),
  estimatedDurationInMinutes: Number(body?.estimatedDurationInMinutes ?? 0)
})

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    action: 'create' | 'update' | 'delete'
    targetId: string
    summary: string
    statusCode: number
    statusMessage: string
    metadata?: Record<string, unknown>
  }
) => {
  if (!session) {
    return
  }

  try {
    await getCourseModulesModule().adminLog.write(session, {
      action: input.action,
      targetCollection: 'modules',
      targetId: input.targetId,
      summary: input.summary,
      metadata: {
        statusCode: input.statusCode,
        statusMessage: input.statusMessage,
        ...(input.metadata || {})
      }
    })
  } catch {
    // Preserve the original error response if admin log persistence fails.
  }
}

export const handleListAdminModules = async (event: H3Event): Promise<AdminModulesResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const modules = await getCourseModulesModule().service.listAdminModulesForManagement(session)

    return {
      status: 'success',
      data: modules
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os modulos do painel.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: 'list',
      summary: 'Falha ao carregar listagem administrativa de modulos.',
      statusCode,
      statusMessage
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: []
    }
  }
}

export const handleCreateAdminModule = async (event: H3Event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  let requestedSlug = ''

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminModuleInput>(event)
    requestedSlug = body?.slug || body?.title || ''
    const module = await getCourseModulesModule().service.createAdminModule(session, normalizeAdminModuleInput(body))

    return {
      status: 'success',
      data: module
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar o modulo.')

    await writeFailureLog(session, {
      action: 'create',
      targetId: requestedSlug || 'new-module',
      summary: 'Falha ao criar modulo no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: {
        requestedSlug: requestedSlug || null
      }
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleGetAdminModule = async (event: H3Event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  const moduleSlug = String(event.context.params?.moduleSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const module = await getCourseModulesModule().service.getAdminModuleBySlug(session, moduleSlug)

    return {
      status: 'success',
      data: module
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar o modulo.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: moduleSlug || 'module',
      summary: 'Falha ao carregar modulo no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: {
        moduleSlug: moduleSlug || null
      }
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleUpdateAdminModule = async (event: H3Event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  const moduleSlug = String(event.context.params?.moduleSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminModuleInput>(event)
    const module = await getCourseModulesModule().service.updateAdminModuleBySlug(
      session,
      moduleSlug,
      normalizeAdminModuleInput(body)
    )

    return {
      status: 'success',
      data: module
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar o modulo.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: moduleSlug || 'module',
      summary: 'Falha ao atualizar modulo no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: {
        moduleSlug: moduleSlug || null
      }
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleDeleteAdminModule = async (event: H3Event): Promise<AdminModuleResponse> => {
  let session: AuthSessionContext | null = null
  const moduleSlug = String(event.context.params?.moduleSlug ?? '')

  try {
    session = await requireAuthSession(event, { admin: true })
    const module = await getCourseModulesModule().service.deleteAdminModuleBySlug(session, moduleSlug)

    return {
      status: 'success',
      data: module
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover o modulo.')

    await writeFailureLog(session, {
      action: 'delete',
      targetId: moduleSlug || 'module',
      summary: 'Falha ao remover modulo no painel administrativo.',
      statusCode,
      statusMessage,
      metadata: {
        moduleSlug: moduleSlug || null
      }
    })

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}

export const handleGetAccessibleModuleDetail = async (event: H3Event): Promise<ModuleDetailResponse> => {
  try {
    const session = await requireAuthSession(event)
    const courseSlug = String(event.context.params?.courseSlug ?? '')
    const moduleSlug = String(event.context.params?.moduleSlug ?? '')
    const moduleDetail = await getCourseModulesModule().service.getAccessibleModuleDetailBySlugs(
      session,
      courseSlug,
      moduleSlug
    )

    return {
      status: 'success',
      data: moduleDetail
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar o modulo.')

    setResponseStatus(event, statusCode)

    return {
      status: 'error',
      messages: [statusMessage],
      data: null
    }
  }
}
