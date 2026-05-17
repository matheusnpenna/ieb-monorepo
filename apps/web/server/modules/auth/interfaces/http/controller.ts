import type {
  AccountPasswordInput,
  AccountPasswordResponse,
  AuthSessionResponse,
  AuthSuccessResponse,
  RegistrationStatusResponse,
  UserRegion
} from '@ieb/shared'
import { getQuery, readBody, setResponseStatus, type H3Event } from 'h3'
import { getAuthModule } from '../../auth.module'
import { requireAuthSession } from './session'
import {
  clearAuthSessionCookieForEvent,
  getAuthSessionCookieFromEvent,
  setAuthSessionCookieForEvent
} from './cookies'

const getErrorStatusCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500

const getErrorStatusMessage = (error: unknown, fallbackMessage: string) =>
  typeof error === 'object' &&
  error !== null &&
  'statusMessage' in error &&
  typeof error.statusMessage === 'string' &&
  error.statusMessage
    ? error.statusMessage
    : fallbackMessage

export const handleLogin = async (event: H3Event): Promise<AuthSuccessResponse> => {
  const body = await readBody<{ email?: string; password?: string }>(event)
  const result = await getAuthModule().accountService.loginWithEmailAndPassword({
    email: body?.email || '',
    password: body?.password || ''
  })

  await setAuthSessionCookieForEvent(event, result.idToken)

  await getAuthModule().adminLogService.write(
    {
      user: result.user,
      issuedAt: new Date().toISOString()
    },
    'login',
    'Login realizado com sucesso no painel/plataforma.'
  )

  return {
    user: result.user
  }
}

export const handleLogout = async (event: H3Event) => {
  const sessionCookie = getAuthSessionCookieFromEvent(event)
  const session = await getAuthModule().sessionService.resolveAuthSession(sessionCookie)

  if (session) {
    await getAuthModule().adminLogService.write(session, 'logout', 'Logout realizado com sucesso no painel/plataforma.')
  }

  clearAuthSessionCookieForEvent(event)

  return {
    success: true
  }
}

export const handlePasswordRecovery = async (event: H3Event) => {
  const body = await readBody<{ email?: string }>(event)

  await getAuthModule().accountService.sendPasswordRecoveryEmail(body?.email || '')

  return {
    message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperacao em instantes.'
  }
}

export const handleAccountPasswordChange = async (event: H3Event): Promise<AccountPasswordResponse> => {
  try {
    const session = await requireAuthSession(event)
    const body = await readBody<AccountPasswordInput>(event)
    const result = await getAuthModule().accountService.changeAccountPassword(session, {
      currentPassword: body?.currentPassword || '',
      newPassword: body?.newPassword || '',
      newPasswordConfirmation: body?.newPasswordConfirmation || ''
    })

    await setAuthSessionCookieForEvent(event, result.idToken)

    return {
      status: 'success',
      message: 'Senha atualizada com sucesso.',
      data: {
        changed: true
      }
    }
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    const statusMessage = getErrorStatusMessage(error, 'Nao foi possivel atualizar a senha.')

    setResponseStatus(event, statusCode)
    return { status: 'error', messages: [statusMessage], data: null }
  }
}

export const handleRegister = async (event: H3Event): Promise<AuthSuccessResponse> => {
  const body = await readBody<{
    fullName?: string
    cpf?: string
    email?: string
    password?: string
    phone?: string | null
    region?: UserRegion
  }>(event)
  const result = await getAuthModule().accountService.registerAccount({
    fullName: body?.fullName || '',
    cpf: body?.cpf || '',
    email: body?.email || '',
    password: body?.password || '',
    phone: body?.phone ?? null,
    region: body?.region || 'feira-de-santana'
  })

  await setAuthSessionCookieForEvent(event, result.idToken)

  return {
    user: result.user
  }
}

export const handleRegistrationStatus = async (event: H3Event): Promise<RegistrationStatusResponse> => {
  const query = getQuery(event)
  const classroomUuid = typeof query.classroomUuid === 'string' ? query.classroomUuid : ''

  return await getAuthModule().registrationStatusService.getRegistrationStatus(classroomUuid)
}

export const handleSession = async (event: H3Event): Promise<AuthSessionResponse> => {
  const session = (event.context as { authSession?: { user: AuthSessionResponse['user'] } }).authSession

  return {
    authenticated: Boolean(session?.user),
    user: session?.user || null
  }
}
