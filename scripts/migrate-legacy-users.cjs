#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const repoRoot = path.resolve(__dirname, '..')
const workspaceRequire = createRequire(path.join(repoRoot, 'apps', 'web', 'package.json'))
const { initializeApp, cert, getApps } = workspaceRequire('firebase-admin/app')
const { getAuth } = workspaceRequire('firebase-admin/auth')
const { getFirestore } = workspaceRequire('firebase-admin/firestore')

const TARGET_COURSE_SLUG = 'curso-de-teologia-basica'
const TARGET_COURSE_TITLE = 'Curso de Teologia Básica'
const TARGET_CLASSROOM_NAME = 'Turma Principal - Curso de Teologia Básica'
const TARGET_CLASSROOM_UUID = 'turma-principal-curso-de-teologia-basica'
const MIGRATION_ACTOR_ID = 'migration-script'
const MIGRATION_ACTOR_EMAIL = 'migration-script@local'
const SKIP_EMAILS = new Set(['matheusnpenna@gmail.com', 'matheusnpenna2@gmail.com'])
const ADMIN_EMAIL = 'matheusnpenna@gmail.com'
const LEGACY_COLLECTIONS = ['users', 'user-data']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isWriteMode = process.argv.includes('--write')
const isInspectMode = process.argv.includes('--inspect')
const isListSkippedMode = process.argv.includes('--list-skipped')
const isResolveSkippedMode = process.argv.includes('--resolve-skipped')

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

const getFirebaseApp = () => {
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
      privateKey: env.privateKey.replace(/\\n/g, '\n').trim()
    })
  })
}

const now = () => new Date().toISOString()

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const normalizeEmail = (value) => normalizeText(value).toLowerCase().replace(/^mailto:/, '')
const normalizeCpf = (value) => normalizeText(value).replace(/\D/g, '')
const normalizePhone = (value) => normalizeText(value).replace(/[^\d+]/g, '')

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const toIsoString = (value) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString()
  }

  return null
}

const getCollection = (firestore, collectionName, useV2Prefix = true) =>
  firestore.collection(useV2Prefix ? `v2_${collectionName}` : collectionName)

const createFallbackNameFromEmail = (email) => {
  const [localPart] = String(email || '').split('@')
  return String(localPart || '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const mapRegion = (value) => {
  const normalized = slugify(value)

  if (!normalized) {
    return 'aluno-externo'
  }

  if (normalized.includes('feira')) {
    return 'feira-de-santana'
  }

  if (normalized.includes('panambi')) {
    return 'panambi'
  }

  if (normalized.includes('sertao') || normalized.includes('sertao')) {
    return 'sertao'
  }

  return 'aluno-externo'
}

const getFirstString = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

const getFirstValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key]

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return null
}

const fetchAllAuthUsers = async (auth) => {
  const users = []
  let nextPageToken

  do {
    const response = await auth.listUsers(1000, nextPageToken)
    users.push(...response.users)
    nextPageToken = response.pageToken
  } while (nextPageToken)

  return users
}

const fetchCourse = async (firestore) => {
  const directSnapshot = await getCollection(firestore, 'courses').doc(TARGET_COURSE_SLUG).get()

  if (directSnapshot.exists) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data()
    }
  }

  const byTitleSnapshot = await getCollection(firestore, 'courses')
    .where('title', '==', TARGET_COURSE_TITLE)
    .limit(1)
    .get()

  if (byTitleSnapshot.empty) {
    return null
  }

  const document = byTitleSnapshot.docs[0]

  return {
    id: document.id,
    ...document.data()
  }
}

const fetchClassroom = async (firestore) => {
  const directSnapshot = await getCollection(firestore, 'classrooms').doc(TARGET_CLASSROOM_UUID).get()

  if (directSnapshot.exists) {
    return {
      id: directSnapshot.id,
      ...directSnapshot.data()
    }
  }

  const byNameSnapshot = await getCollection(firestore, 'classrooms')
    .where('name', '==', TARGET_CLASSROOM_NAME)
    .limit(1)
    .get()

  if (byNameSnapshot.empty) {
    return null
  }

  const document = byNameSnapshot.docs[0]

  return {
    id: document.id,
    ...document.data()
  }
}

