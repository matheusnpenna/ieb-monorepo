import type { AdminHighlightInput, AuthSessionContext, PlatformHighlight } from '@ieb/shared'
import type { AdminLogPort, HighlightClock, HighlightIdGenerator, HighlightRepository } from './ports'
import { createHighlightError } from '../domain/errors'
import { assertAdminHighlightPayload } from '../domain/validation'

interface HighlightsServiceDependencies {
  repository: HighlightRepository
  adminLog: AdminLogPort
  clock: HighlightClock
  idGenerator: HighlightIdGenerator
}

export class HighlightsService {
  private readonly repository: HighlightRepository
  private readonly adminLog: AdminLogPort
  private readonly clock: HighlightClock
  private readonly idGenerator: HighlightIdGenerator

  constructor(dependencies: HighlightsServiceDependencies) {
    this.repository = dependencies.repository
    this.adminLog = dependencies.adminLog
    this.clock = dependencies.clock
    this.idGenerator = dependencies.idGenerator
  }

  async listAdminHighlightsForManagement(session: AuthSessionContext): Promise<PlatformHighlight[]> {
    this.assertAdminSession(session)

    return this.sortAdminHighlights(
      (await this.repository.listAll()).filter((highlight) => !highlight.deletedAt)
    )
  }

  async getAdminHighlightById(session: AuthSessionContext, highlightId: string): Promise<PlatformHighlight> {
    this.assertAdminSession(session)

    const normalizedHighlightId = highlightId.trim()

    if (!normalizedHighlightId) {
      throw createHighlightError(400, 'Informe um identificador valido para o destaque.')
    }

    const highlight = await this.repository.findById(normalizedHighlightId)

    if (!highlight || highlight.deletedAt) {
      throw createHighlightError(404, 'Destaque nao encontrado.')
    }

    return highlight
  }

  async createAdminHighlight(
    session: AuthSessionContext,
    input: AdminHighlightInput
  ): Promise<PlatformHighlight> {
    this.assertAdminSession(session)

    const normalized = assertAdminHighlightPayload(input, this.idGenerator)
    const timestamp = this.clock.now()
    const highlightId = this.idGenerator.create()
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

    await this.repository.save(highlight)

    await this.adminLog.write(session, {
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

  async updateAdminHighlightById(
    session: AuthSessionContext,
    highlightId: string,
    input: AdminHighlightInput
  ): Promise<PlatformHighlight> {
    const existingHighlight = await this.getAdminHighlightById(session, highlightId)
    const normalized = assertAdminHighlightPayload(input, this.idGenerator)
    const timestamp = this.clock.now()
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

    await this.repository.save(updatedHighlight)

    await this.adminLog.write(session, {
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

  async deleteAdminHighlightById(
    session: AuthSessionContext,
    highlightId: string
  ): Promise<PlatformHighlight> {
    const existingHighlight = await this.getAdminHighlightById(session, highlightId)
    const timestamp = this.clock.now()
    const deletedHighlight: PlatformHighlight = {
      ...existingHighlight,
      isActive: false,
      publishedAt: null,
      updatedAt: timestamp,
      deletedAt: timestamp,
      updatedBy: session.user.id,
      deletedBy: session.user.id
    }

    await this.repository.save(deletedHighlight)

    await this.adminLog.write(session, {
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

  async listActiveHomeHighlights(session: AuthSessionContext): Promise<PlatformHighlight[]> {
    if (!session.user.id) {
      throw createHighlightError(401, 'Sessao expirada. Faca login novamente.')
    }

    return this.sortHomeHighlights(
      (await this.repository.listAll()).filter((highlight) => !highlight.deletedAt && highlight.isActive)
    )
  }

  private assertAdminSession(session: AuthSessionContext) {
    if (session.user.role !== 'admin') {
      throw createHighlightError(403, 'Acesso restrito ao painel administrativo.')
    }
  }

  private sortAdminHighlights(highlights: PlatformHighlight[]) {
    return [...highlights].sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order
      }

      return left.title.localeCompare(right.title, 'pt-BR')
    })
  }

  private sortHomeHighlights(highlights: PlatformHighlight[]) {
    return [...highlights].sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order
      }

      return Date.parse(right.publishedAt || right.createdAt) - Date.parse(left.publishedAt || left.createdAt)
    })
  }
}
