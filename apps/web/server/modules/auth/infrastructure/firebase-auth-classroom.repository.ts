import type { Classroom } from '@ieb/shared'
import type { AuthClassroomRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../../utils/firebase-admin'

export class FirebaseAuthClassroomRepository implements AuthClassroomRepository {
  async findByUuid(classroomUuid: string) {
    const snapshot = await getFirebaseAdminCollection('classrooms')
      .where('uuid', '==', classroomUuid)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    const classroomDocument = snapshot.docs[0]

    if (!classroomDocument) {
      return null
    }

    return {
      id: classroomDocument.id,
      ...(classroomDocument.data() as Omit<Classroom, 'id'>)
    } as Classroom
  }
}
