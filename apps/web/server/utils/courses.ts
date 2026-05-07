import type {
  AdminCourseInput,
  Assessment,
  AuthSessionContext,
  Course,
  CourseEnrollment,
  CourseModule,
  HomeMetricsData,
  Lesson,
  LessonComment,
  LessonProgress,
  LessonDetailData,
  LessonCommentItem,
  LessonProgressUpdateData,
  ModuleDetailLesson
} from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from './auth'
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

const toAssessmentDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<Assessment, 'id'>)
  }) as Assessment

const toLessonCommentDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    id: snapshot.id,
    ...(snapshot.data() as Omit<LessonComment, 'id'>)
  }) as LessonComment

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const COURSE_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const isActiveEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')

const isVisibleStudentCourse = (course: Course) => !course.deletedAt && course.visibility === 'published'

const isAccessibleAdminCourse = (course: Course) => !course.deletedAt

const sortCoursesByTitle = (courses: Course[]) =>
  [...courses].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))

const toTimestamp = () => new Date().toISOString()
const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

const normalizeCourseSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

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

const isLessonProgressCompleted = (lessonProgress: LessonProgress) =>
  !lessonProgress.deletedAt &&
  (lessonProgress.markedAsCompleted || Boolean(lessonProgress.completedAt) || lessonProgress.completionRate >= 100)

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

