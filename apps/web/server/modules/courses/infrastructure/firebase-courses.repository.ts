import type {
  AdminCourseInput,
  AuthSessionContext,
  Course,
  CourseEnrollment,
  CourseModule,
  HomeMetricsData,
  Lesson,
  LessonProgress
} from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from '../../auth/interfaces/http/session'
import { hasLessonProgressStarted } from '../../shared/domain/lesson-progress'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'
import { buildAdminCoursePayload } from '../domain/factory'
import { createFourDigitSlugHash, normalizeCourseSlug } from '../domain/validation'

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

const toTimestamp = () => new Date().toISOString()

const toTimestampNumber = (timestamp: string | null | undefined) => {
  if (!timestamp) {
    return 0
  }

  const parsedTimestamp = Date.parse(timestamp)

  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp
}

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

const getCourseBySlug = async (courseSlug: string) => {
  const courseById = await getCourseById(courseSlug)

  if (courseById) {
    return courseById
  }

  const snapshot = await getFirebaseAdminCollection('courses').where('slug', '==', courseSlug).get()
  const legacyCourseSnapshot = snapshot.docs.find((document) => {
    const course = toCourseDocument(document)

    return !course.deletedAt
  })

  return legacyCourseSnapshot ? toCourseDocument(legacyCourseSnapshot) : null
}

