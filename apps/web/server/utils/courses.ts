import type {
  AdminAssessmentInput,
  AdminCourseInput,
  AdminLessonInput,
  AdminModuleInput,
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
  ModuleDetailLesson,
  StudentAssessmentItem,
  StudentModuleAssessmentData
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

const createFourDigitSlugHash = (value: string, salt = 0) => {
  const normalizedValue = `${value}:${salt}`
  let hash = 0

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) % 9000
  }

  return String(hash + 1000)
}

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

const assertAdminCoursePayload = (
  input: AdminCourseInput,
  options?: { currentCourseSlug?: string; resolvedSlug?: string }
) => {
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)
  const normalizedCurrentCourseSlug = options?.currentCourseSlug ? normalizeCourseSlug(options.currentCourseSlug) : null

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

const resolveUniqueAdminCourseSlug = async (input: AdminCourseInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug || !COURSE_SLUG_REGEX.test(baseSlug)) {
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

const getAssessmentById = async (assessmentId: string) => {
  const snapshot = await getFirebaseAdminCollection('assessments').doc(assessmentId).get()

  if (!snapshot.exists) {
    return null
  }

  return toAssessmentDocument(snapshot)
}

const getAssessmentBySlug = async (assessmentSlug: string) => {
  const assessmentById = await getAssessmentById(assessmentSlug)

  if (assessmentById) {
    return assessmentById
  }

  const snapshot = await getFirebaseAdminCollection('assessments').where('slug', '==', assessmentSlug).get()
  const legacyAssessmentSnapshot = snapshot.docs.find((document) => {
    const assessment = toAssessmentDocument(document)

    return !assessment.deletedAt
  })

  return legacyAssessmentSnapshot ? toAssessmentDocument(legacyAssessmentSnapshot) : null
}

const assertAdminModulePayload = (
  input: AdminModuleInput,
  options?: {
    existingModule?: CourseModule | null
    resolvedSlug?: string
  }
) => {
  const existingModule = options?.existingModule || null
  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)

  if (!normalizedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para o modulo.')
  }

  if (existingModule && normalizedCourseId !== existingModule.courseId) {
    throw createHttpError(400, 'O curso do modulo nao pode ser alterado apos a criacao.')
  }

  if (!input.title.trim()) {
    throw createHttpError(400, 'Informe o titulo do modulo.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createHttpError(400, 'Informe um slug de modulo valido.')
  }

  if (existingModule && normalizedSlug !== existingModule.slug) {
    throw createHttpError(400, 'O slug do modulo nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createHttpError(400, 'Informe a descricao do modulo.')
  }

  if (!Number.isFinite(input.order) || input.order < 1) {
    throw createHttpError(400, 'Informe uma ordem valida para o modulo.')
  }

  if (!Number.isFinite(input.estimatedDurationInMinutes) || input.estimatedDurationInMinutes < 0) {
    throw createHttpError(400, 'Informe uma duracao estimada valida para o modulo.')
  }

  return {
    courseId: normalizedCourseId,
    slug: normalizedSlug
  }
}

const resolveUniqueAdminModuleSlug = async (input: AdminModuleInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug || !COURSE_SLUG_REGEX.test(baseSlug)) {
    throw createHttpError(400, 'Informe um slug de modulo valido.')
  }

  const existingBaseModule = await getModuleById(baseSlug)

  if (!existingBaseModule) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`
    const existingModule = await getModuleById(nextSlug)

    if (!existingModule) {
      return nextSlug
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um slug unico para o modulo.')
}

const assertAdminLessonPayload = (
  input: AdminLessonInput,
  options?: {
    existingLesson?: Lesson | null
    resolvedSlug?: string
  }
) => {
  const existingLesson = options?.existingLesson || null
  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedModuleId = normalizeCourseSlug(input.moduleId)
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)

  if (!normalizedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para a aula.')
  }

  if (!normalizedModuleId) {
    throw createHttpError(400, 'Selecione um modulo valido para a aula.')
  }

  if (existingLesson && normalizedCourseId !== existingLesson.courseId) {
    throw createHttpError(400, 'O curso da aula nao pode ser alterado apos a criacao.')
  }

  if (existingLesson && normalizedModuleId !== existingLesson.moduleId) {
    throw createHttpError(400, 'O modulo da aula nao pode ser alterado apos a criacao.')
  }

  if (!input.title.trim()) {
    throw createHttpError(400, 'Informe o titulo da aula.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createHttpError(400, 'Informe um slug de aula valido.')
  }

  if (existingLesson && normalizedSlug !== existingLesson.slug) {
    throw createHttpError(400, 'O slug da aula nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createHttpError(400, 'Informe a descricao da aula.')
  }

  if (!Number.isFinite(input.order) || input.order < 1) {
    throw createHttpError(400, 'Informe uma ordem valida para a aula.')
  }

  if (!['video', 'text', 'audio'].includes(input.contentType)) {
    throw createHttpError(400, 'Informe um tipo de conteudo valido para a aula.')
  }

  if (input.videoProvider && !['youtube', 'vimeo', 'upload', 'embed'].includes(input.videoProvider)) {
    throw createHttpError(400, 'Informe um provedor de video valido para a aula.')
  }

  if (!Number.isFinite(input.durationInMinutes) || input.durationInMinutes < 0) {
    throw createHttpError(400, 'Informe uma duracao valida para a aula.')
  }

  return {
    courseId: normalizedCourseId,
    moduleId: normalizedModuleId,
    slug: normalizedSlug
  }
}

const resolveUniqueAdminLessonSlug = async (input: AdminLessonInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug || !COURSE_SLUG_REGEX.test(baseSlug)) {
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

const assertAdminAssessmentPayload = (
  input: AdminAssessmentInput,
  options?: {
    existingAssessment?: Assessment | null
    resolvedSlug?: string
  }
) => {
  const existingAssessment = options?.existingAssessment || null
  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedModuleId = normalizeCourseSlug(input.moduleId)
  const normalizedSlug = normalizeCourseSlug(options?.resolvedSlug || input.slug || input.title)

  if (!normalizedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para a avaliacao.')
  }

  if (!normalizedModuleId) {
    throw createHttpError(400, 'Selecione um modulo valido para a avaliacao.')
  }

  if (existingAssessment && normalizedCourseId !== existingAssessment.courseId) {
    throw createHttpError(400, 'O curso da avaliacao nao pode ser alterado apos a criacao.')
  }

  if (existingAssessment && normalizedModuleId !== existingAssessment.moduleId) {
    throw createHttpError(400, 'O modulo da avaliacao nao pode ser alterado apos a criacao.')
  }

  if (!input.title.trim()) {
    throw createHttpError(400, 'Informe o titulo da avaliacao.')
  }

  if (!normalizedSlug || !COURSE_SLUG_REGEX.test(normalizedSlug)) {
    throw createHttpError(400, 'Informe um slug de avaliacao valido.')
  }

  if (existingAssessment && normalizedSlug !== existingAssessment.slug) {
    throw createHttpError(400, 'O slug da avaliacao nao pode ser alterado apos a criacao.')
  }

  if (!input.description.trim()) {
    throw createHttpError(400, 'Informe a descricao da avaliacao.')
  }

  if (!['multiple_choice', 'free_text'].includes(input.questionType)) {
    throw createHttpError(400, 'Informe um tipo de questao valido para a avaliacao.')
  }

  if (!Number.isFinite(input.passingScore) || input.passingScore < 0 || input.passingScore > 100) {
    throw createHttpError(400, 'Informe uma nota minima entre 0 e 100 para a avaliacao.')
  }

  if (
    input.timeLimitInMinutes !== null &&
    (!Number.isFinite(input.timeLimitInMinutes) || Number(input.timeLimitInMinutes) <= 0)
  ) {
    throw createHttpError(400, 'Informe um tempo limite valido para a avaliacao.')
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw createHttpError(400, 'Cadastre pelo menos uma questao na avaliacao.')
  }

  const normalizedQuestionIds = new Set<string>()

  for (const question of input.questions) {
    const normalizedPrompt = question.prompt?.trim?.() || ''

    if (!question.id || normalizedQuestionIds.has(question.id)) {
      throw createHttpError(400, 'Cada questao da avaliacao precisa ter um identificador unico.')
    }

    normalizedQuestionIds.add(question.id)

    if (!normalizedPrompt) {
      throw createHttpError(400, 'Todas as questoes da avaliacao precisam ter um enunciado.')
    }

    if (input.questionType === 'multiple_choice') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw createHttpError(400, 'Questoes de multipla escolha precisam ter ao menos duas alternativas.')
      }

      const correctOptions = question.options.filter((option) => option.isCorrect)

      if (correctOptions.length !== 1) {
        throw createHttpError(400, 'Cada questao de multipla escolha precisa ter exatamente uma alternativa correta.')
      }

      const optionIds = new Set<string>()

      for (const option of question.options) {
        if (!option.id || optionIds.has(option.id)) {
          throw createHttpError(400, 'Cada alternativa precisa ter um identificador unico.')
        }

        optionIds.add(option.id)

        if (!option.label.trim()) {
          throw createHttpError(400, 'Todas as alternativas precisam ter um texto.')
        }
      }
    }

    if (input.questionType === 'free_text' && question.options.length > 0) {
      throw createHttpError(400, 'Questoes abertas nao podem possuir alternativas cadastradas.')
    }
  }

  return {
    courseId: normalizedCourseId,
    moduleId: normalizedModuleId,
    slug: normalizedSlug
  }
}

const resolveUniqueAdminAssessmentSlug = async (input: AdminAssessmentInput) => {
  const baseSlug = normalizeCourseSlug(input.slug || input.title)

  if (!baseSlug || !COURSE_SLUG_REGEX.test(baseSlug)) {
    throw createHttpError(400, 'Informe um slug de avaliacao valido.')
  }

  const existingBaseAssessment = await getAssessmentById(baseSlug)

  if (!existingBaseAssessment) {
    return baseSlug
  }

  for (let salt = 0; salt < 50; salt += 1) {
    const hash = createFourDigitSlugHash(baseSlug, salt)
    const nextSlug = `${hash}-${baseSlug}`
    const existingAssessment = await getAssessmentById(nextSlug)

    if (!existingAssessment) {
      return nextSlug
    }
  }

  throw createHttpError(500, 'Nao foi possivel gerar um slug unico para a avaliacao.')
}

const buildAdminCoursePayload = (
  input: AdminCourseInput,
  actorUserId: string,
  options?: { existingCourse?: Course | null; resolvedSlug?: string }
): Course => {
  const existingCourse = options?.existingCourse || null
  const now = toTimestamp()
  const normalizedSlug = assertAdminCoursePayload(input, {
    currentCourseSlug: existingCourse?.slug,
    resolvedSlug: options?.resolvedSlug
  })

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

const buildAdminModulePayload = (
  input: AdminModuleInput,
  actorUserId: string,
  options: {
    courseId: string
    existingModule?: CourseModule | null
    resolvedSlug?: string
  }
): CourseModule => {
  const existingModule = options.existingModule || null
  const now = toTimestamp()
  const normalizedPayload = assertAdminModulePayload(input, {
    existingModule,
    resolvedSlug: options.resolvedSlug
  })

  return {
    id: normalizedPayload.slug,
    courseId: options.courseId,
    title: input.title.trim(),
    slug: normalizedPayload.slug,
    description: input.description.trim(),
    order: Math.max(1, Math.floor(input.order)),
    lessonIds: existingModule?.lessonIds || [],
    assessmentIds: existingModule?.assessmentIds || [],
    estimatedDurationInMinutes: Math.max(0, Math.floor(input.estimatedDurationInMinutes)),
    createdAt: existingModule?.createdAt || now,
    updatedAt: now,
    deletedAt: existingModule?.deletedAt ?? null,
    createdBy: existingModule?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingModule?.deletedBy ?? null
  }
}

const buildAdminLessonPayload = (
  input: AdminLessonInput,
  actorUserId: string,
  options: {
    courseId: string
    moduleId: string
    existingLesson?: Lesson | null
    resolvedSlug?: string
  }
): Lesson => {
  const existingLesson = options.existingLesson || null
  const now = toTimestamp()
  const normalizedPayload = assertAdminLessonPayload(input, {
    existingLesson,
    resolvedSlug: options.resolvedSlug
  })

  return {
    id: normalizedPayload.slug,
    courseId: options.courseId,
    moduleId: options.moduleId,
    title: input.title.trim(),
    slug: normalizedPayload.slug,
    description: input.description.trim(),
    order: Math.max(1, Math.floor(input.order)),
    contentType: input.contentType,
    videoProvider: input.videoProvider ?? null,
    mediaUrl: normalizeOptionalText(input.mediaUrl),
    thumbnailUrl: normalizeOptionalText(input.thumbnailUrl),
    durationInMinutes: Math.max(0, Math.floor(input.durationInMinutes)),
    bodyContent: normalizeOptionalText(input.bodyContent),
    allowManualCompletion: Boolean(input.allowManualCompletion),
    createdAt: existingLesson?.createdAt || now,
    updatedAt: now,
    deletedAt: existingLesson?.deletedAt ?? null,
    createdBy: existingLesson?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingLesson?.deletedBy ?? null
  }
}

const buildAdminAssessmentPayload = (
  input: AdminAssessmentInput,
  actorUserId: string,
  options: {
    courseId: string
    moduleId: string
    existingAssessment?: Assessment | null
    resolvedSlug?: string
  }
): Assessment => {
  const existingAssessment = options.existingAssessment || null
  const now = toTimestamp()
  const normalizedPayload = assertAdminAssessmentPayload(input, {
    existingAssessment,
    resolvedSlug: options.resolvedSlug
  })

  return {
    id: normalizedPayload.slug,
    courseId: options.courseId,
    moduleId: options.moduleId,
    title: input.title.trim(),
    slug: normalizedPayload.slug,
    description: input.description.trim(),
    questionType: input.questionType,
    passingScore: Math.min(100, Math.max(0, Math.floor(input.passingScore))),
    timeLimitInMinutes:
      input.timeLimitInMinutes === null ? null : Math.max(1, Math.floor(Number(input.timeLimitInMinutes))),
    questions: input.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt.trim(),
      explanation: normalizeOptionalText(question.explanation),
      options:
        input.questionType === 'multiple_choice'
          ? question.options.map((option) => ({
              id: option.id,
              label: option.label.trim(),
              isCorrect: Boolean(option.isCorrect)
            }))
          : []
    })),
    createdAt: existingAssessment?.createdAt || now,
    updatedAt: now,
    deletedAt: existingAssessment?.deletedAt ?? null,
    createdBy: existingAssessment?.createdBy || actorUserId,
    updatedBy: actorUserId,
    deletedBy: existingAssessment?.deletedBy ?? null
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

const clampModuleOrder = (value: number, totalModules: number) => {
  const normalizedValue = Math.max(1, Math.floor(value || 1))

  return Math.min(normalizedValue, Math.max(1, totalModules))
}

const clampLessonOrder = (value: number, totalLessons: number) => {
  const normalizedValue = Math.max(1, Math.floor(value || 1))

  return Math.min(normalizedValue, Math.max(1, totalLessons))
}

const clampAssessmentOrder = (value: number, totalAssessments: number) => {
  const normalizedValue = Math.max(1, Math.floor(value || 1))

  return Math.min(normalizedValue, Math.max(1, totalAssessments))
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

const syncModuleLessonsOrder = async (
  session: AuthSessionContext,
  module: CourseModule,
  lessons: Lesson[]
) => {
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

const sanitizeAssessmentForStudent = (assessment: Assessment): StudentAssessmentItem => ({
  id: assessment.id,
  slug: assessment.slug,
  title: assessment.title,
  description: assessment.description,
  questionType: assessment.questionType,
  passingScore: assessment.passingScore,
  timeLimitInMinutes: assessment.timeLimitInMinutes,
  questionCount: assessment.questions.length,
  questions: assessment.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label
    }))
  }))
})

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

export const listAdminModulesForManagement = async (session: AuthSessionContext) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  return await listAdminModules()
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

  return assessments.filter((assessment) => {
    if (acceptedCourseIds.size > 0 && !acceptedCourseIds.has(assessment.courseId)) {
      return false
    }

    if (acceptedModuleIds.size > 0 && !acceptedModuleIds.has(assessment.moduleId)) {
      return false
    }

    return true
  })
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

export const createAdminModule = async (session: AuthSessionContext, input: AdminModuleInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedCourseId = normalizeCourseSlug(input.courseId)

  if (!normalizedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para o modulo.')
  }

  const course = await getCourseById(normalizedCourseId)

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

export const createAdminAssessment = async (session: AuthSessionContext, input: AdminAssessmentInput) => {
  if (session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  const normalizedCourseId = normalizeCourseSlug(input.courseId)
  const normalizedModuleId = normalizeCourseSlug(input.moduleId)

  if (!normalizedCourseId) {
    throw createHttpError(400, 'Selecione um curso valido para a avaliacao.')
  }

  if (!normalizedModuleId) {
    throw createHttpError(400, 'Selecione um modulo valido para a avaliacao.')
  }

  const [course, module] = await Promise.all([getCourseById(normalizedCourseId), getModuleById(normalizedModuleId)])

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
  const nextOrder = clampAssessmentOrder(moduleAssessments.findIndex((assessment) => assessment.id === existingAssessment.id) + 1 || 1, remainingAssessments.length + 1)
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

export const getAccessibleModuleAssessmentsBySlugs = async (
  session: AuthSessionContext,
  courseSlug: string,
  moduleSlug: string
): Promise<StudentModuleAssessmentData> => {
  const moduleDetail = await getAccessibleModuleDetailBySlugs(session, courseSlug, moduleSlug)
  const assessments = await listModuleAssessments(moduleDetail.module)
  const progress = moduleDetail.progress

  if (assessments.length === 0) {
    return {
      availability: 'not_created',
      message: 'Este modulo ainda nao possui avaliacao cadastrada.',
      assessments: [],
      progress
    }
  }

  if (progress.totalLessons > 0 && progress.completedLessons < progress.totalLessons) {
    return {
      availability: 'blocked_incomplete_lessons',
      message: 'Finalize todas as aulas do modulo para liberar as avaliacoes.',
      assessments: [],
      progress
    }
  }

  return {
    availability: 'available',
    message:
      assessments.length === 1
        ? 'A avaliacao deste modulo ja esta disponivel.'
        : 'As avaliacoes deste modulo ja estao disponiveis.',
    assessments: assessments.map(sanitizeAssessmentForStudent),
    progress
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
