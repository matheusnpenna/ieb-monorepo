import type { Course } from '@ieb/shared'
import type { UserCourseRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Course, 'id'>),
    id: snapshot.id
  }) as Course

export class FirebaseUserCourseRepository implements UserCourseRepository {
  async listAll() {
    const snapshot = await getFirebaseAdminCollection('courses').get()

    return snapshot.docs.map(toCourseDocument)
  }
}
