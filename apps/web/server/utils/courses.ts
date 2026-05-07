import type { AuthSessionContext, Course, CourseEnrollment, CourseModule, Lesson, LessonProgress } from '@ieb/shared'
import { createError } from 'h3'
import { getFirebaseAdminCollection } from './firebase-admin'

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Course, 'id'>)
  }) as Course

const toModuleDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<CourseModule, 'id'>)
  }) as CourseModule

const toLessonDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Lesson, 'id'>)
  }) as Lesson

const toLessonProgressDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<LessonProgress, 'id'>)
  }) as LessonProgress

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const isActiveEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')

const isVisibleStudentCourse = (course: Course) => !course.deletedAt && course.visibility === 'published'

const isAccessibleAdminCourse = (course: Course) => !course.deletedAt

const sortCoursesByTitle = (courses: Course[]) =>
  [...courses].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))

const toTimestampNumber = (timestamp: string | null | undefined) => {
  if (!timestamp) {
    return 0
  }

  const parsedTimestamp = Date.parse(timestamp)

  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp
}

const hasLessonProgressStarted = (lessonProgress: LessonProgress) =>
  !lessonProgress.deletedAt &&
  (lessonProgress.watchedMinutes > 0 ||
    lessonProgress.lastPositionInSeconds > 0 ||
    lessonProgress.completionRate > 0 ||
    lessonProgress.markedAsCompleted ||
    Boolean(lessonProgress.completedAt))

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

const getActiveEnrollmentForCourse = async (userId: string, courseId: string) => {
  const enrollmentSnapshot = await getFirebaseAdminCollection('enrollments').where('userId', '==', userId).get()

  return (
    enrollmentSnapshot.docs
      .map((document) => document.data() as CourseEnrollment)
      .find((enrollment) => enrollment.courseId === courseId && isActiveEnrollment(enrollment)) || null
  )
}

const listCourseModules = async (course: Course) => {
  const moduleSnapshot = await getFirebaseAdminCollection('modules').where('courseId', '==', course.id).get()
  const modules = moduleSnapshot.docs
    .map(toModuleDocument)
    .filter((module) => !module.deletedAt)

  const moduleOrderIndex = new Map(course.moduleIds.map((moduleId, index) => [moduleId, index]))

  return [...modules].sort((left, right) => {
    const leftIndex = moduleOrderIndex.get(left.id)
    const rightIndex = moduleOrderIndex.get(right.id)

    if (typeof leftIndex === 'number' && typeof rightIndex === 'number') {
      return leftIndex - rightIndex
    }

    if (typeof leftIndex === 'number') {
      return -1
    }

    if (typeof rightIndex === 'number') {
      return 1
    }

    return left.order - right.order
  })
}

const listCourseLessons = async (course: Course) => {
  const lessonSnapshot = await getFirebaseAdminCollection('lessons').where('courseId', '==', course.id).get()

  return lessonSnapshot.docs.map(toLessonDocument).filter((lesson) => !lesson.deletedAt)
}

const sortModuleLessons = (module: CourseModule, lessons: Lesson[]) => {
  const lessonOrderIndex = new Map(module.lessonIds.map((lessonId, index) => [lessonId, index]))

  return [...lessons].sort((left, right) => {
    const leftIndex = lessonOrderIndex.get(left.id)
    const rightIndex = lessonOrderIndex.get(right.id)

    if (typeof leftIndex === 'number' && typeof rightIndex === 'number') {
      return leftIndex - rightIndex
    }

    if (typeof leftIndex === 'number') {
      return -1
    }

    if (typeof rightIndex === 'number') {
      return 1
    }

    return left.order - right.order
  })
}

const getFirstCourseLessonReference = (course: Course, modules: CourseModule[], lessons: Lesson[]) => {
  const lessonsByModuleId = new Map<string, Lesson[]>()

  for (const lesson of lessons) {
    const existingLessons = lessonsByModuleId.get(lesson.moduleId) || []
    existingLessons.push(lesson)
    lessonsByModuleId.set(lesson.moduleId, existingLessons)
  }

  for (const module of modules) {
    const orderedLessons = sortModuleLessons(module, lessonsByModuleId.get(module.id) || [])
    const firstLesson = orderedLessons[0]

    if (firstLesson) {
      return {
        moduleSlug: module.slug,
        lessonSlug: firstLesson.slug,
        href: `/curso/${course.slug}/modulo/${module.slug}/aula/${firstLesson.slug}`
      }
    }
  }

  return null
}

const getContinueWatchingHref = async (
  session: AuthSessionContext,
  course: Course,
  modules: CourseModule[],
  lessons: Lesson[]
) => {
  const lessonProgressSnapshot = await getFirebaseAdminCollection('lessonProgress').where('userId', '==', session.user.id).get()
  const moduleById = new Map(modules.map((module) => [module.id, module]))
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

  const latestStartedLessonProgress = lessonProgressSnapshot.docs
    .map(toLessonProgressDocument)
    .filter((lessonProgress) => lessonProgress.courseId === course.id && hasLessonProgressStarted(lessonProgress))
    .sort((left, right) => toTimestampNumber(right.updatedAt) - toTimestampNumber(left.updatedAt))
    .find((lessonProgress) => {
      const lesson = lessonById.get(lessonProgress.lessonId)
      const module = moduleById.get(lessonProgress.moduleId)

      return Boolean(lesson && module && lesson.moduleId === module.id)
    })

  if (!latestStartedLessonProgress) {
    return null
  }

  const lesson = lessonById.get(latestStartedLessonProgress.lessonId)
  const module = moduleById.get(latestStartedLessonProgress.moduleId)

  if (!lesson || !module) {
    return null
  }

  return `/curso/${course.slug}/modulo/${module.slug}/aula/${lesson.slug}`
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

export const getAccessibleCourseDetailBySlug = async (session: AuthSessionContext, courseSlug: string) => {
  if (!courseSlug.trim()) {
    throw createHttpError(400, 'Informe um slug de curso valido.')
  }

  const course = await getCourseById(courseSlug.trim())

  if (!course) {
    throw createHttpError(404, 'Curso nao encontrado.')
  }

  if (session.user.role === 'admin') {
    if (!isAccessibleAdminCourse(course)) {
      throw createHttpError(404, 'Curso nao encontrado.')
    }

    const modules = await listCourseModules(course)
    const lessons = await listCourseLessons(course)
    const firstCourseLesson = getFirstCourseLessonReference(course, modules, lessons)

    return {
      course,
      modules,
      actions: {
        startCourseHref: firstCourseLesson?.href || null,
        continueWatchingHref: await getContinueWatchingHref(session, course, modules, lessons)
      }
    }
  }

  const enrollment = await getActiveEnrollmentForCourse(session.user.id, course.id)

  if (!enrollment || !isVisibleStudentCourse(course)) {
    throw createHttpError(403, 'Voce nao tem acesso a este curso.')
  }

  const modules = await listCourseModules(course)
  const lessons = await listCourseLessons(course)
  const firstCourseLesson = getFirstCourseLessonReference(course, modules, lessons)

  return {
    course,
    modules,
    actions: {
      startCourseHref: firstCourseLesson?.href || null,
      continueWatchingHref: await getContinueWatchingHref(session, course, modules, lessons)
    }
  }
}
