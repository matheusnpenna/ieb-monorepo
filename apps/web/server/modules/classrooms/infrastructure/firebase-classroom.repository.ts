import type { Classroom } from '@ieb/shared'
import type { ClassroomRepository } from '../application/ports'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'

const toClassroomDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Classroom, 'id'>),
    id: snapshot.id
  }) as Classroom

const toFirestoreClassroom = (classroom: Classroom) => {
  const { id: _id, ...payload } = classroom

  return payload
}

export class FirebaseClassroomRepository implements ClassroomRepository {
  async listAll() {
    const snapshot = await getFirebaseAdminCollection('classrooms').get()

    return snapshot.docs.map(toClassroomDocument)
  }

  async findById(classroomId: string) {
    const snapshot = await getFirebaseAdminCollection('classrooms').doc(classroomId).get()

    if (!snapshot.exists) {
      return null
    }

    return toClassroomDocument(snapshot)
  }

  async findByUuid(classroomUuid: string) {
    const snapshot = await getFirebaseAdminCollection('classrooms').where('uuid', '==', classroomUuid).get()
    const validDocument = snapshot.docs.find((document) => {
      const classroom = toClassroomDocument(document)

      return !classroom.deletedAt
    })

    return validDocument ? toClassroomDocument(validDocument) : null
  }

  async save(classroom: Classroom) {
    await getFirebaseAdminCollection('classrooms').doc(classroom.id).set(toFirestoreClassroom(classroom), {
      merge: true
    })
  }
}
