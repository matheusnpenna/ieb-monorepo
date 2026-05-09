#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const repoRoot = path.resolve(__dirname, '..')
const workspaceRequire = createRequire(path.join(repoRoot, 'apps', 'web', 'package.json'))
const { initializeApp, cert, getApps } = workspaceRequire('firebase-admin/app')
const { getFirestore } = workspaceRequire('firebase-admin/firestore')

const DEFAULT_COURSE_SLUG = 'curso-de-teologia-basica'
const MIGRATION_ACTOR_ID = 'migration-script'
const MIGRATION_ACTOR_EMAIL = 'migration-script@local'

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const envText = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = rawLine.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = rawLine.slice(0, separatorIndex).trim()
    let value = rawLine.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

const loadFirebaseEnv = () => {
  const envPaths = [path.join(repoRoot, '.env'), path.join(repoRoot, 'apps', 'web', '.env')]
  const mergedEnv = {}

  for (const envPath of envPaths) {
    Object.assign(mergedEnv, loadEnvFile(envPath))
  }

  return {
    projectId: process.env.NUXT_FIREBASE_PROJECT_ID || mergedEnv.NUXT_FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.NUXT_FIREBASE_CLIENT_EMAIL || mergedEnv.NUXT_FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.NUXT_FIREBASE_PRIVATE_KEY || mergedEnv.NUXT_FIREBASE_PRIVATE_KEY || ''
  }
}

const getFirestoreApp = () => {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const env = loadFirebaseEnv()

  if (!env.projectId || !env.clientEmail || !env.privateKey) {
    throw new Error('Credenciais do Firebase nao encontradas no ambiente.')
  }

  return initializeApp({
    credential: cert({
      projectId: env.projectId,
      clientEmail: env.clientEmail,
      privateKey: env.privateKey.replace(/\\n/g, '\n')
    })
  })
}

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const now = () => new Date().toISOString()

const sortByOrder = (left, right) => {
  const leftOrder = Number.isFinite(left.sort) ? Number(left.sort) : Number.MAX_SAFE_INTEGER
  const rightOrder = Number.isFinite(right.sort) ? Number(right.sort) : Number.MAX_SAFE_INTEGER

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder
  }

  return String(left.title || '').localeCompare(String(right.title || ''), 'pt-BR')
}

const getArgumentValue = (name) => {
  const argument = process.argv.find((entry) => entry.startsWith(`${name}=`))

  if (!argument) {
    return null
  }

  return argument.slice(name.length + 1)
}

const isWriteMode = process.argv.includes('--write')
const targetCourseSlug = getArgumentValue('--course-slug') || DEFAULT_COURSE_SLUG

const getCollection = (firestore, collectionName, useV2Prefix = true) =>
  firestore.collection(useV2Prefix ? `v2_${collectionName}` : collectionName)

const fetchCourseBySlug = async (firestore, courseSlug) => {
  const directSnapshot = await getCollection(firestore, 'courses').doc(courseSlug).get()

  if (directSnapshot.exists) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data()
    }
  }

  const bySlugSnapshot = await getCollection(firestore, 'courses').where('slug', '==', courseSlug).limit(1).get()

  if (bySlugSnapshot.empty) {
    return null
  }

  const document = bySlugSnapshot.docs[0]

  return {
    id: document.id,
    ...document.data()
  }
}

