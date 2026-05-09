import type { AdminHighlightInput, AuthSessionContext, PlatformHighlight } from '@ieb/shared'
import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { writeAdminLog } from './auth'
import { getFirebaseAdminCollection } from './firebase-admin'

const VALID_MEDIA_TYPES = new Set(['image', 'video'])
const VALID_ACTION_TARGETS = new Set(['_self', '_blank'])
const VALID_BUTTON_VARIANTS = new Set(['primary', 'secondary', 'ghost', 'success'])

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toTimestamp = () => new Date().toISOString()

const toHighlightDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<PlatformHighlight, 'id'>)
  }) as PlatformHighlight

const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

const listAdminHighlights = async () => {
  const snapshot = await getFirebaseAdminCollection('highlights').get()

  return snapshot.docs
    .map(toHighlightDocument)
    .filter((highlight) => !highlight.deletedAt)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order
      }

      return left.title.localeCompare(right.title, 'pt-BR')
    })
}

const getHighlightById = async (highlightId: string) => {
  const snapshot = await getFirebaseAdminCollection('highlights').doc(highlightId).get()

  if (!snapshot.exists) {
    return null
  }

  return toHighlightDocument(snapshot)
}

const assertAdminHighlightPayload = (input: AdminHighlightInput) => {
  const title = input.title.trim()
  const description = input.description.trim()
  const mediaUrl = normalizeOptionalText(input.mediaUrl)
  const mediaType = input.mediaType

  if (!title) {
    throw createHttpError(400, 'Informe o titulo do destaque.')
  }

  if (!description) {
    throw createHttpError(400, 'Informe a descricao do destaque.')
  }

  if (mediaType !== null && !VALID_MEDIA_TYPES.has(mediaType)) {
    throw createHttpError(400, 'Informe um tipo de midia valido para o destaque.')
  }

  if (mediaType && !mediaUrl) {
    throw createHttpError(400, 'Informe a URL da midia do destaque.')
  }

  if (!mediaType && mediaUrl) {
    throw createHttpError(400, 'Selecione o tipo da midia antes de informar a URL.')
  }

  if (!Number.isFinite(input.order) || input.order < 0) {
    throw createHttpError(400, 'Informe uma ordem valida para o destaque.')
  }

  const actions = input.actions.map((action) => ({
    id: action.id.trim() || randomUUID(),
    label: action.label.trim(),
    href: action.href.trim(),
    target: action.target,
    variant: action.variant
  }))

  actions.forEach((action, index) => {
    if (!action.label) {
      throw createHttpError(400, `Informe o texto do botao ${index + 1}.`)
    }

    if (!action.href) {
      throw createHttpError(400, `Informe o link do botao ${index + 1}.`)
    }

    if (!VALID_ACTION_TARGETS.has(action.target)) {
      throw createHttpError(400, `Informe um target valido para o botao ${index + 1}.`)
    }

    if (!VALID_BUTTON_VARIANTS.has(action.variant)) {
      throw createHttpError(400, `Informe um estilo valido para o botao ${index + 1}.`)
    }
  })

  return {
    title,
    description,
    mediaType,
    mediaUrl,
    actions
  }
}

export const listAdminHighlightsForManagement = async (session: AuthSessionContext): Promise<PlatformHighlight[]> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await listAdminHighlights()
}

export const getAdminHighlightById = async (
  session: AuthSessionContext,
  highlightId: string
): Promise<PlatformHighlight> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedHighlightId = highlightId.trim()

  if (!normalizedHighlightId) {
    throw createHttpError(400, 'Informe um identificador valido para o destaque.')
  }

  const highlight = await getHighlightById(normalizedHighlightId)

  if (!highlight || highlight.deletedAt) {
    throw createHttpError(404, 'Destaque nao encontrado.')
  }

  return highlight
}

export const createAdminHighlight = async (
  session: AuthSessionContext,
  input: AdminHighlightInput
): Promise<PlatformHighlight> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalized = assertAdminHighlightPayload(input)
  const timestamp = toTimestamp()
  const highlightId = randomUUID()
  const highlight: PlatformHighlight = {
    id: highlightId,
    kind: 'announcement',
    title: normalized.title,
    description: normalized.description,
    isActive: input.isActive,
    mediaType: normalized.mediaType,
    mediaUrl: normalized.mediaUrl,
    actions: normalized.actions,
    order: Math.trunc(input.order),
    publishedAt: input.isActive ? timestamp : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: session.user.id,
    updatedBy: session.user.id,
    deletedBy: null
  }

  await getFirebaseAdminCollection('highlights').doc(highlight.id).set(highlight)

  await writeAdminLog(session, {
    action: 'create',
    targetCollection: 'highlights',
    targetId: highlight.id,
    summary: 'Criou um novo destaque no painel administrativo.',
    metadata: {
      isActive: highlight.isActive,
      mediaType: highlight.mediaType,
      actionCount: highlight.actions.length
    }
  })

  return highlight
}

export const updateAdminHighlightById = async (
  session: AuthSessionContext,
  highlightId: string,
  input: AdminHighlightInput
): Promise<PlatformHighlight> => {
  const existingHighlight = await getAdminHighlightById(session, highlightId)
  const normalized = assertAdminHighlightPayload(input)
  const timestamp = toTimestamp()
  const publishedAt =
    input.isActive && !existingHighlight.publishedAt
      ? timestamp
      : input.isActive
        ? existingHighlight.publishedAt
        : null

  const updatedHighlight: PlatformHighlight = {
    ...existingHighlight,
    title: normalized.title,
    description: normalized.description,
    isActive: input.isActive,
    mediaType: normalized.mediaType,
    mediaUrl: normalized.mediaUrl,
    actions: normalized.actions,
    order: Math.trunc(input.order),
    publishedAt,
    updatedAt: timestamp,
    updatedBy: session.user.id
  }

  await getFirebaseAdminCollection('highlights').doc(existingHighlight.id).set(updatedHighlight)

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'highlights',
    targetId: updatedHighlight.id,
    summary: 'Atualizou um destaque do painel administrativo.',
    metadata: {
      isActive: updatedHighlight.isActive,
      mediaType: updatedHighlight.mediaType,
      actionCount: updatedHighlight.actions.length
    }
  })

  return updatedHighlight
}

export const deleteAdminHighlightById = async (
  session: AuthSessionContext,
  highlightId: string
): Promise<PlatformHighlight> => {
  const existingHighlight = await getAdminHighlightById(session, highlightId)
  const timestamp = toTimestamp()
  const deletedHighlight: PlatformHighlight = {
    ...existingHighlight,
    isActive: false,
    publishedAt: null,
    updatedAt: timestamp,
    deletedAt: timestamp,
    updatedBy: session.user.id,
    deletedBy: session.user.id
  }

  await getFirebaseAdminCollection('highlights').doc(existingHighlight.id).set(deletedHighlight)

  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'highlights',
    targetId: deletedHighlight.id,
    summary: 'Excluiu um destaque do painel administrativo.',
    metadata: {
      title: deletedHighlight.title
    }
  })

  return deletedHighlight
}

export const listActiveHomeHighlights = async (session: AuthSessionContext): Promise<PlatformHighlight[]> => {
  if (!session.user.id) {
    throw createHttpError(401, 'Sessao expirada. Faca login novamente.')
  }

  const snapshot = await getFirebaseAdminCollection('highlights').get()

  return snapshot.docs
    .map(toHighlightDocument)
    .filter((highlight) => !highlight.deletedAt && highlight.isActive)
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order
      }

      return Date.parse(right.publishedAt || right.createdAt) - Date.parse(left.publishedAt || left.createdAt)
    })
}