const assertAdminCoursePayload = (input: AdminCourseInput, currentCourseSlug?: string) => {
  const normalizedSlug = normalizeCourseSlug(input.slug)
  const normalizedCurrentCourseSlug = currentCourseSlug ? normalizeCourseSlug(currentCourseSlug) : null

  if (!input.title.trim()) {
    throw createHttpError(400, 'Informe o titulo do curso.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createHttpError(400, 'Informe um slug de curso valido.')
  }

  if (normalizedCurrentCourseSlug && normalizedSlug !== normalizedCurrentCourseSlug) {
    throw createHttpError(400, 'O slug do curso nao pode ser alterado apos a criacao.')
  }

  if (!input.shortDescription.trim()) {
    throw createHttpError(400, 'Informe a descricao curta do curso.')
  }

  if (!input.description.trim()) {
    throw createHttpError(400, 'Informe a descricao completa do curso.')
  }

  if (!['draft', 'published', 'archived'].includes(input.visibility)) {
    throw createHttpError(400, 'Informe uma visibilidade de curso valida.')
  }

  if (!Number.isFinite(input.totalDurationInMinutes) || input.totalDurationInMinutes < 0) {
    throw createHttpError(400, 'Informe uma duracao total valida para o curso.')
  }

  if (!Number.isFinite(input.requiredCompletionRate) || input.requiredCompletionRate < 0 || input.requiredCompletionRate > 100) {
    throw createHttpError(400, 'Informe um progresso minimo entre 0 e 100.')
  }

  return normalizedSlug
}

const buildAdminCoursePayload = (
  input: AdminCourseInput,
  actorUserId: string,
  options?: { existingCourse?: Course | null }
): Course => {
  const existingCourse = options?.existingCourse || null
  const now = toTimestamp()
  const normalizedSlug = assertAdminCoursePayload(input, existingCourse?.slug)

  return {
    id: normalizedSlug,
    title: input.title.trim(),
    slug: normalizedSlug,
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    visibility: input.visibility,
    coverImageUrl: normalizeOptionalText(input.coverImageUrl),
    heroImageUrl: normalizeOptionalText(input.heroImageUrl),
    totalDurationInMinutes: Math.max(0, Math.floor(input.totalDurationInMinutes)),
    moduleIds: existingCourse?.moduleIds || [],
    highlightIds: existingCourse?.highlightIds || [],
    requiredCompletionRate: Math.min(100, Math.max(0, Math.floor(input.requiredCompletionRate))),
    certificateEnabled: Boolean(input.certificateEnabled),
    createdAt: existingCourse?.createdAt || now,
    updatedAt: now,
    deletedAt: existingCourse?.deletedAt ?? null,
    createdBy: existingCourse?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingCourse?.deletedBy ?? null
  }
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

const listModuleLessons = (module: CourseModule, lessons: Lesson[]) =>
  sortModuleLessons(
    module,
    lessons.filter((lesson) => lesson.moduleId === module.id)
  )

const listModuleAssessments = async (module: CourseModule) => {
  if (module.assessmentIds.length === 0) {
    return []
  }

  const assessmentSnapshot = await getFirebaseAdminCollection('assessments').where('moduleId', '==', module.id).get()
  const assessments = assessmentSnapshot.docs.map(toAssessmentDocument).filter((assessment) => !assessment.deletedAt)
  const assessmentOrderIndex = new Map(module.assessmentIds.map((assessmentId, index) => [assessmentId, index]))

  return [...assessments].sort((left, right) => {
    const leftIndex = assessmentOrderIndex.get(left.id)
    const rightIndex = assessmentOrderIndex.get(right.id)

    if (typeof leftIndex === 'number' && typeof rightIndex === 'number') {
      return leftIndex - rightIndex
    }

    if (typeof leftIndex === 'number') {
      return -1
    }

    if (typeof rightIndex === 'number') {
      return 1
    }

    return left.title.localeCompare(right.title, 'pt-BR')
  })
}

const listCourseLessonProgress = async (userId: string, courseId: string) => {
  const lessonProgressSnapshot = await getFirebaseAdminCollection('lessonProgress').where('userId', '==', userId).get()

  return lessonProgressSnapshot.docs
    .map(toLessonProgressDocument)
    .filter((lessonProgress) => lessonProgress.courseId === courseId)
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

const getModuleProgress = (module: CourseModule, lessons: Lesson[], lessonProgressList: LessonProgress[]) => {
  const moduleLessons = listModuleLessons(module, lessons)
  const totalLessons = moduleLessons.length

  if (totalLessons === 0) {
    return {
      completionPercentage: 0,
      completedLessons: 0,
      totalLessons: 0
    }
  }

  const completedLessonIds = new Set(
    lessonProgressList
      .filter((lessonProgress) => lessonProgress.moduleId === module.id && isLessonProgressCompleted(lessonProgress))
      .map((lessonProgress) => lessonProgress.lessonId)
  )

  const completedLessons = moduleLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length

  return {
    completionPercentage: Math.round((completedLessons / totalLessons) * 100),
    completedLessons,
    totalLessons
  }
}

const buildModuleDetailLessons = (
  module: CourseModule,
  lessons: Lesson[],
  lessonProgressList: LessonProgress[]
): ModuleDetailLesson[] => {
  const completedLessonIds = new Set(
    lessonProgressList
      .filter((lessonProgress) => lessonProgress.moduleId === module.id && isLessonProgressCompleted(lessonProgress))
      .map((lessonProgress) => lessonProgress.lessonId)
  )

  return listModuleLessons(module, lessons).map((lesson) => ({
    ...lesson,
    isCompleted: completedLessonIds.has(lesson.id)
  }))
}

const buildLessonDetailProgress = (
  lesson: Lesson,
  lessonProgressList: LessonProgress[]
) => {
  const existingLessonProgress = lessonProgressList.find(
    (lessonProgress) => lessonProgress.lessonId === lesson.id && !lessonProgress.deletedAt
  )

  return {
    lastPositionInSeconds: existingLessonProgress?.lastPositionInSeconds || 0,
    watchedMinutes: existingLessonProgress?.watchedMinutes || 0,
    completionRate: existingLessonProgress?.completionRate || 0,
    isCompleted: existingLessonProgress ? isLessonProgressCompleted(existingLessonProgress) : false
  }
}

const buildLessonNavigationHref = (courseSlug: string, moduleSlug: string, lessonSlug: string) =>
  `/curso/${courseSlug}/modulo/${moduleSlug}/aula/${lessonSlug}`

const buildLessonNavigationItem = (
  courseSlug: string,
  lessonReference: { module: CourseModule; lesson: Lesson } | null
) => {
  if (!lessonReference) {
    return null
  }

  return {
    id: lessonReference.lesson.id,
    title: lessonReference.lesson.title,
    slug: lessonReference.lesson.slug,
    href: buildLessonNavigationHref(courseSlug, lessonReference.module.slug, lessonReference.lesson.slug)
  }
}

const buildOrderedCourseLessonReferences = (modules: CourseModule[], lessons: Lesson[]) => {
  const lessonsByModuleId = new Map<string, Lesson[]>()

  for (const lesson of lessons) {
    const existingLessons = lessonsByModuleId.get(lesson.moduleId) || []
    existingLessons.push(lesson)
    lessonsByModuleId.set(lesson.moduleId, existingLessons)
  }

  return modules.flatMap((module) =>
    sortModuleLessons(module, lessonsByModuleId.get(module.id) || []).map((lesson) => ({
      module,
      lesson
    }))
  )
}

const listUsersByIds = async (userIds: string[]) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]

  if (uniqueUserIds.length === 0) {
    return new Map<string, { id: string; fullName: string; avatarUrl: string | null }>()
  }

  const users = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const snapshot = await getFirebaseAdminCollection('users').doc(userId).get()

      if (!snapshot.exists) {
        return null
      }

      const user = snapshot.data() as { fullName?: string; avatarUrl?: string | null }

      return {
        id: userId,
        fullName: user.fullName || 'Usuario',
        avatarUrl: user.avatarUrl ?? null
      }
    })
  )

  return new Map(
    users
      .filter((user): user is { id: string; fullName: string; avatarUrl: string | null } => Boolean(user))
      .map((user) => [user.id, user])
  )
}