const buildAssessmentPayload = ({
  courseId,
  moduleId,
  moduleTitle,
  moduleSlug,
  legacyQuestions,
  existingAssessment
}) => {
  const questionTypes = [...new Set(legacyQuestions.map((question) => String(question.type || '').trim() || 'alternative'))]

  if (questionTypes.length !== 1) {
    throw new Error(
      `O modulo "${moduleTitle}" possui tipos mistos de questoes no legado: ${questionTypes.join(', ')}.`
    )
  }

  const legacyType = questionTypes[0]
  const questionType = legacyType === 'opened' ? 'free_text' : 'multiple_choice'
  const slug = `avaliacao-${moduleSlug}`
  const timestamp = now()
  const createdAt = existingAssessment?.createdAt || timestamp
  const createdBy = existingAssessment?.createdBy || MIGRATION_ACTOR_ID

  const questions = [...legacyQuestions].sort(sortByOrder).map((legacyQuestion) => {
    const prompt = String(legacyQuestion.title || '').trim()

    if (!prompt) {
      throw new Error(`Foi encontrada uma questao sem enunciado no modulo "${moduleTitle}".`)
    }

    const options =
      questionType === 'multiple_choice'
        ? [...(Array.isArray(legacyQuestion.alternatives) ? legacyQuestion.alternatives : [])]
            .sort((left, right) => {
              const leftOrder = Number.isFinite(left.sort) ? Number(left.sort) : Number.MAX_SAFE_INTEGER
              const rightOrder = Number.isFinite(right.sort) ? Number(right.sort) : Number.MAX_SAFE_INTEGER

              if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder
              }

              return String(left.id || '').localeCompare(String(right.id || ''), 'pt-BR')
            })
            .map((alternative, alternativeIndex) => ({
              id: String(alternative.id || `${legacyQuestion.id}-option-${alternativeIndex + 1}`),
              label: String(alternative.text || '').trim(),
              isCorrect: Boolean(alternative.is_right)
            }))
        : []

    if (questionType === 'multiple_choice') {
      if (options.length < 2) {
        throw new Error(`A questao "${prompt}" do modulo "${moduleTitle}" nao possui ao menos duas alternativas.`)
      }

      const correctOptions = options.filter((option) => option.isCorrect)

      if (correctOptions.length !== 1) {
        throw new Error(
          `A questao "${prompt}" do modulo "${moduleTitle}" precisa ter exatamente uma alternativa correta.`
        )
      }

      for (const option of options) {
        if (!option.label) {
          throw new Error(`A questao "${prompt}" do modulo "${moduleTitle}" possui alternativa sem texto.`)
        }
      }
    }

    return {
      id: String(legacyQuestion.id),
      prompt,
      explanation: null,
      options
    }
  })

  return {
    id: slug,
    courseId,
    moduleId,
    title: `Avaliacao - ${moduleTitle}`,
    slug,
    description: `Avaliacao migrada do sistema legado para o modulo ${moduleTitle}.`,
    questionType,
    passingScore: 70,
    timeLimitInMinutes: null,
    questions,
    createdAt,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy,
    updatedBy: MIGRATION_ACTOR_ID,
    deletedBy: null
  }
}

const createAdminLogPayload = ({ action, targetId, summary, metadata }) => {
  const timestamp = now()
  const logId = `${Date.now()}-${targetId}-${Math.random().toString(36).slice(2, 8)}`

  return {
    id: logId,
    actorUserId: MIGRATION_ACTOR_ID,
    actorEmail: MIGRATION_ACTOR_EMAIL,
    action,
    targetCollection: 'assessments',
    targetId,
    summary,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  }
}

