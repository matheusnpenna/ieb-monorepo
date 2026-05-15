import type { CourseEnrollment } from '@ieb/shared'
import type { UserEnrollmentRepository } from '../application/ports'
import { getFirebaseAdminCollection, getFirebaseAdminFirestore } from '../../../utils/firebase-admin'

const toEnrollmentDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<CourseEnrollment, 'id'>)
  }) as CourseEnrollment

const isCurrentEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')

export class FirebaseUserEnrollmentRepository implements UserEnrollmentRepository {
  async listByUserId(userId: string) {
    const enrollmentSnapshot = await getFirebaseAdminCollection('enrollments').where('userId', '==', userId).get()

    return enrollmentSnapshot.docs.map(toEnrollmentDocument)
  }

  async applyUserEnrollmentChanges(input: {
    userId: string
    desiredCourseIds: string[]
    currentEnrollments: CourseEnrollment[]
    manualClassroomId: string
    actorUserId: string
    timestamp: string
  }) {
    const firestore = getFirebaseAdminFirestore()
    const enrollmentsCollection = getFirebaseAdminCollection('enrollments', firestore)
    const existingByCourseId = new Map<string, CourseEnrollment>()

    input.currentEnrollments.forEach((enrollment) => {
      if (!existingByCourseId.has(enrollment.courseId)) {
        existingByCourseId.set(enrollment.courseId, enrollment)
      }
    })

    const batch = firestore.batch()
    const desiredCourseIdSet = new Set(input.desiredCourseIds)

    input.desiredCourseIds.forEach((courseId) => {
      const existingEnrollment = existingByCourseId.get(courseId)

      if (existingEnrollment && isCurrentEnrollment(existingEnrollment)) {
        return
      }

      if (existingEnrollment) {
        batch.set(
          enrollmentsCollection.doc(existingEnrollment.id),
          {
            status: 'active',
            startedAt: existingEnrollment.startedAt || input.timestamp,
            updatedAt: input.timestamp,
            updatedBy: input.actorUserId,
            deletedAt: null,
            deletedBy: null
          },
          { merge: true }
        )
        return
      }

      const enrollmentRef = enrollmentsCollection.doc()
      const enrollment: CourseEnrollment = {
        id: enrollmentRef.id,
        userId: input.userId,
        classroomId: input.manualClassroomId,
        courseId,
        status: 'active',
        startedAt: input.timestamp,
        completedAt: null,
        certificateIssuedAt: null,
        createdAt: input.timestamp,
        updatedAt: input.timestamp,
        deletedAt: null,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
        deletedBy: null
      }

      batch.set(enrollmentRef, enrollment)
    })

    input.currentEnrollments
      .filter((enrollment) => isCurrentEnrollment(enrollment) && !desiredCourseIdSet.has(enrollment.courseId))
      .forEach((enrollment) => {
        batch.set(
          enrollmentsCollection.doc(enrollment.id),
          {
            status: 'cancelled',
            updatedAt: input.timestamp,
            updatedBy: input.actorUserId
          },
          { merge: true }
        )
      })

    await batch.commit()
  }
}