const ensureTargetClassroom = async (firestore, course, summary) => {
  const existingClassroom = await fetchClassroom(firestore)
  const timestamp = now()

  if (!existingClassroom) {
    const classroomDocument = {
      id: TARGET_CLASSROOM_UUID,
      name: TARGET_CLASSROOM_NAME,
      uuid: TARGET_CLASSROOM_UUID,
      description: 'Turma principal criada para concentrar os alunos migrados do sistema legado.',
      registrationOpen: false,
      registrationStartsAt: null,
      registrationEndsAt: null,
      linkedCourseIds: [course.id],
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      createdBy: MIGRATION_ACTOR_ID,
      updatedBy: MIGRATION_ACTOR_ID,
      deletedBy: null
    }

    if (isWriteMode) {
      await getCollection(firestore, 'classrooms').doc(classroomDocument.id).set(classroomDocument)
    }

    summary.classroomCreated = true
    return classroomDocument
  }

  const linkedCourseIds = Array.isArray(existingClassroom.linkedCourseIds)
    ? [...new Set([...existingClassroom.linkedCourseIds, course.id])]
    : [course.id]

  if (!existingClassroom.linkedCourseIds?.includes(course.id)) {
    if (isWriteMode) {
      await getCollection(firestore, 'classrooms').doc(existingClassroom.id).set(
        {
          linkedCourseIds,
          updatedAt: timestamp,
          updatedBy: MIGRATION_ACTOR_ID
        },
        { merge: true }
      )
    }

    existingClassroom.linkedCourseIds = linkedCourseIds
    summary.classroomLinkedToCourse = true
  }

  return existingClassroom
}

const extractLegacyCandidate = (sourceCollection, snapshot, authUsersByUid) => {
  const raw = snapshot.data()
  const authUidCandidate = getFirstString(raw, ['uid', 'userId', 'user_id', 'authUid', 'auth_id']) || snapshot.id
  const authRecord = authUsersByUid.get(authUidCandidate) || null
  const email =
    normalizeEmail(
      getFirstString(raw, ['email', 'mail', 'userEmail', 'user_email', 'login']) || authRecord?.email || ''
    ) || ''

  if (!email || !EMAIL_REGEX.test(email)) {
    return null
  }

  const fullName =
    getFirstString(raw, ['fullName', 'displayName', 'name', 'nome', 'userName', 'user_name']) ||
    authRecord?.displayName ||
    createFallbackNameFromEmail(email)

  return {
    sourceCollection,
    sourceDocumentId: snapshot.id,
    authUid: authRecord?.uid || authUidCandidate || null,
    email,
    fullName,
    cpf: normalizeCpf(getFirstString(raw, ['cpf', 'document', 'documentNumber', 'document_number'])),
    password: normalizeText(getFirstString(raw, ['password', 'pass', 'senha'])) || null,
    phone: normalizePhone(getFirstString(raw, ['phone', 'telefone', 'celular', 'whatsapp'])) || null,
    avatarUrl:
      normalizeText(
        getFirstString(raw, ['avatarUrl', 'avatar', 'photoURL', 'photoUrl', 'imageUrl', 'image', 'photo'])
      ) ||
      null,
    region: mapRegion(
      getFirstString(raw, ['region', 'regiao', 'regional', 'campus', 'polo', 'unit', 'unidade', 'city'])
    ),
    createdAt:
      toIsoString(getFirstValue(raw, ['createdAt', 'created_at', 'creationTime', 'registeredAt'])) ||
      toIsoString(authRecord?.metadata?.creationTime),
    updatedAt:
      toIsoString(getFirstValue(raw, ['updatedAt', 'updated_at', 'lastUpdateAt', 'last_update_at'])) ||
      toIsoString(authRecord?.metadata?.lastRefreshTime),
    lastLoginAt:
      toIsoString(getFirstValue(raw, ['lastLoginAt', 'last_login_at', 'lastAccessAt'])) ||
      toIsoString(authRecord?.metadata?.lastSignInTime)
  }
}

