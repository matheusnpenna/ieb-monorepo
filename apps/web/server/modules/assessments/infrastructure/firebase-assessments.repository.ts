import type {
  AccountAssessmentAttemptItem,
  AdminAssessmentAttemptViewItem,
  AdminAssessmentInput,
  Assessment,
  AssessmentAttempt,
  AuthSessionContext,
  Course,
  CourseModule,
  StudentAssessmentSubmissionData,
  StudentModuleAssessmentData,
  User
} from '@ieb/shared'
import { createError } from 'h3'
import { randomUUID } from 'node:crypto'
import { getAssessmentSettingsModule } from '../../assessment-settings/assessment-settings.module'
import { writeAdminLog } from '../../auth/interfaces/http/session'
import { getCourseModulesModule } from '../../course-modules/course-modules.module'
import { getFirebaseAdminCollection } from '../../shared/infrastructure/firebase-admin'
import {
  buildManualAssessmentAttemptGrade,
  gradeAssessmentAttempt,
  normalizeAssessmentAnswers
} from '../domain/attempts'
import { buildAdminAssessmentPayload } from '../domain/factory'
import { clampAssessmentOrder } from '../domain/ordering'
import { buildStudentModuleAssessmentData } from '../domain/student-assessments'
import { createFourDigitSlugHash, normalizeCourseSlug } from '../domain/validation'

const getAssessmentPlatformSettings = async () =>
  await getAssessmentSettingsModule().service.getAssessmentPlatformSettings()

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

const toAssessmentDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<Assessment, 'id'>),
    id: snapshot.id
  }) as Assessment

const toAssessmentAttemptDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<AssessmentAttempt, 'id'>),
    id: snapshot.id
  }) as AssessmentAttempt

const toUserDocument = (snapshot: { id: string; data: () => unknown }) =>
  ({
    ...(snapshot.data() as Omit<User, 'id'>),
    id: snapshot.id
  }) as User

const listAdminCourses = async () => {
  const snapshot = await getFirebaseAdminCollection('courses').get()

  return snapshot.docs
    .map(toCourseDocument)
    .filter((course) => !course.deletedAt)
    .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'))
}

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

