import type { AuthSessionContext } from '@ieb/shared'
import type { AdminLogRepository, WriteAdminLogInput } from '../application/ports'
import { getFirebaseAdminCollection, getFirebaseAdminFirestore } from '../../shared/infrastructure/firebase-admin'

interface FirebaseAdminLogRepositoryDependencies {
  clock: {
    now(): string
  }
}

export class FirebaseAdminLogRepository implements AdminLogRepository {
  private readonly clock: FirebaseAdminLogRepositoryDependencies['clock']

  constructor(dependencies: FirebaseAdminLogRepositoryDependencies) {
    this.clock = dependencies.clock
  }

  async write(session: AuthSessionContext, input: WriteAdminLogInput, summary?: string) {
    const firestore = getFirebaseAdminFirestore()
    const now = this.clock.now()
    const logRef = getFirebaseAdminCollection('adminLogs', firestore).doc()
    const payload =
      typeof input === 'string'
        ? {
            action: input,
            targetCollection: 'auth',
            targetId: session.user.id,
            summary: summary || '',
            metadata: {}
          }
        : {
            ...input,
            metadata: input.metadata || {}
          }

    await logRef.set({
      id: logRef.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: payload.action,
      targetCollection: payload.targetCollection,
      targetId: payload.targetId,
      summary: payload.summary,
      metadata: payload.metadata,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    })
  }
}
