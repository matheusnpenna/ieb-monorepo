import type { AssessmentPlatformSettings } from '@ieb/shared'
import type { AssessmentSettingsRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../../utils/firebase-admin'

export class FirebaseAssessmentSettingsRepository implements AssessmentSettingsRepository {
  async getById(settingsId: string) {
    const snapshot = await getFirebaseAdminCollection('platformSettings').doc(settingsId).get()

    if (!snapshot.exists) {
      return null
    }

    return {
      id: snapshot.id,
      ...(snapshot.data() as Omit<AssessmentPlatformSettings, 'id'>)
    }
  }

  async save(settings: AssessmentPlatformSettings) {
    await getFirebaseAdminCollection('platformSettings').doc(settings.id).set(settings)
  }
}
