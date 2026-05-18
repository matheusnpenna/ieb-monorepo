import type { AdminActivityLog } from '@ieb/shared'
import type { LogRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'

const toAdminLogDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<AdminActivityLog, 'id'>),
    id: snapshot.id
  }) as AdminActivityLog

export class FirebaseLogRepository implements LogRepository {
  async listPage(input: { limit: number; cursorCreatedAt?: string | null }) {
    let query = getFirebaseAdminCollection('adminLogs').orderBy('createdAt', 'desc').limit(input.limit)

    if (input.cursorCreatedAt) {
      query = query.startAfter(input.cursorCreatedAt)
    }

    const snapshot = await query.get()

    return snapshot.docs.map(toAdminLogDocument)
  }
}
