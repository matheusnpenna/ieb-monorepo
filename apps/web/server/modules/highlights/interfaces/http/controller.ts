import type {
  AdminHighlightInput,
  AdminHighlightResponse,
  AdminHighlightsResponse,
  AuthSessionContext,
  HomeHighlightsResponse
} from '@ieb/shared'
import { readBody, setResponseStatus, type H3Event } from 'h3'
import { requireAuthSession } from '../../../../utils/auth'
import { getHighlightsModule } from '../../highlights.module'

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

const normalizeHighlightInput = (body: AdminHighlightInput | null | undefined): AdminHighlightInput => ({
  title: body?.title || '',
  description: body?.description || '',
  isActive: Boolean(body?.isActive),
  mediaType: body?.mediaType ?? null,
  mediaUrl: body?.mediaUrl ?? null,
  actions: Array.isArray(body?.actions) ? body.actions : [],
  order: Number(body?.order || 0)
})

const writeFailureLog = async (
  session: AuthSessionContext | null,
  input: {
    action: 'create' | 'update' | 'delete'
    targetId: string
    summary: string
    statusCode: number
    statusMessage: string
  }
) => {
  if (!session) {
    return
  }

  try {
    await getHighlightsModule().adminLog.write(session, {
      action: input.action,
      targetCollection: 'highlights',
      targetId: input.targetId,
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

export const handleListAdminHighlights = async (event: H3Event): Promise<AdminHighlightsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const highlights = await getHighlightsModule().service.listAdminHighlightsForManagement(session)

    return {
      status: 'success',
      data: highlights
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os destaques do painel.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: 'list',
      summary: 'Falha ao carregar a listagem de destaques administrativos.',
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

export const handleCreateAdminHighlight = async (event: H3Event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminHighlightInput>(event)
    const highlight = await getHighlightsModule().service.createAdminHighlight(session, normalizeHighlightInput(body))

    return {
      status: 'success',
      data: highlight
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel criar o destaque.')

    await writeFailureLog(session, {
      action: 'create',
      targetId: 'new',
      summary: 'Falha ao criar destaque no painel administrativo.',
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

export const handleGetAdminHighlight = async (event: H3Event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const highlightId = event.context.params?.highlightId || ''
    const highlight = await getHighlightsModule().service.getAdminHighlightById(session, highlightId)

    return {
      status: 'success',
      data: highlight
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar o destaque.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: event.context.params?.highlightId || 'unknown',
      summary: 'Falha ao carregar um destaque do painel administrativo.',
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

export const handleUpdateAdminHighlight = async (event: H3Event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const body = await readBody<AdminHighlightInput>(event)
    const highlightId = event.context.params?.highlightId || ''
    const highlight = await getHighlightsModule().service.updateAdminHighlightById(
      session,
      highlightId,
      normalizeHighlightInput(body)
    )

    return {
      status: 'success',
      data: highlight
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar o destaque.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: event.context.params?.highlightId || 'unknown',
      summary: 'Falha ao atualizar destaque no painel administrativo.',
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

export const handleDeleteAdminHighlight = async (event: H3Event): Promise<AdminHighlightResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event, { admin: true })
    const highlightId = event.context.params?.highlightId || ''
    const highlight = await getHighlightsModule().service.deleteAdminHighlightById(session, highlightId)

    return {
      status: 'success',
      data: highlight
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel remover o destaque.')

    await writeFailureLog(session, {
      action: 'delete',
      targetId: event.context.params?.highlightId || 'unknown',
      summary: 'Falha ao excluir destaque no painel administrativo.',
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

export const handleListHomeHighlights = async (event: H3Event): Promise<HomeHighlightsResponse> => {
  let session: AuthSessionContext | null = null

  try {
    session = await requireAuthSession(event)
    const highlights = await getHighlightsModule().service.listActiveHomeHighlights(session)

    return {
      status: 'success',
      data: highlights
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel carregar os destaques da plataforma.')

    await writeFailureLog(session, {
      action: 'update',
      targetId: 'home',
      summary: 'Falha ao carregar os destaques da home.',
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