const mapLessonCommentItem = (
  comment: LessonComment,
  session: AuthSessionContext,
  usersById: Map<string, { id: string; fullName: string; avatarUrl: string | null }>
): LessonCommentItem => {
  const author = usersById.get(comment.userId)

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited: comment.updatedAt !== comment.createdAt,
    canEdit: comment.userId === session.user.id,
    canDelete: comment.userId === session.user.id,
    author: {
      id: comment.userId,
      fullName: author?.fullName || 'Usuario',
      avatarUrl: author?.avatarUrl ?? null
    }
  }
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

  const coursePayload = buildAdminCoursePayload(input, session.user.id)
  const existingCourse = await getCourseById(coursePayload.slug)

  if (existingCourse) {
    throw createHttpError(409, 'Ja existe um curso com este slug.')
  }

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

export const getAccessibleModuleDetailBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string
) => {
  if (!moduleSlug.trim()) {
    throw createHttpError(400, 'Informe um slug de modulo valido.')
  }

  const courseDetail = await getAccessibleCourseDetailBySlug(session, courseSlug)
  const module = courseDetail.modules.find((courseModule) => courseModule.slug === moduleSlug.trim())

  if (!module) {
    throw createHttpError(404, 'Modulo nao encontrado.')
  }

  const courseLessons = await listCourseLessons(courseDetail.course)
  const courseLessonProgress = await listCourseLessonProgress(session.user.id, courseDetail.course.id)
  const lessons = buildModuleDetailLessons(module, courseLessons, courseLessonProgress)
  const assessments = await listModuleAssessments(module)

  return {
    module,
    lessons,
    assessment: assessments[0] || null,
    progress: getModuleProgress(module, courseLessons, courseLessonProgress)
  }
}

export const getAccessibleLessonDetailBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string
): Promise<LessonDetailData> => {
  if (!lessonSlug.trim()) {
    throw createHttpError(400, 'Informe um slug de aula valido.')
  }

  const courseDetail = await getAccessibleCourseDetailBySlug(session, courseSlug)
  const module = courseDetail.modules.find((courseModule) => courseModule.slug === moduleSlug.trim())

  if (!module) {
    throw createHttpError(404, 'Modulo nao encontrado.')
  }

  const courseLessons = await listCourseLessons(courseDetail.course)
  const courseLessonProgress = await listCourseLessonProgress(session.user.id, courseDetail.course.id)
  const moduleLessons = buildModuleDetailLessons(module, courseLessons, courseLessonProgress)
  const currentLessonIndex = moduleLessons.findIndex((lesson) => lesson.slug === lessonSlug.trim())

  if (currentLessonIndex < 0) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  const lesson = moduleLessons[currentLessonIndex]!
  const orderedCourseLessonReferences = buildOrderedCourseLessonReferences(courseDetail.modules, courseLessons)
  const currentCourseLessonIndex = orderedCourseLessonReferences.findIndex(
    (lessonReference) => lessonReference.module.id === module.id && lessonReference.lesson.id === lesson.id
  )

  if (currentCourseLessonIndex < 0) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  const previousLesson = orderedCourseLessonReferences[currentCourseLessonIndex - 1] || null
  const nextLesson = orderedCourseLessonReferences[currentCourseLessonIndex + 1] || null
  const progress = buildLessonDetailProgress(
    lesson,
    courseLessonProgress.filter((lessonProgress) => lessonProgress.moduleId === module.id)
  )

  return {
    lesson,
    module,
    videoUrl: lesson.mediaUrl,
    progress,
    previousLesson: buildLessonNavigationItem(courseSlug, previousLesson),
    nextLesson: buildLessonNavigationItem(courseSlug, nextLesson)
  }
}