const mergeLegacyCandidates = (currentCandidate, nextCandidate) => ({
  ...currentCandidate,
  authUid: currentCandidate.authUid || nextCandidate.authUid,
  fullName: currentCandidate.fullName || nextCandidate.fullName,
  cpf: currentCandidate.cpf || nextCandidate.cpf,
  password: currentCandidate.password || nextCandidate.password,
  phone: currentCandidate.phone || nextCandidate.phone,
  avatarUrl: currentCandidate.avatarUrl || nextCandidate.avatarUrl,
  region: currentCandidate.region !== 'aluno-externo' ? currentCandidate.region : nextCandidate.region,
  createdAt: currentCandidate.createdAt || nextCandidate.createdAt,
  updatedAt: nextCandidate.updatedAt || currentCandidate.updatedAt,
  lastLoginAt: nextCandidate.lastLoginAt || currentCandidate.lastLoginAt,
  sources: [...(currentCandidate.sources || []), nextCandidate.sourceCollection]
})

const buildV2UserDocument = ({ uid, legacyCandidate, authRecord, existingV2User }) => {
  const timestamp = now()
  const isAdmin = legacyCandidate.email === ADMIN_EMAIL

  return {
    id: uid,
    role: isAdmin ? 'admin' : 'student',
    status: authRecord?.disabled ? 'blocked' : existingV2User?.status || 'active',
    fullName:
      legacyCandidate.fullName ||
      authRecord?.displayName ||
      existingV2User?.fullName ||
      createFallbackNameFromEmail(legacyCandidate.email) ||
      'Aluno',
    cpf: legacyCandidate.cpf || existingV2User?.cpf || '',
    email: legacyCandidate.email,
    phone: legacyCandidate.phone || existingV2User?.phone || null,
    avatarUrl: legacyCandidate.avatarUrl || existingV2User?.avatarUrl || null,
    region: legacyCandidate.region || existingV2User?.region || 'aluno-externo',
    lastLoginAt: legacyCandidate.lastLoginAt || existingV2User?.lastLoginAt || null,
    createdAt: existingV2User?.createdAt || legacyCandidate.createdAt || timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    createdBy: existingV2User?.createdBy || MIGRATION_ACTOR_ID,
    updatedBy: MIGRATION_ACTOR_ID,
    deletedBy: null
  }
}

const createEnrollmentId = (userId, courseId, classroomId) => `${userId}--${courseId}--${classroomId}`

