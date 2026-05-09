import type {
  AdminUserEnrollmentsData,
  AdminUserEnrollmentsInput,
  AuthSessionContext,
  Course,
  CourseEnrollment,
  User
} from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from './auth'
import { getFirebaseAdminCollection, getFirebaseAdminFirestore } from './firebase-admin'

const MANUAL_CLASSROOM_ID = 'manual-admin-enrollment'

const toTimestamp = () => new Date().toISOString()

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toUserDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<User, 'id'>)
  }) as User

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Course, 'id'>)
  }) as Course

const toEnrollmentDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<CourseEnrollment, 'id'>)
  }) as CourseEnrollment

const isSelectableCourse = (course: Course) => !course.deletedAt && course.visibility !== 'archived'

const isCurrentEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')

const normalizeCourseIds = (courseIds: string[] | undefined) =>
  [...new Set((Array.isArray(courseIds) ? courseIds : []).map((courseId) => courseId.trim()).filter(Boolean))]

const getUserById = async (userId: string) => {
  const userSnapshot = await getFirebaseAdminCollection('users').doc(userId).get()

  if (!userSnapshot.exists) {
    return null
  }

  return toUserDocument(userSnapshot)
}

const listSelectableCourses = async () => {
  const courseSnapshot = await getFirebaseAdminCollection('courses').get()

  return courseSnapshot.docs
    .map(toCourseDocument)
    .filter(isSelectableCourse)
    .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
}

const listEnrollmentsByUserId = async (userId: string) => {
  const enrollmentSnapshot = await getFirebaseAdminCollection('enrollments').where('userId', '==', userId).get()

  return enrollmentSnapshot.docs.map(toEnrollmentDocument)
}

const getUserEnrollmentsData = async (userId: string): Promise<AdminUserEnrollmentsData> => {
  const normalizedUserId = userId.trim()

  if (!normalizedUserId) {
    throw createHttpError(400, 'Informe um identificador valido para o usuario.')
  }

  const user = await getUserById(normalizedUserId)

  if (!user || user.deletedAt) {
    throw createHttpError(404, 'Usuario nao encontrado.')
  }

  const [courses, enrollments] = await Promise.all([
    listSelectableCourses(),
    listEnrollmentsByUserId(user.id)
  ])

  return {
    user,
    courses,
    enrollments
  }
}

export const listAdminUserEnrollments = async (
  session: AuthSessionContext,
  userId: string
): Promise<AdminUserEnrollmentsData> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await getUserEnrollmentsData(userId.trim())
}

export const updateAdminUserEnrollments = async (
  session: AuthSessionContext,
  userId: string,
  input: AdminUserEnrollmentsInput
): Promise<AdminUserEnrollmentsData> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedUserId = userId.trim()
  const desiredCourseIds = normalizeCourseIds(input.courseIds)
  const currentData = await getUserEnrollmentsData(normalizedUserId)
  const selectableCourseIds = new Set(currentData.courses.map((course) => course.id))
  const invalidCourseIds = desiredCourseIds.filter((courseId) => !selectableCourseIds.has(courseId))

  if (invalidCourseIds.length > 0) {
    throw createHttpError(400, 'Informe apenas cursos validos para matricula.')
  }

  const now = toTimestamp()
  const firestore = getFirebaseAdminFirestore()
  const enrollmentsCollection = getFirebaseAdminCollection('enrollments', firestore)
  const existingByCourseId = new Map<string, CourseEnrollment>()

  currentData.enrollments.forEach((enrollment) => {
    if (!existingByCourseId.has(enrollment.courseId)) {
      existingByCourseId.set(enrollment.courseId, enrollment)
    }
  })

  const batch = firestore.batch()
  const desiredCourseIdSet = new Set(desiredCourseIds)

  desiredCourseIds.forEach((courseId) => {
    const existingEnrollment = existingByCourseId.get(courseId)

    if (existingEnrollment && isCurrentEnrollment(existingEnrollment)) {
      return
    }

    if (existingEnrollment) {
      batch.set(
        enrollmentsCollection.doc(existingEnrollment.id),
        {
          status: 'active',
          startedAt: existingEnrollment.startedAt || now,
          updatedAt: now,
          updatedBy: session.user.id,
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
      userId: currentData.user.id,
      classroomId: MANUAL_CLASSROOM_ID,
      courseId,
      status: 'active',
      startedAt: now,
      completedAt: null,
      certificateIssuedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdBy: session.user.id,
      updatedBy: session.user.id,
      deletedBy: null
    }

    batch.set(enrollmentRef, enrollment)
  })

  currentData.enrollments
    .filter((enrollment) => isCurrentEnrollment(enrollment) && !desiredCourseIdSet.has(enrollment.courseId))
    .forEach((enrollment) => {
      batch.set(
        enrollmentsCollection.doc(enrollment.id),
        {
          status: 'cancelled',
          updatedAt: now,
          updatedBy: session.user.id
        },
        { merge: true }
      )
    })

  await batch.commit()

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'enrollments',
    targetId: currentData.user.id,
    summary: 'Atualizou as matriculas de um usuario.',
    metadata: {
      userId: currentData.user.id,
      desiredCourseIds
    }
  })

  return await getUserEnrollmentsData(normalizedUserId)
}
