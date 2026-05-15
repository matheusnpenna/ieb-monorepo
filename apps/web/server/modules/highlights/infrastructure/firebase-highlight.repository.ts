import type { PlatformHighlight } from '@ieb/shared'
import type { HighlightRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'

const toHighlightDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<PlatformHighlight, 'id'>)
  }) as PlatformHighlight

export class FirebaseHighlightRepository implements HighlightRepository {
  async listAll() {
    const snapshot = await getFirebaseAdminCollection('highlights').get()

    return snapshot.docs.map(toHighlightDocument)
  }

  async findById(highlightId: string) {
    const snapshot = await getFirebaseAdminCollection('highlights').doc(highlightId).get()

    if (!snapshot.exists) {
      return null
    }

    return toHighlightDocument(snapshot)
  }

  async save(highlight: PlatformHighlight) {
    await getFirebaseAdminCollection('highlights').doc(highlight.id).set(highlight)
  }
}
