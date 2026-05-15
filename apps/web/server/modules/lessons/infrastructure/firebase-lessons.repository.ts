import type {
  AdminLessonInput,
  AuthSessionContext,
  Course,
  CourseModule,
  Lesson,
  LessonComment,
  LessonCommentItem,
  LessonDetailData,
  LessonProgress,
  LessonProgressUpdateData
} from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from '../../auth/interfaces/http/session'
import { getCourseModulesModule } from '../../course-modules/course-modules.module'
import {
  buildLessonDetailProgress,
  buildLessonProgressUpdatePayload,
  buildManualLessonCompletionPayload,
  isLessonProgressCompleted
} from '../../shared/domain/lesson-progress'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'
import { buildAdminLessonPayload } from '../domain/factory'
import { clampLessonOrder } from '../domain/ordering'
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

const toTimestamp = () => new Date().toISOString()

const toTimestampNumber = (timestamp: string | null | undefined) => {
  if (!timestamp) {
    return 0
  }

  const parsedTimestamp = Date.parse(timestamp)

  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp
}

const listAdminLessons = async () => {
  const snapshot = await getFirebaseAdminCollection('lessons').get()

  return snapshot.docs
    .map(toLessonDocument)
    .filter((lesson) => !lesson.deletedAt)
    .sort((left, right) => {
      if (left.courseId !== right.courseId) {
        return left.courseId.localeCompare(right.courseId, 'pt-BR')
      }

      if (left.moduleId !== right.moduleId) {
        return left.moduleId.localeCompare(right.moduleId, 'pt-BR')
      }

      if (left.order !== right.order) {
        return left.order - right.order
      }

      return left.title.localeCompare(right.title, 'pt-BR')
    })
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

const getModuleById = async (moduleId: string) => {
  const snapshot = await getFirebaseAdminCollection('modules').doc(moduleId).get()

  if (!snapshot.exists) {
    return null
  }

  return toModuleDocument(snapshot)
}

const getModuleBySlug = async (moduleSlug: string) => {
  const moduleById = await getModuleById(moduleSlug)

  if (moduleById) {
    return moduleById
  }

  const snapshot = await getFirebaseAdminCollection('modules').where('slug', '==', moduleSlug).get()
  const legacyModuleSnapshot = snapshot.docs.find((document) => {
    const module = toModuleDocument(document)

    return !module.deletedAt
  })

  return legacyModuleSnapshot ? toModuleDocument(legacyModuleSnapshot) : null
}

const getLessonById = async (lessonId: string) => {
  const snapshot = await getFirebaseAdminCollection('lessons').doc(lessonId).get()

  if (!snapshot.exists) {
    return null
  }

  return toLessonDocument(snapshot)
}

const getLessonBySlug = async (lessonSlug: string) => {
  const lessonById = await getLessonById(lessonSlug)

  if (lessonById) {
    return lessonById
  }

  const snapshot = await getFirebaseAdminCollection('lessons').where('slug', '==', lessonSlug).get()
  const legacyLessonSnapshot = snapshot.docs.find((document) => {
    const lesson = toLessonDocument(document)

    return !lesson.deletedAt
  })

  return legacyLessonSnapshot ? toLessonDocument(legacyLessonSnapshot) : null
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

const listModuleLessons = (module: CourseModule, lessons: Lesson[]) =>
  sortModuleLessons(
    module,
    lessons.filter((lesson) => lesson.moduleId === module.id)
  )

const listCourseLessonProgress = async (userId: string, courseId: string) => {
  const lessonProgressSnapshot = await getFirebaseAdminCollection('lessonProgress').where('userId', '==', userId).get()

  return lessonProgressSnapshot.docs
    .map(toLessonProgressDocument)
    .filter((lessonProgress) => lessonProgress.courseId === courseId)
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

const syncModuleLessonsOrder = async (session: AuthSessionContext, module: CourseModule, lessons: Lesson[]) => {
  const now = toTimestamp()
  const orderedLessons = [...lessons].map((lesson, index) => ({
    ...lesson,
    order: index + 1,
    updatedAt: now,
    updatedBy: session.user.id
  }))

  await Promise.all(
    orderedLessons.map((lesson) =>
      getFirebaseAdminCollection('lessons').doc(lesson.id).set(
        {
          order: lesson.order,
          updatedAt: lesson.updatedAt,
          updatedBy: lesson.updatedBy
        },
        { merge: true }
      )
    )
  )

  await getFirebaseAdminCollection('modules').doc(module.id).set(
    {
      lessonIds: orderedLessons.map((lesson) => lesson.id),
      updatedAt: now,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  return orderedLessons
}

const resolveUniqueAdminLessonSlug = async (input: AdminLessonInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug) {
    throw createHttpError(400, 'Informe um slug de aula valido.')
  }

  const existingBaseLesson = await getLessonById(baseSlug)

  if (!existingBaseLesson) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`
    const existingLesson = await getLessonById(nextSlug)

    if (!existingLesson) {
      return nextSlug
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um slug unico para a aula.')
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

export const listAdminLessonsForManagement = async (
  session: AuthSessionContext,
  filters?: {
    courseId?: string
    moduleId?: string
  }
) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const lessons = await listAdminLessons()
  const requestedCourseId = typeof filters?.courseId === 'string' ? filters.courseId.trim() : ''
  const requestedModuleId = typeof filters?.moduleId === 'string' ? filters.moduleId.trim() : ''
  const normalizedCourseSlug = requestedCourseId ? normalizeCourseSlug(requestedCourseId) : ''
  const normalizedModuleSlug = requestedModuleId ? normalizeCourseSlug(requestedModuleId) : ''
  const [resolvedCourse, resolvedModule] = await Promise.all([
    requestedCourseId
      ? (async () => {
          const courseById = await getCourseById(requestedCourseId)

          if (courseById) {
            return courseById
          }

          return normalizedCourseSlug ? await getCourseBySlug(normalizedCourseSlug) : null
        })()
      : Promise.resolve(null),
    requestedModuleId
      ? (async () => {
          const moduleById = await getModuleById(requestedModuleId)

          if (moduleById) {
            return moduleById
          }

          return normalizedModuleSlug ? await getModuleBySlug(normalizedModuleSlug) : null
        })()
      : Promise.resolve(null)
  ])
  const acceptedCourseIds = new Set(
    [requestedCourseId, normalizedCourseSlug, resolvedCourse?.id || '', resolvedCourse?.slug || ''].filter(Boolean)
  )
  const acceptedModuleIds = new Set(
    [requestedModuleId, normalizedModuleSlug, resolvedModule?.id || '', resolvedModule?.slug || ''].filter(Boolean)
  )

  return lessons.filter((lesson) => {
    if (acceptedCourseIds.size > 0 && !acceptedCourseIds.has(lesson.courseId)) {
      return false
    }

    if (acceptedModuleIds.size > 0 && !acceptedModuleIds.has(lesson.moduleId)) {
      return false
    }

    return true
  })
}

export const getAdminLessonBySlug = async (session: AuthSessionContext, lessonSlug: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedSlug = normalizeCourseSlug(lessonSlug)

  if (!normalizedSlug) {
    throw createHttpError(400, 'Informe um slug de aula valido.')
  }

  const lesson = await getLessonBySlug(normalizedSlug)

  if (!lesson || lesson.deletedAt) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  return lesson
}

export const createAdminLesson = async (session: AuthSessionContext, input: AdminLessonInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedModuleId = normalizeCourseSlug(input.moduleId)

  if (!normalizedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para a aula.')
  }

  if (!normalizedModuleId) {
    throw createHttpError(400, 'Selecione um modulo valido para a aula.')
  }

  const [course, module] = await Promise.all([getCourseById(normalizedCourseId), getModuleById(normalizedModuleId)])

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso nao encontrado para vincular a aula.')
  }

  if (!module || module.deletedAt || module.courseId !== course.id) {
    throw createHttpError(404, 'Modulo nao encontrado para vincular a aula.')
  }

  const courseLessons = await listCourseLessons(course)
  const existingLessons = listModuleLessons(module, courseLessons)
  const resolvedSlug = await resolveUniqueAdminLessonSlug(input)
  const lessonPayload = buildAdminLessonPayload(input, session.user.id, {
    courseId: course.id,
    moduleId: module.id,
    resolvedSlug
  })
  const nextOrder = clampLessonOrder(lessonPayload.order, existingLessons.length + 1)
  const orderedLessons = [...existingLessons]
  orderedLessons.splice(nextOrder - 1, 0, {
    ...lessonPayload,
    order: nextOrder
  })

  await getFirebaseAdminCollection('lessons').doc(lessonPayload.id).set(lessonPayload)
  const syncedLessons = await syncModuleLessonsOrder(session, module, orderedLessons)
  const createdLesson = syncedLessons.find((lesson) => lesson.id === lessonPayload.id) || lessonPayload

  await writeAdminLog(session, {
    action: 'create',
    targetCollection: 'lessons',
    targetId: createdLesson.id,
    summary: `Aula ${createdLesson.title} criada no painel administrativo.`,
    metadata: {
      slug: createdLesson.slug,
      courseId: createdLesson.courseId,
      moduleId: createdLesson.moduleId,
      order: createdLesson.order
    }
  })

  return createdLesson
}

export const updateAdminLessonBySlug = async (session: AuthSessionContext, lessonSlug: string, input: AdminLessonInput) => {
  const existingLesson = await getAdminLessonBySlug(session, lessonSlug)
  const [course, module] = await Promise.all([
    getCourseById(existingLesson.courseId),
    getModuleById(existingLesson.moduleId)
  ])

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso da aula nao encontrado.')
  }

  if (!module || module.deletedAt || module.courseId !== course.id) {
    throw createHttpError(404, 'Modulo da aula nao encontrado.')
  }

  const courseLessons = await listCourseLessons(course)
  const moduleLessons = listModuleLessons(module, courseLessons)
  const remainingLessons = moduleLessons.filter((lesson) => lesson.id !== existingLesson.id)
  const lessonPayload = buildAdminLessonPayload(input, session.user.id, {
    courseId: course.id,
    moduleId: module.id,
    existingLesson
  })
  const nextOrder = clampLessonOrder(lessonPayload.order, remainingLessons.length + 1)
  const orderedLessons = [...remainingLessons]
  orderedLessons.splice(nextOrder - 1, 0, {
    ...lessonPayload,
    order: nextOrder
  })

  await getFirebaseAdminCollection('lessons').doc(existingLesson.id).set(lessonPayload, { merge: true })
  const syncedLessons = await syncModuleLessonsOrder(session, module, orderedLessons)
  const updatedLesson = syncedLessons.find((lesson) => lesson.id === existingLesson.id) || lessonPayload

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'lessons',
    targetId: updatedLesson.id,
    summary: `Aula ${updatedLesson.title} atualizada no painel administrativo.`,
    metadata: {
      slug: updatedLesson.slug,
      courseId: updatedLesson.courseId,
      moduleId: updatedLesson.moduleId,
      order: updatedLesson.order
    }
  })

  return updatedLesson
}

export const deleteAdminLessonBySlug = async (session: AuthSessionContext, lessonSlug: string) => {
  const existingLesson = await getAdminLessonBySlug(session, lessonSlug)
  const module = await getModuleById(existingLesson.moduleId)

  if (!module || module.deletedAt) {
    throw createHttpError(404, 'Modulo da aula nao encontrado.')
  }

  const now = toTimestamp()
  const deletedLesson = {
    ...existingLesson,
    updatedAt: now,
    deletedAt: now,
    updatedBy: session.user.id,
    deletedBy: session.user.id
  }

  await getFirebaseAdminCollection('lessons').doc(existingLesson.id).set(
    {
      updatedAt: deletedLesson.updatedAt,
      deletedAt: deletedLesson.deletedAt,
      updatedBy: deletedLesson.updatedBy,
      deletedBy: deletedLesson.deletedBy
    },
    { merge: true }
  )

  const course = await getCourseById(existingLesson.courseId)

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso da aula nao encontrado.')
  }

  const remainingLessons = listModuleLessons(module, await listCourseLessons(course)).filter(
    (lesson) => lesson.id !== existingLesson.id
  )
  await syncModuleLessonsOrder(session, module, remainingLessons)

  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'lessons',
    targetId: existingLesson.id,
    summary: `Aula ${existingLesson.title} removida no painel administrativo.`,
    metadata: {
      slug: existingLesson.slug,
      courseId: existingLesson.courseId,
      moduleId: existingLesson.moduleId
    }
  })

  return deletedLesson
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

  const moduleDetail = await getCourseModulesModule().service.getAccessibleModuleDetailBySlugs(
    session,
    courseSlug,
    moduleSlug
  )
  const course = await getCourseById(moduleDetail.module.courseId)

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso nao encontrado.')
  }

  const [courseModules, courseLessons, courseLessonProgress] = await Promise.all([
    listCourseModules(course),
    listCourseLessons(course),
    listCourseLessonProgress(session.user.id, course.id)
  ])
  const moduleLessons = sortModuleLessons(
    moduleDetail.module,
    courseLessons.filter((lesson) => lesson.moduleId === moduleDetail.module.id)
  )
  const currentLessonIndex = moduleLessons.findIndex((lesson) => lesson.slug === lessonSlug.trim())

  if (currentLessonIndex < 0) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  const lesson = moduleLessons[currentLessonIndex]!
  const orderedCourseLessonReferences = buildOrderedCourseLessonReferences(courseModules, courseLessons)
  const currentCourseLessonIndex = orderedCourseLessonReferences.findIndex(
    (lessonReference) => lessonReference.module.id === moduleDetail.module.id && lessonReference.lesson.id === lesson.id
  )

  if (currentCourseLessonIndex < 0) {
    throw createHttpError(404, 'Aula nao encontrada.')
  }

  const previousLesson = orderedCourseLessonReferences[currentCourseLessonIndex - 1] || null
  const nextLesson = orderedCourseLessonReferences[currentCourseLessonIndex + 1] || null
  const progress = buildLessonDetailProgress(
    lesson,
    courseLessonProgress.filter((lessonProgress) => lessonProgress.moduleId === moduleDetail.module.id)
  )

  return {
    lesson,
    module: moduleDetail.module,
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

  const progressPayload = buildLessonProgressUpdatePayload(lesson, existingLessonProgress, input, toTimestamp)
  const savedLessonProgress = await upsertLessonProgress(session, lesson, existingLessonProgress, progressPayload)

  return {
    lessonId: lesson.id,
    lastPositionInSeconds: savedLessonProgress.lastPositionInSeconds,
    watchedMinutes: savedLessonProgress.watchedMinutes,
    completionRate: savedLessonProgress.completionRate,
    isCompleted: isLessonProgressCompleted(savedLessonProgress)
  }
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

  const moduleDetail = await getCourseModulesModule().service.getAccessibleModuleDetailBySlugs(
    session,
    courseSlug,
    moduleSlug
  )
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

  await upsertLessonProgress(
    session,
    lesson,
    existingLessonProgress,
    buildManualLessonCompletionPayload(lesson, existingLessonProgress, toTimestamp)
  )

  return {
    lessonId: lesson.id,
    isCompleted: true as const
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
