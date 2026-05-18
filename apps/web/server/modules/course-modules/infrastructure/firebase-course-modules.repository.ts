import type {
  AdminModuleInput,
  Assessment,
  AuthSessionContext,
  Course,
  CourseEnrollment,
  CourseModule,
  Lesson,
  LessonProgress,
  ModuleDetailLesson
} from '@ieb/shared'
import { createError } from 'h3'
import { writeAdminLog } from '../../auth/interfaces/http/session'
import { isLessonProgressCompleted } from '../../shared/domain/lesson-progress'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'
import { buildAdminModulePayload } from '../domain/factory'
import { clampModuleOrder } from '../domain/ordering'
import { createFourDigitSlugHash, normalizeCourseSlug } from '../domain/validation'

const toCourseDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Course, 'id'>),
    id: snapshot.id
  }) as Course

const toModuleDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<CourseModule, 'id'>),
    id: snapshot.id
  }) as CourseModule

const toLessonDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Lesson, 'id'>),
    id: snapshot.id
  }) as Lesson

const toLessonProgressDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<LessonProgress, 'id'>),
    id: snapshot.id
  }) as LessonProgress

const toAssessmentDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Assessment, 'id'>),
    id: snapshot.id
  }) as Assessment

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const toTimestamp = () => new Date().toISOString()

const isActiveEnrollment = (enrollment: CourseEnrollment) =>
  !enrollment.deletedAt && (enrollment.status === 'active' || enrollment.status === 'completed')

const isVisibleStudentCourse = (course: Course) => !course.deletedAt && course.visibility === 'published'

const isAccessibleAdminCourse = (course: Course) => !course.deletedAt