const upsertLessonProgress = async (
  session: AuthSessionContext,
  lesson: Lesson,
  existingLessonProgress: LessonProgress | null,
  payload: {
    lastPositionInSeconds: number
    watchedMinutes: number
    completionRate: number
    markedAsCompleted: boolean
    completedAt: string | null
  }
) => {
  const now = toTimestamp()
  const progressDocumentId = existingLessonProgress?.id || `${session.user.id}_${lesson.id}`

  const progressPayload = {
    userId: session.user.id,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    lessonId: lesson.id,
    lastPositionInSeconds: payload.lastPositionInSeconds,
    watchedMinutes: payload.watchedMinutes,
    completionRate: payload.completionRate,
    markedAsCompleted: payload.markedAsCompleted,
    completedAt: payload.completedAt,
    updatedAt: now,
    updatedBy: session.user.id,
    deletedAt: null,
    deletedBy: null
  }

  await getFirebaseAdminCollection('lessonProgress')
    .doc(progressDocumentId)
    .set(
      existingLessonProgress
        ? progressPayload
        : {
            ...progressPayload,
            createdAt: now,
            createdBy: session.user.id
          },
      { merge: true }
    )

  return {
    id: progressDocumentId,
    ...progressPayload,
    createdAt: existingLessonProgress?.createdAt || now,
    createdBy: existingLessonProgress?.createdBy || session.user.id
  } as LessonProgress
}

export const updateLessonProgressBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
  input: {
    lastPositionInSeconds?: number
    markAsCompleted?: boolean
    hasCompletionOverride?: boolean
  }
): Promise<LessonProgressUpdateData> => {
  const lessonDetail = await getAccessibleLessonDetailBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  const lesson = lessonDetail.lesson
  const existingLessonProgress = (
    await listCourseLessonProgress(session.user.id, lesson.courseId)
  ).find((lessonProgress) => lessonProgress.lessonId === lesson.id && !lessonProgress.deletedAt) || null

  const lessonDurationInSeconds = Math.max(lesson.durationInMinutes * 60, 1)
  const normalizedPosition = Math.max(0, Math.min(Math.floor(input.lastPositionInSeconds || 0), lessonDurationInSeconds))
  const nextWatchedMinutes = Math.max(existingLessonProgress?.watchedMinutes || 0, Math.ceil(normalizedPosition / 60))
  const derivedCompletionRate = Math.min(
    100,
    Math.max(existingLessonProgress?.completionRate || 0, Math.round((normalizedPosition / lessonDurationInSeconds) * 100))
  )
  const hasCompletionOverride = Boolean(input.hasCompletionOverride)
  const shouldMarkAsCompleted = hasCompletionOverride
    ? Boolean(input.markAsCompleted)
    : Boolean(existingLessonProgress && isLessonProgressCompleted(existingLessonProgress)) || derivedCompletionRate >= 100
  const nextCompletionRate = hasCompletionOverride
    ? shouldMarkAsCompleted
      ? 100
      : Math.min(99, derivedCompletionRate)
    : shouldMarkAsCompleted
      ? 100
      : derivedCompletionRate

  const savedLessonProgress = await upsertLessonProgress(session, lesson, existingLessonProgress, {
    lastPositionInSeconds: normalizedPosition,
    watchedMinutes: nextWatchedMinutes,
    completionRate: nextCompletionRate,
    markedAsCompleted: shouldMarkAsCompleted,
    completedAt: shouldMarkAsCompleted ? existingLessonProgress?.completedAt || toTimestamp() : null
  })

  return {
    lessonId: lesson.id,
    lastPositionInSeconds: savedLessonProgress.lastPositionInSeconds,
    watchedMinutes: savedLessonProgress.watchedMinutes,
    completionRate: savedLessonProgress.completionRate,
    isCompleted: isLessonProgressCompleted(savedLessonProgress)
  }
}

export const listLessonCommentsBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string
) => {
  const lessonDetail = await getAccessibleLessonDetailBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  const commentsSnapshot = await getFirebaseAdminCollection('lessonComments').where('lessonId', '==', lessonDetail.lesson.id).get()
  const comments = commentsSnapshot.docs
    .map(toLessonCommentDocument)
    .filter((comment) => !comment.deletedAt)
    .sort((left, right) => toTimestampNumber(left.createdAt) - toTimestampNumber(right.createdAt))
  const usersById = await listUsersByIds(comments.map((comment) => comment.userId))

  return comments.map((comment) => mapLessonCommentItem(comment, session, usersById))
}