const main = async () => {
  const firestore = getFirestore(getFirestoreApp())
  const legacyModulesSnapshot = await getCollection(firestore, 'modules', false).get()
  const legacyQuestionsSnapshot = await getCollection(firestore, 'questions', false).get()
  const targetCourse = await fetchCourseBySlug(firestore, targetCourseSlug)

  if (!targetCourse || targetCourse.deletedAt) {
    throw new Error(`Curso alvo "${targetCourseSlug}" nao foi encontrado na estrutura v2.`)
  }

  const targetModulesSnapshot = await getCollection(firestore, 'modules').where('courseId', '==', targetCourse.id).get()
  const targetModules = targetModulesSnapshot.docs
    .map((document) => ({
      id: document.id,
      ...document.data()
    }))
    .filter((module) => !module.deletedAt)

  const targetModuleByNormalizedTitle = new Map(
    targetModules.map((module) => [normalizeSlug(module.title), module])
  )

  const legacyModules = legacyModulesSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data()
  }))

  const legacyQuestionsByModuleId = new Map()

  for (const document of legacyQuestionsSnapshot.docs) {
    const data = document.data()
    const moduleId = String(data.module || '').trim()

    if (!moduleId) {
      continue
    }

    if (!legacyQuestionsByModuleId.has(moduleId)) {
      legacyQuestionsByModuleId.set(moduleId, [])
    }

    legacyQuestionsByModuleId.get(moduleId).push({
      id: document.id,
      ...data
    })
  }

  const summary = {
    course: {
      id: targetCourse.id,
      title: targetCourse.title,
      slug: targetCourse.slug
    },
    writeMode: isWriteMode,
    totalLegacyModules: legacyModules.length,
    legacyModulesWithQuestions: 0,
    matchedModules: 0,
    createdAssessments: 0,
    updatedAssessments: 0,
    skippedModules: [],
    processedModules: []
  }

  for (const legacyModule of legacyModules.sort((left, right) => {
    const leftIndex = Number.isFinite(left.index) ? Number(left.index) : Number.MAX_SAFE_INTEGER
    const rightIndex = Number.isFinite(right.index) ? Number(right.index) : Number.MAX_SAFE_INTEGER

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')
  })) {
    const legacyQuestions = legacyQuestionsByModuleId.get(legacyModule.id) || []

    if (legacyQuestions.length === 0) {
      continue
    }

    summary.legacyModulesWithQuestions += 1

    const normalizedModuleTitle = normalizeSlug(legacyModule.name)
    const targetModule = targetModuleByNormalizedTitle.get(normalizedModuleTitle)

    if (!targetModule) {
      summary.skippedModules.push({
        legacyModuleId: legacyModule.id,
        legacyModuleTitle: legacyModule.name,
        reason: 'Modulo legado sem correspondente no curso v2.'
      })
      continue
    }

    summary.matchedModules += 1

    const assessmentReference = getCollection(firestore, 'assessments').doc(`avaliacao-${targetModule.slug}`)
    const existingAssessmentSnapshot = await assessmentReference.get()
    const existingAssessment = existingAssessmentSnapshot.exists
      ? {
          id: existingAssessmentSnapshot.id,
          ...existingAssessmentSnapshot.data()
        }
      : null

    if (existingAssessment && existingAssessment.moduleId !== targetModule.id) {
      throw new Error(
        `A avaliacao ${existingAssessment.id} ja existe, mas aponta para outro modulo (${existingAssessment.moduleId}).`
      )
    }

    const assessmentPayload = buildAssessmentPayload({
      courseId: targetCourse.id,
      moduleId: targetModule.id,
      moduleTitle: targetModule.title,
      moduleSlug: targetModule.slug,
      legacyQuestions,
      existingAssessment
    })

    const nextAssessmentIds = Array.isArray(targetModule.assessmentIds) ? [...targetModule.assessmentIds] : []

    if (!nextAssessmentIds.includes(assessmentPayload.id)) {
      nextAssessmentIds.push(assessmentPayload.id)
    }

    const processedModuleSummary = {
      legacyModuleId: legacyModule.id,
      legacyModuleTitle: legacyModule.name,
      targetModuleId: targetModule.id,
      targetModuleTitle: targetModule.title,
      assessmentId: assessmentPayload.id,
      questionType: assessmentPayload.questionType,
      questionCount: assessmentPayload.questions.length,
      action: existingAssessment ? 'update' : 'create'
    }

    summary.processedModules.push(processedModuleSummary)

    if (!isWriteMode) {
      continue
    }

    const timestamp = now()
    const batch = firestore.batch()

    batch.set(assessmentReference, assessmentPayload, { merge: true })
    batch.set(
      getCollection(firestore, 'modules').doc(targetModule.id),
      {
        assessmentIds: nextAssessmentIds,
        updatedAt: timestamp,
        updatedBy: MIGRATION_ACTOR_ID
      },
      { merge: true }
    )

    const logPayload = createAdminLogPayload({
      action: existingAssessment ? 'update' : 'create',
      targetId: assessmentPayload.id,
      summary: `${existingAssessment ? 'Atualizou' : 'Criou'} avaliacao migrada para o modulo ${targetModule.title}.`,
      metadata: {
        migration: 'legacy-questions-to-v2-assessments',
        courseId: targetCourse.id,
        courseSlug: targetCourse.slug,
        moduleId: targetModule.id,
        moduleSlug: targetModule.slug,
        legacyModuleId: legacyModule.id,
        legacyModuleTitle: legacyModule.name,
        questionType: assessmentPayload.questionType,
        questionCount: assessmentPayload.questions.length
      }
    })

    batch.set(getCollection(firestore, 'adminLogs').doc(logPayload.id), logPayload)
    await batch.commit()

    if (existingAssessment) {
      summary.updatedAssessments += 1
    } else {
      summary.createdAssessments += 1
    }
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
