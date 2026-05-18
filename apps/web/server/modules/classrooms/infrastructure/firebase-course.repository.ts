import type { Course } from '@ieb/shared'
import type { ClassroomCourseRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Course, 'id'>),
    id: snapshot.id
  }) as Course

export class FirebaseClassroomCourseRepository implements ClassroomCourseRepository {
  async findById(courseId: string) {
    const snapshot = await getFirebaseAdminCollection('courses').doc(courseId).get()

    if (!snapshot.exists) {
      return null
    }

    return toCourseDocument(snapshot)
  }

  async findBySlug(courseSlug: string) {
    const snapshot = await getFirebaseAdminCollection('courses').where('slug', '==', courseSlug).get()
    const validDocument = snapshot.docs.find((document) => {
      const course = toCourseDocument(document)

      return !course.deletedAt
    })

    return validDocument ? toCourseDocument(validDocument) : null
  }
}
