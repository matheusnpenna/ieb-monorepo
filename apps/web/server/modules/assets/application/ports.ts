import type { AuthSessionContext } from '@ieb/shared'

export interface AdminLogPort {
  write(
    session: AuthSessionContext,
    entry: {
      action: 'create' | 'update' | 'delete'
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void>
}

export interface AssetStorage {
  savePublicObject(input: {
    objectPath: string
    data: Uint8Array
    contentType: string
    metadata: Record<string, string>
  }): Promise<{
    bucketName: string
  }>
}

export interface AssetClock {
  today(): string
}

export interface AssetIdGenerator {
  create(): string
}