const listAdminModules = async () => {
  const snapshot = await getFirebaseAdminCollection('modules').get()

  return snapshot.docs
    .map(toModuleDocument)
    .filter((module) => !module.deletedAt)
    .sort((left, right) => {
      if (left.courseId !== right.courseId) {
        return left.courseId.localeCompare(right.courseId, 'pt-BR')
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
  const normalizedSlug = normalizeCourseSlug(courseSlug)
  const collection = getFirebaseAdminCollection('courses')
  const snapshot =
    typeof collection.where === 'function' ? await collection.where('slug', '==', normalizedSlug).get() : null
  const slugDocuments =
    snapshot && snapshot.docs.length > 0
      ? snapshot.docs
      : typeof collection.get === 'function'
        ? (await collection.get()).docs.filter((document) => toCourseDocument(document).slug === normalizedSlug)
        : []
  const courseSnapshot = slugDocuments.find((document) => {
    const course = toCourseDocument(document)

    return !course.deletedAt
  })

  return courseSnapshot ? toCourseDocument(courseSnapshot) : null
}

const getModuleById = async (moduleId: string) => {
  const snapshot = await getFirebaseAdminCollection('modules').doc(moduleId).get()

  if (!snapshot.exists) {
    return null
  }

  return toModuleDocument(snapshot)
}

const getModuleBySlug = async (moduleSlug: string) => {
  const normalizedSlug = normalizeCourseSlug(moduleSlug)
  const collection = getFirebaseAdminCollection('modules')
  const snapshot =
    typeof collection.where === 'function' ? await collection.where('slug', '==', normalizedSlug).get() : null
  const slugDocuments =
    snapshot && snapshot.docs.length > 0
      ? snapshot.docs
      : typeof collection.get === 'function'
        ? (await collection.get()).docs.filter((document) => toModuleDocument(document).slug === normalizedSlug)
        : []
  const legacyModuleSnapshot = slugDocuments.find((document) => {
    const module = toModuleDocument(document)

    return !module.deletedAt
  })

  return legacyModuleSnapshot ? toModuleDocument(legacyModuleSnapshot) : null
}

const resolveUniqueAdminModuleSlug = async (input: AdminModuleInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug) {
    throw createHttpError(400, 'Informe um slug de modulo valido.')
  }

  const existingBaseModule = await getModuleBySlug(baseSlug)

  if (!existingBaseModule) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`
    const existingModule = await getModuleBySlug(nextSlug)

    if (!existingModule) {
      return nextSlug
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um slug unico para o modulo.')
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

const syncCourseModulesOrder = async (
  session: AuthSessionContext,
  course: Course,
  modules: CourseModule[]
) => {
  const now = toTimestamp()
  const orderedModules = [...modules].map((module, index) => ({
    ...module,
    order: index + 1,
    updatedAt: now,
    updatedBy: session.user.id
  }))

  await Promise.all(
    orderedModules.map((module) =>
      getFirebaseAdminCollection('modules').doc(module.id).set(
        {
          order: module.order,
          updatedAt: module.updatedAt,
          updatedBy: module.updatedBy
        },
        { merge: true }
      )
    )
  )

  await getFirebaseAdminCollection('courses').doc(course.id).set(
    {
      moduleIds: orderedModules.map((module) => module.id),
      updatedAt: now,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  return orderedModules
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

const getAccessibleCourseModules = async (session: AuthSessionContext, courseSlug: string) => {
  if (!courseSlug.trim()) {
    throw createHttpError(400, 'Informe um slug de curso valido.')
  }

  const course = await getCourseBySlug(courseSlug)

  if (!course) {
    throw createHttpError(404, 'Curso nao encontrado.')
  }

  if (session.user.role === 'admin') {
    if (!isAccessibleAdminCourse(course)) {
      throw createHttpError(404, 'Curso nao encontrado.')
    }

    return {
      course,
      modules: await listCourseModules(course)
    }
  }

  const enrollment = await getActiveEnrollmentForCourse(session.user.id, course.id)

  if (!enrollment || !isVisibleStudentCourse(course)) {
    throw createHttpError(403, 'Voce nao tem acesso a este curso.')
  }

  return {
    course,
    modules: await listCourseModules(course)
  }
}

export const listAdminModulesForManagement = async (session: AuthSessionContext) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await listAdminModules()
}

export const getAdminModuleBySlug = async (session: AuthSessionContext, moduleSlug: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedSlug = normalizeCourseSlug(moduleSlug)

  if (!normalizedSlug) {
    throw createHttpError(400, 'Informe um slug de modulo valido.')
  }

  const module = await getModuleBySlug(normalizedSlug)

  if (!module || module.deletedAt) {
    throw createHttpError(404, 'Modulo nao encontrado.')
  }

  return module
}

export const createAdminModule = async (session: AuthSessionContext, input: AdminModuleInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const requestedCourseId = input.courseId.trim()

  if (!requestedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para o modulo.')
  }

  const course = await getCourseById(requestedCourseId)

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso nao encontrado para vincular o modulo.')
  }

  const existingModules = await listCourseModules(course)
  const resolvedSlug = await resolveUniqueAdminModuleSlug(input)
  const modulePayload = buildAdminModulePayload(input, session.user.id, {
    courseId: course.id,
    resolvedSlug
  })
  const nextOrder = clampModuleOrder(modulePayload.order, existingModules.length + 1)
  const orderedModules = [...existingModules]
  orderedModules.splice(nextOrder - 1, 0, {
    ...modulePayload,
    order: nextOrder
  })

  await getFirebaseAdminCollection('modules').doc(modulePayload.id).set(modulePayload)
  const syncedModules = await syncCourseModulesOrder(session, course, orderedModules)
  const createdModule = syncedModules.find((module) => module.id === modulePayload.id) || modulePayload

  await writeAdminLog(session, {
    action: 'create',
    targetCollection: 'modules',
    targetId: createdModule.id,
    summary: `Modulo ${createdModule.title} criado no painel administrativo.`,
    metadata: {
      slug: createdModule.slug,
      courseId: createdModule.courseId,
      order: createdModule.order
    }
  })

  return createdModule
}

export const updateAdminModuleBySlug = async (session: AuthSessionContext, moduleSlug: string, input: AdminModuleInput) => {
  const existingModule = await getAdminModuleBySlug(session, moduleSlug)
  const course = await getCourseById(existingModule.courseId)

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso do modulo nao encontrado.')
  }

  const courseModules = await listCourseModules(course)
  const remainingModules = courseModules.filter((module) => module.id !== existingModule.id)
  const modulePayload = buildAdminModulePayload(input, session.user.id, {
    courseId: course.id,
    existingModule
  })
  const nextOrder = clampModuleOrder(modulePayload.order, remainingModules.length + 1)
  const orderedModules = [...remainingModules]
  orderedModules.splice(nextOrder - 1, 0, {
    ...modulePayload,
    order: nextOrder
  })

  await getFirebaseAdminCollection('modules').doc(existingModule.id).set(modulePayload, { merge: true })
  const syncedModules = await syncCourseModulesOrder(session, course, orderedModules)
  const updatedModule = syncedModules.find((module) => module.id === existingModule.id) || modulePayload

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'modules',
    targetId: updatedModule.id,
    summary: `Modulo ${updatedModule.title} atualizado no painel administrativo.`,
    metadata: {
      slug: updatedModule.slug,
      courseId: updatedModule.courseId,
      order: updatedModule.order
    }
  })

  return updatedModule
}

export const deleteAdminModuleBySlug = async (session: AuthSessionContext, moduleSlug: string) => {
  const existingModule = await getAdminModuleBySlug(session, moduleSlug)
  const course = await getCourseById(existingModule.courseId)

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso do modulo nao encontrado.')
  }

  const now = toTimestamp()
  const deletedModule = {
    ...existingModule,
    updatedAt: now,
    deletedAt: now,
    updatedBy: session.user.id,
    deletedBy: session.user.id
  }

  await getFirebaseAdminCollection('modules').doc(existingModule.id).set(
    {
      updatedAt: deletedModule.updatedAt,
      deletedAt: deletedModule.deletedAt,
      updatedBy: deletedModule.updatedBy,
      deletedBy: deletedModule.deletedBy
    },
    { merge: true }
  )

  const remainingModules = (await listCourseModules(course)).filter((module) => module.id !== existingModule.id)
  await syncCourseModulesOrder(session, course, remainingModules)

  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'modules',
    targetId: existingModule.id,
    summary: `Modulo ${existingModule.title} removido no painel administrativo.`,
    metadata: {
      slug: existingModule.slug,
      courseId: existingModule.courseId
    }
  })

  return deletedModule
}

export const getAccessibleModuleDetailBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string
) => {
  if (!moduleSlug.trim()) {
    throw createHttpError(400, 'Informe um slug de modulo valido.')
  }

  const courseDetail = await getAccessibleCourseModules(session, courseSlug)
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