const listAdminAssessments = async () => {
  const snapshot = await getFirebaseAdminCollection('assessments').get()

  return snapshot.docs
    .map(toAssessmentDocument)
    .filter((assessment) => !assessment.deletedAt)
    .sort((left, right) => {
      if (left.courseId !== right.courseId) {
        return left.courseId.localeCompare(right.courseId, 'pt-BR')
      }

      if (left.moduleId !== right.moduleId) {
        return left.moduleId.localeCompare(right.moduleId, 'pt-BR')
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
  const legacyCourseSnapshot = slugDocuments.find((document) => {
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

const getAssessmentById = async (assessmentId: string) => {
  const snapshot = await getFirebaseAdminCollection('assessments').doc(assessmentId).get()

  if (!snapshot.exists) {
    return null
  }

  return toAssessmentDocument(snapshot)
}

const getAssessmentBySlug = async (assessmentSlug: string) => {
  const normalizedSlug = normalizeCourseSlug(assessmentSlug)
  const collection = getFirebaseAdminCollection('assessments')
  const snapshot =
    typeof collection.where === 'function' ? await collection.where('slug', '==', normalizedSlug).get() : null
  const slugDocuments =
    snapshot && snapshot.docs.length > 0
      ? snapshot.docs
      : typeof collection.get === 'function'
        ? (await collection.get()).docs.filter((document) => toAssessmentDocument(document).slug === normalizedSlug)
        : []
  const legacyAssessmentSnapshot = slugDocuments.find((document) => {
    const assessment = toAssessmentDocument(document)

    return !assessment.deletedAt
  })

  return legacyAssessmentSnapshot ? toAssessmentDocument(legacyAssessmentSnapshot) : null
}

const getAssessmentAttemptById = async (attemptId: string) => {
  const snapshot = await getFirebaseAdminCollection('assessmentAttempts').doc(attemptId).get()

  if (!snapshot.exists) {
    return null
  }

  return toAssessmentAttemptDocument(snapshot)
}

const listAssessmentAttempts = async () => {
  const snapshot = await getFirebaseAdminCollection('assessmentAttempts').get()

  return snapshot.docs.map(toAssessmentAttemptDocument).filter((attempt) => !attempt.deletedAt)
}

const listUserAssessmentAttempts = async (userId: string) => {
  const snapshot = await getFirebaseAdminCollection('assessmentAttempts').where('userId', '==', userId).get()

  return snapshot.docs.map(toAssessmentAttemptDocument).filter((attempt) => !attempt.deletedAt)
}

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

const syncModuleAssessmentsOrder = async (
  session: AuthSessionContext,
  module: CourseModule,
  assessments: Assessment[]
) => {
  const now = toTimestamp()

  await getFirebaseAdminCollection('modules').doc(module.id).set(
    {
      assessmentIds: assessments.map((assessment) => assessment.id),
      updatedAt: now,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  return assessments
}

const resolveUniqueAdminAssessmentSlug = async (input: AdminAssessmentInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug) {
    throw createHttpError(400, 'Informe um slug de avaliacao valido.')
  }

  const existingBaseAssessment = await getAssessmentBySlug(baseSlug)

  if (!existingBaseAssessment) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`
    const existingAssessment = await getAssessmentBySlug(nextSlug)

    if (!existingAssessment) {
      return nextSlug
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um slug unico para a avaliacao.')
}

const buildAssessmentAttemptViewItem = (
  attempt: AssessmentAttempt,
  usersById: Map<string, User>,
  coursesById: Map<string, Course>,
  modulesById: Map<string, CourseModule>,
  assessmentsById: Map<string, Assessment>
): AdminAssessmentAttemptViewItem | null => {
  const user = usersById.get(attempt.userId)
  const course = coursesById.get(attempt.courseId)
  const module = modulesById.get(attempt.moduleId)
  const assessment = assessmentsById.get(attempt.assessmentId)

  if (
    !user ||
    !course ||
    !module ||
    !assessment ||
    user.deletedAt ||
    course.deletedAt ||
    module.deletedAt ||
    assessment.deletedAt
  ) {
    return null
  }

  return {
    id: attempt.id,
    userId: attempt.userId,
    studentName: user.fullName,
    studentEmail: user.email,
    courseId: course.id,
    courseTitle: course.title,
    moduleId: module.id,
    moduleTitle: module.title,
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    assessmentQuestionType: assessment.questionType,
    passingScore: assessment.passingScore,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    approved: attempt.approved,
    submittedAt: attempt.submittedAt,
    gradedAt: attempt.gradedAt,
    answers: attempt.answers
  }
}

const buildAccountAssessmentAttemptItem = (
  attempt: AssessmentAttempt,
  coursesById: Map<string, Course>,
  modulesById: Map<string, CourseModule>,
  assessmentsById: Map<string, Assessment>
): AccountAssessmentAttemptItem | null => {
  const course = coursesById.get(attempt.courseId)
  const module = modulesById.get(attempt.moduleId)
  const assessment = assessmentsById.get(attempt.assessmentId)

  if (!course || !module || !assessment || course.deletedAt || module.deletedAt || assessment.deletedAt) {
    return null
  }

  return {
    id: attempt.id,
    courseId: course.id,
    courseTitle: course.title,
    courseHref: `/curso/${course.slug}`,
    moduleId: module.id,
    moduleTitle: module.title,
    moduleHref: `/curso/${course.slug}/modulo/${module.slug}`,
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    passingScore: assessment.passingScore,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    score: attempt.score,
    approved: attempt.approved,
    submittedAt: attempt.submittedAt,
    gradedAt: attempt.gradedAt
  }
}

export const listAdminAssessmentsForManagement = async (
  session: AuthSessionContext,
  filters?: {
    courseId?: string
    moduleId?: string
  }
) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const assessments = await listAdminAssessments()
  const requestedCourseId = typeof filters?.courseId === 'string' ? filters.courseId.trim() : ''
  const requestedModuleId = typeof filters?.moduleId === 'string' ? filters.moduleId.trim() : ''

  return assessments.filter((assessment) => {
    if (requestedCourseId && assessment.courseId !== requestedCourseId) {
      return false
    }

    if (requestedModuleId && assessment.moduleId !== requestedModuleId) {
      return false
    }

    return true
  })
}

export const getAdminAssessmentBySlug = async (session: AuthSessionContext, assessmentSlug: string) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedSlug = normalizeCourseSlug(assessmentSlug)

  if (!normalizedSlug) {
    throw createHttpError(400, 'Informe um slug de avaliacao valido.')
  }

  const assessment = await getAssessmentBySlug(normalizedSlug)

  if (!assessment || assessment.deletedAt) {
    throw createHttpError(404, 'Avaliacao nao encontrada.')
  }

  return assessment
}

export const createAdminAssessment = async (session: AuthSessionContext, input: AdminAssessmentInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const requestedCourseId = input.courseId.trim()
  const requestedModuleId = input.moduleId.trim()

  if (!requestedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para a avaliacao.')
  }

  if (!requestedModuleId) {
    throw createHttpError(400, 'Selecione um modulo valido para a avaliacao.')
  }

  const [course, module] = await Promise.all([getCourseById(requestedCourseId), getModuleById(requestedModuleId)])

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso nao encontrado para vincular a avaliacao.')
  }

  if (!module || module.deletedAt || module.courseId !== course.id) {
    throw createHttpError(404, 'Modulo nao encontrado para vincular a avaliacao.')
  }

  const existingAssessments = await listModuleAssessments(module)
  const resolvedSlug = await resolveUniqueAdminAssessmentSlug(input)
  const assessmentPayload = buildAdminAssessmentPayload(input, session.user.id, {
    courseId: course.id,
    moduleId: module.id,
    resolvedSlug
  })
  const nextOrder = clampAssessmentOrder(existingAssessments.length + 1, existingAssessments.length + 1)
  const orderedAssessments = [...existingAssessments]
  orderedAssessments.splice(nextOrder - 1, 0, assessmentPayload)

  await getFirebaseAdminCollection('assessments').doc(assessmentPayload.id).set(assessmentPayload)
  const syncedAssessments = await syncModuleAssessmentsOrder(session, module, orderedAssessments)
  const createdAssessment = syncedAssessments.find((assessment) => assessment.id === assessmentPayload.id) || assessmentPayload

  await writeAdminLog(session, {
    action: 'create',
    targetCollection: 'assessments',
    targetId: createdAssessment.id,
    summary: `Avaliacao ${createdAssessment.title} criada no painel administrativo.`,
    metadata: {
      slug: createdAssessment.slug,
      courseId: createdAssessment.courseId,
      moduleId: createdAssessment.moduleId,
      questionType: createdAssessment.questionType
    }
  })

  return createdAssessment
}

export const updateAdminAssessmentBySlug = async (
  session: AuthSessionContext,
  assessmentSlug: string,
  input: AdminAssessmentInput
) => {
  const existingAssessment = await getAdminAssessmentBySlug(session, assessmentSlug)
  const [course, module] = await Promise.all([
    getCourseById(existingAssessment.courseId),
    getModuleById(existingAssessment.moduleId)
  ])

  if (!course || course.deletedAt) {
    throw createHttpError(404, 'Curso da avaliacao nao encontrado.')
  }

  if (!module || module.deletedAt || module.courseId !== course.id) {
    throw createHttpError(404, 'Modulo da avaliacao nao encontrado.')
  }

  const moduleAssessments = await listModuleAssessments(module)
  const remainingAssessments = moduleAssessments.filter((assessment) => assessment.id !== existingAssessment.id)
  const assessmentPayload = buildAdminAssessmentPayload(input, session.user.id, {
    courseId: course.id,
    moduleId: module.id,
    existingAssessment
  })
  const nextOrder = clampAssessmentOrder(
    moduleAssessments.findIndex((assessment) => assessment.id === existingAssessment.id) + 1 || 1,
    remainingAssessments.length + 1
  )
  const orderedAssessments = [...remainingAssessments]
  orderedAssessments.splice(nextOrder - 1, 0, assessmentPayload)

  await getFirebaseAdminCollection('assessments').doc(existingAssessment.id).set(assessmentPayload, { merge: true })
  const syncedAssessments = await syncModuleAssessmentsOrder(session, module, orderedAssessments)
  const updatedAssessment =
    syncedAssessments.find((assessment) => assessment.id === existingAssessment.id) || assessmentPayload

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'assessments',
    targetId: updatedAssessment.id,
    summary: `Avaliacao ${updatedAssessment.title} atualizada no painel administrativo.`,
    metadata: {
      slug: updatedAssessment.slug,
      courseId: updatedAssessment.courseId,
      moduleId: updatedAssessment.moduleId,
      questionType: updatedAssessment.questionType
    }
  })

  return updatedAssessment
}

export const deleteAdminAssessmentBySlug = async (session: AuthSessionContext, assessmentSlug: string) => {
  const existingAssessment = await getAdminAssessmentBySlug(session, assessmentSlug)
  const module = await getModuleById(existingAssessment.moduleId)

  if (!module || module.deletedAt) {
    throw createHttpError(404, 'Modulo da avaliacao nao encontrado.')
  }

  const now = toTimestamp()
  const deletedAssessment = {
    ...existingAssessment,
    updatedAt: now,
    deletedAt: now,
    updatedBy: session.user.id,
    deletedBy: session.user.id
  }

  await getFirebaseAdminCollection('assessments').doc(existingAssessment.id).set(
    {
      updatedAt: deletedAssessment.updatedAt,
      deletedAt: deletedAssessment.deletedAt,
      updatedBy: deletedAssessment.updatedBy,
      deletedBy: deletedAssessment.deletedBy
    },
    { merge: true }
  )

  const remainingAssessments = (await listModuleAssessments(module)).filter(
    (assessment) => assessment.id !== existingAssessment.id
  )
  await syncModuleAssessmentsOrder(session, module, remainingAssessments)

  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'assessments',
    targetId: existingAssessment.id,
    summary: `Avaliacao ${existingAssessment.title} removida no painel administrativo.`,
    metadata: {
      slug: existingAssessment.slug,
      courseId: existingAssessment.courseId,
      moduleId: existingAssessment.moduleId
    }
  })

  return deletedAssessment
}

export const getAccessibleModuleAssessmentsBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string
): Promise<StudentModuleAssessmentData> => {
  const moduleDetail = await getCourseModulesModule().service.getAccessibleModuleDetailBySlugs(
    session,
    courseSlug,
    moduleSlug
  )
  const assessments = await listModuleAssessments(moduleDetail.module)
  const settings = await getAssessmentPlatformSettings()
  const userAttempts = await listUserAssessmentAttempts(session.user.id)
  const progress = moduleDetail.progress

  return buildStudentModuleAssessmentData({
    assessments,
    attempts: userAttempts,
    maxAttemptsPerAssessment: settings.maxAttemptsPerAssessment,
    progress
  })
}

export const submitAssessmentAttemptBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string,
  assessmentSlug: string,
  answers: Record<string, string | string[]>
): Promise<StudentAssessmentSubmissionData> => {
  const moduleAssessments = await getAccessibleModuleAssessmentsBySlugs(session, courseSlug, moduleSlug)

  if (moduleAssessments.availability !== 'available') {
    throw createHttpError(400, moduleAssessments.message)
  }

  const assessmentItem = moduleAssessments.assessments.find((assessment) => assessment.slug === assessmentSlug.trim())

  if (!assessmentItem) {
    throw createHttpError(404, 'Avaliacao nao encontrada.')
  }

  if (assessmentItem.availability !== 'available') {
    throw createHttpError(400, assessmentItem.blockingMessage || 'Esta avaliacao nao esta disponivel para resposta agora.')
  }

  const assessment = await getAssessmentById(assessmentItem.id)

  if (!assessment || assessment.deletedAt) {
    throw createHttpError(404, 'Avaliacao nao encontrada.')
  }

  const userAttempts = (await listUserAssessmentAttempts(session.user.id)).filter(
    (attempt) => attempt.assessmentId === assessment.id
  )
  const attemptNumber = userAttempts.length + 1
  const now = toTimestamp()
  const normalizedAnswers = normalizeAssessmentAnswers(assessment, answers)
  const grading = gradeAssessmentAttempt(assessment, normalizedAnswers, now)

  const attemptId = randomUUID()
  const attempt: AssessmentAttempt = {
    id: attemptId,
    userId: session.user.id,
    courseId: assessment.courseId,
    moduleId: assessment.moduleId,
    assessmentId: assessment.id,
    attemptNumber,
    status: grading.status,
    score: grading.score,
    approved: grading.approved,
    answers: normalizedAnswers,
    submittedAt: now,
    gradedAt: grading.gradedAt,
    gradedBy: grading.gradedBy,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: session.user.id,
    updatedBy: session.user.id,
    deletedBy: null
  }

  await getFirebaseAdminCollection('assessmentAttempts').doc(attempt.id).set(attempt)

  return {
    attempt: {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      score: attempt.score,
      approved: attempt.approved,
      submittedAt: attempt.submittedAt
    }
  }
}

export const listAccountAssessmentAttempts = async (
  session: AuthSessionContext
): Promise<AccountAssessmentAttemptItem[]> => {
  const [attempts, courses, modules, assessments] = await Promise.all([
    listUserAssessmentAttempts(session.user.id),
    listAdminCourses(),
    listAdminModules(),
    listAdminAssessments()
  ])
  const coursesById = new Map(courses.map((course) => [course.id, course] as const))
  const modulesById = new Map(modules.map((module) => [module.id, module] as const))
  const assessmentsById = new Map(assessments.map((assessment) => [assessment.id, assessment] as const))

  return attempts
    .map((attempt) => buildAccountAssessmentAttemptItem(attempt, coursesById, modulesById, assessmentsById))
    .filter((attempt): attempt is AccountAssessmentAttemptItem => Boolean(attempt))
    .sort((left, right) => {
      const rightTimestamp = toTimestampNumber(right.submittedAt || right.gradedAt)
      const leftTimestamp = toTimestampNumber(left.submittedAt || left.gradedAt)

      if (rightTimestamp !== leftTimestamp) {
        return rightTimestamp - leftTimestamp
      }

      return right.attemptNumber - left.attemptNumber
    })
}

export const listAdminAssessmentAttemptsForManagement = async (
  session: AuthSessionContext
): Promise<AdminAssessmentAttemptViewItem[]> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const [attempts, usersSnapshot, courses, modules, assessments] = await Promise.all([
    listAssessmentAttempts(),
    getFirebaseAdminCollection('users').get(),
    listAdminCourses(),
    listAdminModules(),
    listAdminAssessments()
  ])

  const usersById = new Map(
    usersSnapshot.docs.map((document) => {
      const user = toUserDocument(document)
      return [user.id, user] as const
    })
  )
  const coursesById = new Map(courses.map((course) => [course.id, course] as const))
  const modulesById = new Map(modules.map((module) => [module.id, module] as const))
  const assessmentsById = new Map(assessments.map((assessment) => [assessment.id, assessment] as const))

  return attempts
    .map((attempt) => buildAssessmentAttemptViewItem(attempt, usersById, coursesById, modulesById, assessmentsById))
    .filter((attempt): attempt is AdminAssessmentAttemptViewItem => Boolean(attempt))
    .sort((left, right) => {
      const rightTimestamp = toTimestampNumber(right.submittedAt || right.gradedAt)
      const leftTimestamp = toTimestampNumber(left.submittedAt || left.gradedAt)

      if (rightTimestamp !== leftTimestamp) {
        return rightTimestamp - leftTimestamp
      }

      return right.attemptNumber - left.attemptNumber
    })
}

export const updateAdminAssessmentAttemptScoreById = async (
  session: AuthSessionContext,
  attemptId: string,
  score: number
): Promise<AdminAssessmentAttemptViewItem> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const existingAttempt = await getAssessmentAttemptById(attemptId.trim())

  if (!existingAttempt || existingAttempt.deletedAt) {
    throw createHttpError(404, 'Resposta de avaliacao nao encontrada.')
  }

  const assessment = await getAssessmentById(existingAttempt.assessmentId)

  if (!assessment || assessment.deletedAt) {
    throw createHttpError(404, 'Avaliacao da resposta nao encontrada.')
  }

  const now = toTimestamp()
  const manualGrade = buildManualAssessmentAttemptGrade(assessment, score, now, session.user.id)
  const updatedAttempt: AssessmentAttempt = {
    ...existingAttempt,
    ...manualGrade,
    updatedAt: now,
    updatedBy: session.user.id
  }

  await getFirebaseAdminCollection('assessmentAttempts').doc(existingAttempt.id).set(updatedAttempt)

  await writeAdminLog(session, {
    action: 'update',
    targetCollection: 'assessmentAttempts',
    targetId: updatedAttempt.id,
    summary: 'Atualizou a nota de uma resposta de avaliacao.',
    metadata: {
      score: updatedAttempt.score,
      approved: updatedAttempt.approved
    }
  })

  const attemptViews = await listAdminAssessmentAttemptsForManagement(session)
  const updatedView = attemptViews.find((attempt) => attempt.id === updatedAttempt.id)

  if (!updatedView) {
    throw createHttpError(404, 'Resposta de avaliacao nao encontrada.')
  }

  return updatedView
}

export const deleteAdminAssessmentAttemptById = async (
  session: AuthSessionContext,
  attemptId: string
): Promise<AdminAssessmentAttemptViewItem> => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const existingAttempt = await getAssessmentAttemptById(attemptId.trim())

  if (!existingAttempt || existingAttempt.deletedAt) {
    throw createHttpError(404, 'Resposta de avaliacao nao encontrada.')
  }

  const attemptViews = await listAdminAssessmentAttemptsForManagement(session)
  const deletedView = attemptViews.find((attempt) => attempt.id === existingAttempt.id)

  if (!deletedView) {
    throw createHttpError(404, 'Resposta de avaliacao nao encontrada.')
  }

  const now = toTimestamp()

  await getFirebaseAdminCollection('assessmentAttempts').doc(existingAttempt.id).set(
    {
      deletedAt: now,
      deletedBy: session.user.id,
      updatedAt: now,
      updatedBy: session.user.id
    },
    { merge: true }
  )

  await writeAdminLog(session, {
    action: 'delete',
    targetCollection: 'assessmentAttempts',
    targetId: existingAttempt.id,
    summary: 'Excluiu uma resposta de avaliacao para liberar nova tentativa.',
    metadata: {
      userId: existingAttempt.userId,
      assessmentId: existingAttempt.assessmentId
    }
  })

  return deletedView
}
