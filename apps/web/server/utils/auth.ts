import type {
  AdminActionType,
  AuthSessionContext,
  AuthSessionUser,
  Classroom,
  RegistrationStatusResponse,
  User,
  UserRegion
} from '@ieb/shared'
import { createError, deleteCookie, getHeader, getCookie, getRequestProtocol, setCookie, type H3Event } from 'h3'
import { getFirebaseAdminAuth, getFirebaseAdminCollection, getFirebaseAdminFirestore } from './firebase-admin'

interface SessionRuntimeConfig {
  firebase: {
    apiKey: string
  }
  session: {
    cookieName: string
    cookieMaxAge: number
  }
}

interface RegisterAccountInput {
  fullName: string
  cpf: string
  email: string
  password: string
  phone: string | null
  region: User['region']
}

interface FirebaseSignInResponse {
  idToken: string
  localId: string
  email: string
}

interface FirebaseSignUpResponse extends FirebaseSignInResponse {}

interface FirebaseIdentityToolkitError {
  error?: {
    message?: string
  }
}

const REGISTRATION_CLOSED_MESSAGE =
  'Periodo de cadastro encerrado. Para saber mais, entre em contato com o suporte responsável'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_REGIONS = new Set<UserRegion>(['feira-de-santana', 'panambi', 'sertao', 'aluno-externo'])

const getSessionConfig = () => useRuntimeConfig() as unknown as SessionRuntimeConfig

const toTimestamp = () => new Date().toISOString()

const normalizeEmail = (value: string) => value.trim().toLowerCase()
const normalizeCpf = (value: string) => value.replace(/\D/g, '')
const normalizeOptionalText = (value: string | null | undefined) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : ''

  return normalizedValue ? normalizedValue : null
}

const createHttpError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage
  })

