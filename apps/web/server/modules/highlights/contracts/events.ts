import type { PlatformHighlight } from '@ieb/shared'

export type HighlightDomainEvent =
  | {
      type: 'HighlightCreated'
      payload: { highlight: PlatformHighlight }
    }
  | {
      type: 'HighlightUpdated'
      payload: { highlight: PlatformHighlight }
    }
  | {
      type: 'HighlightDeleted'
      payload: { highlight: PlatformHighlight }
    }