const createAdminLogPayload = (targetId, summary, metadata) => {
  const timestamp = now()

  return {
    id: `legacy-users-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorUserId: MIGRATION_ACTOR_ID,
    actorEmail: MIGRATION_ACTOR_EMAIL,
    action: 'create',
    targetCollection: 'users',
    targetId,
    summary,
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  }
}

const inspectLegacySources = async (firestore, auth) => {
  console.log('Modo de inspecao habilitado.\n')

  for (const collectionName of LEGACY_COLLECTIONS) {
    const snapshot = await getCollection(firestore, collectionName, false).limit(3).get()
    console.log(`Collection legada "${collectionName}" - amostra de ${snapshot.size} documento(s):`)

    snapshot.docs.forEach((document, index) => {
      const data = document.data()
      console.log(`- Documento ${index + 1}: id=${document.id}`)
      console.log(`  Chaves: ${Object.keys(data).join(', ')}`)
      console.log(`  Payload: ${JSON.stringify(data, null, 2).slice(0, 1200)}\n`)
    })
  }

  const course = await fetchCourse(firestore)
  const classroom = await fetchClassroom(firestore)

  console.log('Curso alvo:', course ? { id: course.id, title: course.title, slug: course.slug } : 'nao encontrado')
  console.log(
    'Turma alvo:',
    classroom ? { id: classroom.id, name: classroom.name, uuid: classroom.uuid } : 'nao encontrada'
  )

  const authUsers = await fetchAllAuthUsers(auth)
  console.log(`Usuarios no Firebase Authentication: ${authUsers.length}`)
}

const listSkippedLegacyUsers = async (firestore, auth) => {
  const authUsers = await fetchAllAuthUsers(auth)
  const authUsersByUid = new Map(authUsers.map((user) => [user.uid, user]))
  const skipped = []

  for (const collectionName of LEGACY_COLLECTIONS) {
    const snapshot = await getCollection(firestore, collectionName, false).get()

    snapshot.docs.forEach((document) => {
      const raw = document.data()
      const authUidCandidate = getFirstString(raw, ['uid', 'userId', 'user_id', 'authUid', 'auth_id']) || document.id
      const authRecord = authUsersByUid.get(authUidCandidate) || null
      const rawEmail =
        getFirstString(raw, ['email', 'mail', 'userEmail', 'user_email', 'login']) || authRecord?.email || ''
      const normalizedEmail = normalizeEmail(rawEmail)

      if (normalizedEmail && EMAIL_REGEX.test(normalizedEmail)) {
        return
      }

      skipped.push({
        collection: collectionName,
        id: document.id,
        rawEmail: rawEmail || null,
        normalizedEmail: normalizedEmail || null,
        keys: Object.keys(raw)
      })
    })
  }

  console.log(JSON.stringify(skipped, null, 2))
}

const resolveSkippedLegacyUsers = async (firestore, auth) => {
  const authUsers = await fetchAllAuthUsers(auth)
  const authUsersByUid = new Map(authUsers.map((user) => [user.uid, user]))
  const skippedIds = new Set()
  const skipped = []

  for (const collectionName of LEGACY_COLLECTIONS) {
    const snapshot = await getCollection(firestore, collectionName, false).get()

    snapshot.docs.forEach((document) => {
      const raw = document.data()
      const authUidCandidate = getFirstString(raw, ['uid', 'userId', 'user_id', 'authUid', 'auth_id']) || document.id
      const authRecord = authUsersByUid.get(authUidCandidate) || null
      const rawEmail =
        getFirstString(raw, ['email', 'mail', 'userEmail', 'user_email', 'login']) || authRecord?.email || ''
      const normalizedEmail = normalizeEmail(rawEmail)

      if (normalizedEmail && EMAIL_REGEX.test(normalizedEmail)) {
        return
      }

      skippedIds.add(document.id)
      skipped.push({
        collection: collectionName,
        id: document.id,
        rawEmail: rawEmail || null,
        normalizedEmail: normalizedEmail || null,
        authEmail: authRecord?.email || null,
        keys: Object.keys(raw),
        references: []
      })
    })
  }

  const skippedById = new Map(skipped.map((item) => [item.id, item]))
  const containsSkippedId = (value) => {
    if (typeof value === 'string') {
      for (const skippedId of skippedIds) {
        if (value.includes(skippedId)) {
          return skippedId
        }
      }
      return null
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const match = containsSkippedId(item)

        if (match) {
          return match
        }
      }

      return null
    }

    if (value && typeof value === 'object') {
      for (const nestedValue of Object.values(value)) {
        const match = containsSkippedId(nestedValue)

        if (match) {
          return match
        }
      }
    }

    return null
  }

  for (const collectionName of LEGACY_COLLECTIONS) {
    const snapshot = await getCollection(firestore, collectionName, false).get()

    snapshot.docs.forEach((document) => {
      if (skippedIds.has(document.id)) {
        return
      }

      const raw = document.data()
      const matchedSkippedId = containsSkippedId(raw)

      if (!matchedSkippedId) {
        return
      }

      const target = skippedById.get(matchedSkippedId)

      if (!target) {
        return
      }

      target.references.push({
        collection: collectionName,
        id: document.id,
        email:
          getFirstString(raw, ['email', 'mail', 'userEmail', 'user_email', 'login']) || null,
        name: getFirstString(raw, ['name', 'nome', 'fullName', 'displayName']) || null,
        keys: Object.keys(raw)
      })
    })
  }

  console.log(JSON.stringify(skipped, null, 2))
}

const migrateLegacyUsers = async () => {
  getFirebaseApp()
  const firestore = getFirestore()
  const auth = getAuth()

  if (isInspectMode) {
    await inspectLegacySources(firestore, auth)
    return
  }

  if (isListSkippedMode) {
    await listSkippedLegacyUsers(firestore, auth)
    return
  }

  if (isResolveSkippedMode) {
    await resolveSkippedLegacyUsers(firestore, auth)
    return
  }

  const summary = {
    dryRun: !isWriteMode,
    classroomCreated: false,
    classroomLinkedToCourse: false,
    legacyDocumentsRead: 0,
    deduplicatedCandidates: 0,
    skippedByEmail: 0,
    skippedWithoutEmail: 0,
    skippedInvalidEmail: 0,
    createdAuthUsers: 0,
    createdAuthUsersWithPassword: 0,
    authCreationEmails: [],
    reusedAuthUsers: 0,
    createdV2Users: 0,
    updatedV2Users: 0,
    createdEnrollments: 0,
    reactivatedEnrollments: 0,
    skippedExistingEnrollments: 0
  }

  const course = await fetchCourse(firestore)

  if (!course) {
    throw new Error(`Curso alvo nao encontrado: ${TARGET_COURSE_TITLE}.`)
  }

  const classroom = await ensureTargetClassroom(firestore, course, summary)
  const authUsers = await fetchAllAuthUsers(auth)
  const authUsersByEmail = new Map(
    authUsers
      .filter((user) => user.email)
      .map((user) => [normalizeEmail(user.email), user])
  )
  const authUsersByUid = new Map(authUsers.map((user) => [user.uid, user]))

  const existingV2UsersSnapshot = await getCollection(firestore, 'users').get()
  const existingV2Users = existingV2UsersSnapshot.docs
    .map((document) => ({
      id: document.id,
      ...document.data()
    }))
    .filter((user) => !user.deletedAt)
  const existingV2UsersByEmail = new Map(existingV2Users.map((user) => [normalizeEmail(user.email), user]))

  const existingEnrollmentsSnapshot = await getCollection(firestore, 'enrollments').get()
  const existingEnrollmentsByKey = new Map(
    existingEnrollmentsSnapshot.docs.map((document) => {
      const enrollment = {
        id: document.id,
        ...document.data()
      }

      return [`${enrollment.userId}::${enrollment.courseId}::${enrollment.classroomId}`, enrollment]
    })
  )

  const deduplicatedCandidates = new Map()

  for (const collectionName of LEGACY_COLLECTIONS) {
    const snapshot = await getCollection(firestore, collectionName, false).get()
    summary.legacyDocumentsRead += snapshot.size

    snapshot.docs.forEach((document) => {
      const candidate = extractLegacyCandidate(collectionName, document, authUsersByUid)

      if (!candidate) {
        const raw = document.data()
        const rawEmail = normalizeEmail(
          getFirstString(raw, ['email', 'mail', 'userEmail', 'user_email', 'login']) || ''
        )

        if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
          summary.skippedInvalidEmail += 1
        } else {
          summary.skippedWithoutEmail += 1
        }
        return
      }

      const existingCandidate = deduplicatedCandidates.get(candidate.email)

      if (existingCandidate) {
        deduplicatedCandidates.set(candidate.email, mergeLegacyCandidates(existingCandidate, candidate))
        return
      }

      deduplicatedCandidates.set(candidate.email, {
        ...candidate,
        sources: [candidate.sourceCollection]
      })
    })
  }

  summary.deduplicatedCandidates = deduplicatedCandidates.size

  for (const legacyCandidate of deduplicatedCandidates.values()) {
    if (SKIP_EMAILS.has(legacyCandidate.email)) {
      summary.skippedByEmail += 1
      continue
    }

    const existingV2User = existingV2UsersByEmail.get(legacyCandidate.email) || null
    let authRecord = authUsersByEmail.get(legacyCandidate.email) || null
    let uid = existingV2User?.id || authRecord?.uid || legacyCandidate.authUid || null

    if (!uid) {
      throw new Error(`Nao foi possivel resolver um UID para o usuario ${legacyCandidate.email}.`)
    }

    if (!authRecord) {
      const legacyPassword =
        typeof legacyCandidate.password === 'string' && legacyCandidate.password.length >= 6
          ? legacyCandidate.password
          : undefined

      if (isWriteMode) {
        authRecord = await auth.createUser({
          uid,
          email: legacyCandidate.email,
          displayName: legacyCandidate.fullName || undefined,
          password: legacyPassword,
          disabled: false
        })
      } else {
        authRecord = {
          uid,
          email: legacyCandidate.email,
          displayName: legacyCandidate.fullName || null,
          disabled: false,
          metadata: {
            creationTime: legacyCandidate.createdAt || now(),
            lastSignInTime: legacyCandidate.lastLoginAt || null
          }
        }
      }

      summary.createdAuthUsers += 1
      if (legacyPassword) {
        summary.createdAuthUsersWithPassword += 1
      }
      summary.authCreationEmails.push(legacyCandidate.email)
      authUsersByEmail.set(legacyCandidate.email, authRecord)
      authUsersByUid.set(uid, authRecord)
    } else {
      uid = authRecord.uid
      summary.reusedAuthUsers += 1
    }

    const userDocument = buildV2UserDocument({
      uid,
      legacyCandidate,
      authRecord,
      existingV2User
    })

    if (isWriteMode) {
      await getCollection(firestore, 'users').doc(uid).set(userDocument, { merge: true })
    }

    if (existingV2User) {
      summary.updatedV2Users += 1
    } else {
      summary.createdV2Users += 1
    }

    existingV2UsersByEmail.set(legacyCandidate.email, userDocument)

    const enrollmentKey = `${uid}::${course.id}::${classroom.id}`
    const existingEnrollment = existingEnrollmentsByKey.get(enrollmentKey) || null

    if (existingEnrollment && !existingEnrollment.deletedAt && existingEnrollment.status === 'active') {
      summary.skippedExistingEnrollments += 1
      continue
    }

    const enrollmentId = existingEnrollment?.id || createEnrollmentId(uid, course.id, classroom.id)
    const enrollmentDocument = {
      id: enrollmentId,
      userId: uid,
      classroomId: classroom.id,
      courseId: course.id,
      status: 'active',
      startedAt: existingEnrollment?.startedAt || legacyCandidate.createdAt || now(),
      completedAt: null,
      certificateIssuedAt: null,
      createdAt: existingEnrollment?.createdAt || now(),
      updatedAt: now(),
      deletedAt: null,
      createdBy: existingEnrollment?.createdBy || MIGRATION_ACTOR_ID,
      updatedBy: MIGRATION_ACTOR_ID,
      deletedBy: null
    }

    if (isWriteMode) {
      await getCollection(firestore, 'enrollments').doc(enrollmentId).set(enrollmentDocument, { merge: true })
    }

    existingEnrollmentsByKey.set(enrollmentKey, enrollmentDocument)

    if (existingEnrollment) {
      summary.reactivatedEnrollments += 1
    } else {
      summary.createdEnrollments += 1
    }
  }

  if (isWriteMode) {
    await getCollection(firestore, 'adminLogs').doc().set(
      createAdminLogPayload('legacy-user-migration', 'Migrou usuarios legados para a estrutura v2.', summary)
    )
  }

  console.log('\nResumo da migracao de usuarios legados:')
  console.table(summary)
}

migrateLegacyUsers().catch((error) => {
  console.error('\nFalha na migracao de usuarios legados.')
  console.error(error)
  process.exit(1)
})
