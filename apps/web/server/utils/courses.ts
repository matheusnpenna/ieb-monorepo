import type {
  Assessment,
  AuthSessionContext,
  Course,
  CourseEnrollment,
  CourseModule,
  Lesson,
  LessonComment,
  LessonProgress,
  LessonDetailData,
  LessonCommentItem,
  LessonProgressUpdateData,
  ModuleDetailLesson
} from '@ieb/shared'
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

const buildLessonNavigationItem = (courseSlug: string, moduleSlug: string, lesson: Lesson | null) => {
  if (!lesson) {
    return null
  }

  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    href: buildLessonNavigationHref(courseSlug, moduleSlug, lesson.slug)
  }
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

  const moduleDetail = await getAccessibleModuleDetailBySlugs(session, courseSlug, moduleSlug)
  const currentLessonIndex = moduleDetail.lessons.findIndex((lesson) => lesson.slug === lessonSlug.trim())

  if (currentLessonIndex < 0) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  const lesson = moduleDetail.lessons[currentLessonIndex]!
  const previousLesson = moduleDetail.lessons[currentLessonIndex - 1] || null
  const nextLesson = moduleDetail.lessons[currentLessonIndex + 1] || null
  const progress = buildLessonDetailProgress(lesson, (
    await listCourseLessonProgress(session.user.id, moduleDetail.module.courseId)
  ).filter((lessonProgress) => lessonProgress.moduleId === moduleDetail.module.id))

  return {
    lesson,
    module: moduleDetail.module,
    videoUrl: lesson.mediaUrl,
    progress,
    previousLesson: buildLessonNavigationItem(courseSlug, moduleSlug, previousLesson),
    nextLesson: buildLessonNavigationItem(courseSlug, moduleSlug, nextLesson)
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
  const shouldMarkAsCompleted = Boolean(input.markAsCompleted) || derivedCompletionRate >= 100
  const savedLessonProgress = await upsertLessonProgress(session, lesson, existingLessonProgress, {
    lastPositionInSeconds: normalizedPosition,
    watchedMinutes: nextWatchedMinutes,
    completionRate: shouldMarkAsCompleted ? 100 : derivedCompletionRate,
    markedAsCompleted: shouldMarkAsCompleted,
    completedAt: shouldMarkAsCompleted ? existingLessonProgress?.completedAt || toTimestamp() : existingLessonProgress?.completedAt || null
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