const resolveUniqueAdminCourseSlug = async (input: AdminCourseInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug) {
    throw createHttpError(400, 'Informe um slug de curso valido.')
  }

  const existingBaseCourse = await getCourseById(baseSlug)

  if (!existingBaseCourse) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`
    const existingCourse = await getCourseById(nextSlug)

    if (!existingCourse) {
      return nextSlug
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um slug unico para o curso.')
}

const getActiveEnrollmentForCourse = async (userId: string, courseId: string) => {
  const enrollmentSnapshot = await getFirebaseAdminCollection('enrollments').where('userId', '==', userId).get()

  return (
    enrollmentSnapshot.docs
      .map((document) => document.data() as CourseEnrollment)
      .find((enrollment) => enrollment.courseId === courseId && isActiveEnrollment(enrollment)) || null
  )
}

const listUserEnrollments = async (userId: string) => {
  const enrollmentSnapshot = await getFirebaseAdminCollection('enrollments').where('userId', '==', userId).get()

  return enrollmentSnapshot.docs.map((document) => document.data() as CourseEnrollment)
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

const listCourseLessonProgress = async (userId: string, courseId: string) => {
  const lessonProgressSnapshot = await getFirebaseAdminCollection('lessonProgress').where('userId', '==', userId).get()

  return lessonProgressSnapshot.docs
    .map(toLessonProgressDocument)
    .filter((lessonProgress) => lessonProgress.courseId === courseId)
}

const buildLessonNavigationHref = (courseSlug: string, moduleSlug: string, lessonSlug: string) =>
  `/curso/${courseSlug}/modulo/${moduleSlug}/aula/${lessonSlug}`

const getContinueWatchingHref = async (
  session: AuthSessionContext,
  course: Course,
  modules: CourseModule[],
  lessons: Lesson[]
) => {
  const courseLessonProgress = await listCourseLessonProgress(session.user.id, course.id)
  const moduleById = new Map(modules.map((module) => [module.id, module]))
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

  const latestStartedLessonProgress = courseLessonProgress
    .filter(hasLessonProgressStarted)
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
  const courseIds = [...new Set(
    (await listUserEnrollments(userId))
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

export const listAdminCoursesForManagement = async (session: AuthSessionContext) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await listAdminCourses()
}

export const getAdminCourseBySlug = async (session: AuthSessionContext, courseSlug: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedSlug = normalizeCourseSlug(courseSlug)

  if (!normalizedSlug) {
    throw createHttpError(400, 'Informe um slug de curso valido.')
  }

  const course = await getCourseById(normalizedSlug)

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso nao encontrado.')
  }

  return course
}

export const createAdminCourse = async (session: AuthSessionContext, input: AdminCourseInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const resolvedSlug = await resolveUniqueAdminCourseSlug(input)
  const coursePayload = buildAdminCoursePayload(input, session.user.id, { resolvedSlug })

  await getFirebaseAdminCollection('courses').doc(coursePayload.slug).set(coursePayload)
  await writeAdminLog(session, {
    action: 'create',
    targetCollection: 'courses',
    targetId: coursePayload.id,
    summary: `Curso ${coursePayload.title} criado no painel administrativo.`,
    metadata: {
      slug: coursePayload.slug,
      visibility: coursePayload.visibility
    }
  })

  return coursePayload
}

export const updateAdminCourseBySlug = async (session: AuthSessionContext, courseSlug: string, input: AdminCourseInput) => {
  const existingCourse = await getAdminCourseBySlug(session, courseSlug)
  const coursePayload = buildAdminCoursePayload(input, session.user.id, { existingCourse })

  await getFirebaseAdminCollection('courses').doc(existingCourse.id).set(coursePayload, { merge: true })
  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'courses',
    targetId: existingCourse.id,
    summary: `Curso ${coursePayload.title} atualizado no painel administrativo.`,
    metadata: {
      slug: coursePayload.slug,
      visibility: coursePayload.visibility
    }
  })

  return coursePayload
}

export const deleteAdminCourseBySlug = async (session: AuthSessionContext, courseSlug: string) => {
  const existingCourse = await getAdminCourseBySlug(session, courseSlug)
  const now = toTimestamp()

  const deletedCourse = {
    ...existingCourse,
    updatedAt: now,
    deletedAt: now,
    updatedBy: session.user.id,
    deletedBy: session.user.id
  }

  await getFirebaseAdminCollection('courses').doc(existingCourse.id).set(
    {
      updatedAt: deletedCourse.updatedAt,
      deletedAt: deletedCourse.deletedAt,
      updatedBy: deletedCourse.updatedBy,
      deletedBy: deletedCourse.deletedBy
    },
    { merge: true }
  )
  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'courses',
    targetId: existingCourse.id,
    summary: `Curso ${existingCourse.title} removido no painel administrativo.`,
    metadata: {
      slug: existingCourse.slug
    }
  })

  return deletedCourse
}

export const getHomeMetrics = async (session: AuthSessionContext): Promise<HomeMetricsData> => {
  const accessibleCourses = await listAccessibleCourses(session)
  const accessibleCourseIds = new Set(accessibleCourses.map((course) => course.id))

  const [enrollments, lessonProgressList, courseStructures] = await Promise.all([
    listUserEnrollments(session.user.id),
    getFirebaseAdminCollection('lessonProgress')
      .where('userId', '==', session.user.id)
      .get()
      .then((snapshot) => snapshot.docs.map(toLessonProgressDocument)),
    Promise.all(
      accessibleCourses.map(async (course) => {
        const [modules, lessons] = await Promise.all([listCourseModules(course), listCourseLessons(course)])

        return {
          course,
          modules,
          lessons
        }
      })
    )
  ])

  const courseById = new Map(courseStructures.map((item) => [item.course.id, item.course]))
  const moduleById = new Map(courseStructures.flatMap((item) => item.modules.map((module) => [module.id, module] as const)))
  const lessonById = new Map(courseStructures.flatMap((item) => item.lessons.map((lesson) => [lesson.id, lesson] as const)))

  const latestStartedLessonProgress = lessonProgressList
    .filter((lessonProgress) => accessibleCourseIds.has(lessonProgress.courseId) && hasLessonProgressStarted(lessonProgress))
    .sort((left, right) => toTimestampNumber(right.updatedAt) - toTimestampNumber(left.updatedAt))
    .find((lessonProgress) => {
      const course = courseById.get(lessonProgress.courseId)
      const module = moduleById.get(lessonProgress.moduleId)
      const lesson = lessonById.get(lessonProgress.lessonId)

      return Boolean(course && module && lesson && module.courseId === course.id && lesson.moduleId === module.id)
    })

  const continueWatching = latestStartedLessonProgress
    ? (() => {
        const course = courseById.get(latestStartedLessonProgress.courseId)!
        const module = moduleById.get(latestStartedLessonProgress.moduleId)!
        const lesson = lessonById.get(latestStartedLessonProgress.lessonId)!

        return {
          lessonTitle: lesson.title,
          courseTitle: course.title,
          href: buildLessonNavigationHref(course.slug, module.slug, lesson.slug)
        }
      })()
    : {
        lessonTitle: null,
        courseTitle: null,
        href: null
      }

  const completedCoursesCount = new Set(
    enrollments
      .filter(
        (enrollment) =>
          !enrollment.deletedAt && enrollment.status === 'completed' && accessibleCourseIds.has(enrollment.courseId)
      )
      .map((enrollment) => enrollment.courseId)
  ).size

  return {
    continueWatching,
    completedCourses: {
      count: completedCoursesCount
    }
  }
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