export const createLessonCommentBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
  content: string
) => {
  const normalizedContent = content.trim()

  if (!normalizedContent) {
    throw createHttpError(400, 'Informe um comentario valido.')
  }

  const lessonDetail = await getAccessibleLessonDetailBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  const now = toTimestamp()
  const commentCollection = getFirebaseAdminCollection('lessonComments')
  const commentDocument = commentCollection.doc()

  const commentPayload: LessonComment = {
    id: commentDocument.id,
    userId: session.user.id,
    courseId: lessonDetail.lesson.courseId,
    moduleId: lessonDetail.lesson.moduleId,
    lessonId: lessonDetail.lesson.id,
    content: normalizedContent,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: session.user.id,
    updatedBy: session.user.id,
    deletedBy: null
  }

  await commentDocument.set({
    userId: commentPayload.userId,
    courseId: commentPayload.courseId,
    moduleId: commentPayload.moduleId,
    lessonId: commentPayload.lessonId,
    content: commentPayload.content,
    createdAt: commentPayload.createdAt,
    updatedAt: commentPayload.updatedAt,
    deletedAt: commentPayload.deletedAt,
    createdBy: commentPayload.createdBy,
    updatedBy: commentPayload.updatedBy,
    deletedBy: commentPayload.deletedBy
  })

  const usersById = await listUsersByIds([session.user.id])

  return mapLessonCommentItem(commentPayload, session, usersById)
}

export const updateLessonCommentBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
  commentId: string,
  content: string
) => {
  const normalizedContent = content.trim()

  if (!normalizedContent) {
    throw createHttpError(400, 'Informe um comentario valido.')
  }

  const lessonDetail = await getAccessibleLessonDetailBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  const commentSnapshot = await getFirebaseAdminCollection('lessonComments').doc(commentId).get()

  if (!commentSnapshot.exists) {
    throw createHttpError(404, 'Comentario nao encontrado.')
  }

  const existingComment = toLessonCommentDocument(commentSnapshot)

  if (existingComment.deletedAt || existingComment.lessonId !== lessonDetail.lesson.id) {
    throw createHttpError(404, 'Comentario nao encontrado.')
  }

  if (existingComment.userId !== session.user.id) {
    throw createHttpError(403, 'Voce nao pode editar este comentario.')
  }

  const now = toTimestamp()

  await getFirebaseAdminCollection('lessonComments').doc(commentId).set(
    {
      content: normalizedContent,
      updatedAt: now,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  const usersById = await listUsersByIds([session.user.id])

  return mapLessonCommentItem(
    {
      ...existingComment,
      content: normalizedContent,
      updatedAt: now,
      updatedBy: session.user.id
    },
    session,
    usersById
  )
}

export const deleteLessonCommentBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
  commentId: string
) => {
  const lessonDetail = await getAccessibleLessonDetailBySlugs(session, courseSlug, moduleSlug, lessonSlug)
  const commentSnapshot = await getFirebaseAdminCollection('lessonComments').doc(commentId).get()

  if (!commentSnapshot.exists) {
    throw createHttpError(404, 'Comentario nao encontrado.')
  }

  const existingComment = toLessonCommentDocument(commentSnapshot)

  if (existingComment.deletedAt || existingComment.lessonId !== lessonDetail.lesson.id) {
    throw createHttpError(404, 'Comentario nao encontrado.')
  }

  if (existingComment.userId !== session.user.id) {
    throw createHttpError(403, 'Voce nao pode excluir este comentario.')
  }

  const now = toTimestamp()

  await getFirebaseAdminCollection('lessonComments').doc(commentId).set(
    {
      deletedAt: now,
      deletedBy: session.user.id,
      updatedAt: now,
      updatedBy: session.user.id
    },
    { merge: true }
  )
}

export const markLessonAsCompletedBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string
) => {
  if (!lessonSlug.trim()) {
    throw createHttpError(400, 'Informe um slug de aula valido.')
  }

  const moduleDetail = await getAccessibleModuleDetailBySlugs(session, courseSlug, moduleSlug)
  const lesson = moduleDetail.lessons.find((moduleLesson) => moduleLesson.slug === lessonSlug.trim())

  if (!lesson) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  if (lesson.isCompleted) {
    return {
      lessonId: lesson.id,
      isCompleted: true as const
    }
  }

  const existingLessonProgress = (
    await listCourseLessonProgress(session.user.id, moduleDetail.module.courseId)
  ).find(
    (lessonProgress) =>
      lessonProgress.moduleId === moduleDetail.module.id && lessonProgress.lessonId === lesson.id && !lessonProgress.deletedAt
  ) || null

  await upsertLessonProgress(session, lesson, existingLessonProgress, {
    watchedMinutes: Math.max(existingLessonProgress?.watchedMinutes || 0, lesson.durationInMinutes),
    completionRate: 100,
    lastPositionInSeconds: Math.max(existingLessonProgress?.lastPositionInSeconds || 0, lesson.durationInMinutes * 60),
    markedAsCompleted: true,
    completedAt: existingLessonProgress?.completedAt || toTimestamp()
  })

  return {
    lessonId: lesson.id,
    isCompleted: true as const
  }
}