const buildIdentityToolkitUrl = (path: string) => {
  const config = getSessionConfig()

  if (!config.firebase.apiKey) {
    throw createHttpError(500, 'NUXT_FIREBASE_API_KEY nao foi configurada.')
  }

  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${config.firebase.apiKey}`
}

const mapFirebaseErrorMessage = (code: string | undefined) => {
  switch (code) {
    case 'EMAIL_EXISTS':
      return 'Ja existe uma conta cadastrada com este e-mail.'
    case 'EMAIL_NOT_FOUND':
      return 'Nao encontramos uma conta com este e-mail.'
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'E-mail ou senha invalidos.'
    case 'INVALID_EMAIL':
      return 'Informe um e-mail valido.'
    case 'USER_DISABLED':
      return 'Esta conta foi desativada.'
    case 'WEAK_PASSWORD':
      return 'A senha precisa ter pelo menos 6 caracteres.'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'
    case 'OPERATION_NOT_ALLOWED':
      return 'A autenticacao por e-mail e senha nao esta habilitada no Firebase.'
    default:
      return 'Nao foi possivel concluir a autenticacao no momento.'
  }
}

const handleFirebaseIdentityError = (error: unknown): never => {
  const firebaseError = error as { data?: FirebaseIdentityToolkitError; message?: string }
  const code = firebaseError?.data?.error?.message || firebaseError?.message

  throw createHttpError(400, mapFirebaseErrorMessage(code))
}

const callIdentityToolkit = async <TResponse>(path: string, body: Record<string, unknown>) => {
  try {
    return await $fetch<TResponse>(buildIdentityToolkitUrl(path), {
      method: 'POST',
      body
    })
  } catch (error) {
    handleFirebaseIdentityError(error)
  }
}

const isSecureCookieRequest = (event: H3Event) => {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')
  const protocol = getRequestProtocol(event)

  return process.env.NODE_ENV === 'production' || forwardedProto === 'https' ||  protocol === 'https'
}

export const setAuthSessionCookie = async (event: H3Event, idToken: string) => {
  const config = getSessionConfig()
  const expiresIn = config.session.cookieMaxAge * 1000
  const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn })

  setCookie(event, config.session.cookieName, sessionCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookieRequest(event),
    path: '/',
    maxAge: config.session.cookieMaxAge
  })
}

export const clearAuthSessionCookie = (event: H3Event) => {
  const config = getSessionConfig()

  deleteCookie(event, config.session.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookieRequest(event),
    path: '/'
  })
}

const getAuthSessionCookie = (event: H3Event) => {
  const config = getSessionConfig()
  return getCookie(event, config.session.cookieName)
}

const toSessionUser = (user: User): AuthSessionUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  status: user.status,
  region: user.region,
  avatarUrl: user.avatarUrl
})

const fallbackNameFromEmail = (email: string) => {
  const [localPart] = email.split('@')
  return (localPart || '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const buildDefaultUserDocument = (uid: string, email: string, displayName?: string | null): User => {
  const now = toTimestamp()

  return {
    id: uid,
    role: 'student',
    status: 'active',
    fullName: displayName?.trim() || fallbackNameFromEmail(email) || 'Aluno',
    cpf: '',
    email,
    phone: null,
    avatarUrl: null,
    region: 'aluno-externo',
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null
  }
}

const getUserDocumentById = async (uid: string) => {
  const snapshot = await getFirebaseAdminCollection('users').doc(uid).get()

  if (!snapshot.exists) {
    return null
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Omit<User, 'id'>)
  } as User
}

const ensureUserDocument = async (uid: string, email: string) => {
  const existingUser = await getUserDocumentById(uid)

  if (existingUser) {
    return existingUser
  }

  const authRecord = await getFirebaseAdminAuth().getUser(uid)
  const userDocument = buildDefaultUserDocument(uid, authRecord.email || email, authRecord.displayName)

  await getFirebaseAdminCollection('users').doc(uid).set(userDocument)

  return userDocument
}

const updateLastLoginAt = async (uid: string) => {
  const now = toTimestamp()

  await getFirebaseAdminCollection('users').doc(uid).set(
    {
      updatedAt: now,
      lastLoginAt: now
    },
    { merge: true }
  )
}

const assertUserCanAccessPlatform = (user: User) => {
  if (user.deletedAt) {
    throw createHttpError(403, 'Sua conta nao esta mais disponivel para acesso.')
  }

  if (user.status === 'blocked') {
    throw createHttpError(403, 'Sua conta esta bloqueada. Entre em contato com o suporte.')
  }
}

const buildSessionContext = async (uid: string, fallbackEmail?: string) => {
  const user = await ensureUserDocument(uid, fallbackEmail || '')
  assertUserCanAccessPlatform(user)

  return {
    user: toSessionUser(user),
    issuedAt: toTimestamp()
  } satisfies AuthSessionContext
}

const getCurrentSessionFromCookie = async (event: H3Event) => {
  const sessionCookie = getAuthSessionCookie(event)

  if (!sessionCookie) {
    return null
  }

  try {
    const decodedSession = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true)
    const fallbackEmail =
      typeof decodedSession.email === 'string' && decodedSession.email ? decodedSession.email : undefined

    return await buildSessionContext(decodedSession.uid, fallbackEmail)
  } catch {
    clearAuthSessionCookie(event)
    return null
  }
}

export const resolveAuthSession = async (event: H3Event) => {
  return await getCurrentSessionFromCookie(event)
}

export const requireAuthSession = async (event: H3Event, options?: { admin?: boolean }) => {
  const session = (event.context as { authSession?: AuthSessionContext }).authSession || (await resolveAuthSession(event))

  if (!session) {
    throw createHttpError(401, 'Sessao expirada. Faca login novamente.')
  }

  if (options?.admin && session.user.role !== 'admin') {
    throw createHttpError(403, 'Acesso restrito ao painel administrativo.')
  }

  ;(event.context as { authSession?: AuthSessionContext }).authSession = session

  return session
}

const getClassroomByUuid = async (classroomUuid: string) => {
  const snapshot = await getFirebaseAdminCollection('classrooms')
    .where('uuid', '==', classroomUuid)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const classroomDocument = snapshot.docs[0]

  if (!classroomDocument) {
    return null
  }

  return {
    id: classroomDocument.id,
    ...(classroomDocument.data() as Omit<Classroom, 'id'>)
  } as Classroom
}

const isRegistrationWindowOpen = (classroom: Classroom) => {
  if (classroom.deletedAt || !classroom.registrationOpen) {
    return false
  }

  const now = new Date()
  const startsAt = classroom.registrationStartsAt ? new Date(classroom.registrationStartsAt) : null
  const endsAt = classroom.registrationEndsAt ? new Date(classroom.registrationEndsAt) : null

  if (startsAt && now < startsAt) {
    return false
  }

  if (endsAt && now > endsAt) {
    return false
  }

  return true
}

export const getRegistrationStatus = async (classroomUuid: string): Promise<RegistrationStatusResponse> => {
  if (!classroomUuid) {
    return {
      isOpen: false,
      message: REGISTRATION_CLOSED_MESSAGE,
      classroomName: null
    }
  }

  const classroom = await getClassroomByUuid(classroomUuid)

  if (!classroom || !isRegistrationWindowOpen(classroom)) {
    return {
      isOpen: false,
      message: REGISTRATION_CLOSED_MESSAGE,
      classroomName: classroom?.name || null
    }
  }

  return {
    isOpen: true,
    message: 'Cadastro liberado para esta turma.',
    classroomName: classroom.name
  }
}

const assertEmailAndPassword = (email: string, password: string) => {
  if (!EMAIL_REGEX.test(email)) {
    throw createHttpError(400, 'Informe um e-mail valido.')
  }

  if (!password || password.length < 6) {
    throw createHttpError(400, 'A senha precisa ter pelo menos 6 caracteres.')
  }
}

const assertRegisterPayload = (input: RegisterAccountInput) => {
  if (!input.fullName.trim()) {
    throw createHttpError(400, 'Informe o nome completo.')
  }

  if (normalizeCpf(input.cpf).length !== 11) {
    throw createHttpError(400, 'Informe um CPF valido.')
  }

  if (!VALID_REGIONS.has(input.region)) {
    throw createHttpError(400, 'Informe uma regiao valida.')
  }

  assertEmailAndPassword(input.email, input.password)
}

const assertCpfIsAvailable = async (cpf: string) => {
  const snapshot = await getFirebaseAdminCollection('users').where('cpf', '==', cpf).limit(5).get()
  const activeMatch = snapshot.docs
    .map((doc) => doc.data() as User)
    .find((user) => user.id && !user.deletedAt)

  if (activeMatch) {
    throw createHttpError(400, 'Ja existe uma conta cadastrada com este CPF.')
  }
}

export const loginWithEmailAndPassword = async (event: H3Event, input: { email: string; password: string }) => {
  const email = normalizeEmail(input.email)
  const password = input.password

  assertEmailAndPassword(email, password)

  const authResponse = await callIdentityToolkit<FirebaseSignInResponse>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true
  })

  if (!authResponse) throw Error('failed to login')

  const session = await buildSessionContext(authResponse.localId, authResponse.email)
  await setAuthSessionCookie(event, authResponse.idToken)
  await updateLastLoginAt(authResponse.localId)

  return session.user
}

const createRegisteredStudentDocument = async (uid: string, input: RegisterAccountInput) => {
  const now = toTimestamp()
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedCpf = normalizeCpf(input.cpf)

  const userDocument: User = {
    id: uid,
    role: 'student',
    status: 'active',
    fullName: input.fullName.trim(),
    cpf: normalizedCpf,
    email: normalizedEmail,
    phone: normalizeOptionalText(input.phone),
    avatarUrl: null,
    region: input.region,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null
  }

  await getFirebaseAdminCollection('users').doc(uid).set(userDocument)

  return userDocument
}

export const registerAccount = async (event: H3Event, input: RegisterAccountInput) => {
  const normalizedEmail = normalizeEmail(input.email)
  const normalizedCpf = normalizeCpf(input.cpf)

  assertRegisterPayload({
    ...input,
    email: normalizedEmail,
    cpf: normalizedCpf
  })

  await assertCpfIsAvailable(normalizedCpf)

  let firebaseUserId: string | null = null

  try {
    const signUpResponse = await callIdentityToolkit<FirebaseSignUpResponse>('accounts:signUp', {
      email: normalizedEmail,
      password: input.password,
      returnSecureToken: true
    })

    if (!signUpResponse) throw Error('failed to signup')

    firebaseUserId = signUpResponse.localId

    const userDocument = await createRegisteredStudentDocument(firebaseUserId, {
      ...input,
      email: normalizedEmail,
      cpf: normalizedCpf
    })

    await setAuthSessionCookie(event, signUpResponse.idToken)

    return toSessionUser(userDocument)
  } catch (error) {
    if (firebaseUserId) {
      await getFirebaseAdminAuth()
        .deleteUser(firebaseUserId)
        .catch(() => undefined)
    }

    throw error
  }
}

export const sendPasswordRecoveryEmail = async (emailInput: string) => {
  const email = normalizeEmail(emailInput)

  if (!EMAIL_REGEX.test(email)) {
    throw createHttpError(400, 'Informe um e-mail valido.')
  }

  try {
    await callIdentityToolkit('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email
    })
  } catch (error) {
    const httpError = error as { statusMessage?: string }

    if (httpError.statusMessage === 'Nao encontramos uma conta com este e-mail.') {
      return
    }

    throw error
  }
}

type WriteAdminLogInput =
  | {
      action: AdminActionType
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  | 'login'
  | 'logout'

export const writeAdminLog = async (
  session: AuthSessionContext,
  input: WriteAdminLogInput,
  summary?: string
) => {
  if (session.user.role !== 'admin') {
    return
  }

  const firestore = getFirebaseAdminFirestore()
  const now = toTimestamp()
  const logRef = getFirebaseAdminCollection('adminLogs', firestore).doc()
  const payload =
    typeof input === 'string'
      ? {
          action: input,
          targetCollection: 'auth',
          targetId: session.user.id,
          summary: summary || '',
          metadata: {}
        }
      : {
          ...input,
          metadata: input.metadata || {}
        }

  await logRef.set({
    id: logRef.id,
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: payload.action,
    targetCollection: payload.targetCollection,
    targetId: payload.targetId,
    summary: payload.summary,
    metadata: payload.metadata,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  })
}
