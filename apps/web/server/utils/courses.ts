import type { AuthSessionContext, Course, CourseEnrollment } from '@ieb/shared'
import { getFirebaseAdminCollection } from './firebase-admin'

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Course, 'id'>)
  }) as Course

const isActiveEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')

const isVisibleStudentCourse = (course: Course) => !course.deletedAt && course.visibility === 'published'

const isAccessibleAdminCourse = (course: Course) => !course.deletedAt

const sortCoursesByTitle = (courses: Course[]) =>
  [...courses].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))

const listAdminCourses = async () => {
  const snapshot = await getFirebaseAdminCollection('courses').get()

  return sortCoursesByTitle(snapshot.docs.map(toCourseDocument).filter(isAccessibleAdminCourse))
}

const getCourseById = async (courseId: string) => {
  const snapshot = await getFirebaseAdminCollection('courses').doc(courseId).get()

  if (!snapshot.exists) {
    return null
  }

  return toCourseDocument(snapshot)
}

const listStudentCourses = async (userId: string) => {
  const enrollmentSnapshot = await getFirebaseAdminCollection('enrollments').where('userId', '==', userId).get()
  const courseIds = [...new Set(
    enrollmentSnapshot.docs
      .map((document) => document.data() as CourseEnrollment)
      .filter(isActiveEnrollment)
      .map((enrollment) => enrollment.courseId)
      .filter(Boolean)
  )]

  if (courseIds.length === 0) {
    return []
  }

  const courses = await Promise.all(courseIds.map((courseId) => getCourseById(courseId)))

  return sortCoursesByTitle(courses.filter((course): course is Course => Boolean(course)).filter(isVisibleStudentCourse))
}

export const listAccessibleCourses = async (session: AuthSessionContext) => {
  if (session.user.role === 'admin') {
    return await listAdminCourses()
  }

  return await listStudentCourses(session.user.id)
}
