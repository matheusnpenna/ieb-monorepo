import type {
  AuthSessionContext,
  RegistrationStatusResponse
} from '@ieb/shared'
import type { H3Event } from 'h3'
import { getAuthModule } from '../modules/auth/auth.module'
import type { RegisterAccountInput, WriteAdminLogInput } from '../modules/auth/application/ports'
import {
  clearAuthSessionCookieForEvent,
  getAuthSessionCookieFromEvent,
  setAuthSessionCookieForEvent
} from '../modules/auth/interfaces/http/cookies'

export const setAuthSessionCookie = async (event: H3Event, idToken: string) => {
  await setAuthSessionCookieForEvent(event, idToken)
}

export const clearAuthSessionCookie = (event: H3Event) => {
  clearAuthSessionCookieForEvent(event)
}

export const resolveAuthSession = async (event: H3Event) => {
  const sessionCookie = getAuthSessionCookieFromEvent(event)
  const session = await getAuthModule().sessionService.resolveAuthSession(sessionCookie)

  if (sessionCookie && !session) {
    clearAuthSessionCookie(event)
  }

  return session
}

export const requireAuthSession = async (event: H3Event, options?: { admin?: boolean }) => {
  const session = (event.context as { authSession?: AuthSessionContext }).authSession || (await resolveAuthSession(event))
  const requiredSession = getAuthModule().sessionService.requireResolvedSession(session, options)

  ;(event.context as { authSession?: AuthSessionContext }).authSession = requiredSession

  return requiredSession
}

export const getRegistrationStatus = async (classroomUuid: string): Promise<RegistrationStatusResponse> =>
  await getAuthModule().registrationStatusService.getRegistrationStatus(classroomUuid)

export const loginWithEmailAndPassword = async (
  event: H3Event,
  input: {
    email: string
    password: string
  }
) => {
  const result = await getAuthModule().accountService.loginWithEmailAndPassword(input)

  await setAuthSessionCookie(event, result.idToken)

  return result.user
}

export const registerAccount = async (event: H3Event, input: RegisterAccountInput) => {
  const result = await getAuthModule().accountService.registerAccount(input)

  await setAuthSessionCookie(event, result.idToken)

  return result.user
}

export const sendPasswordRecoveryEmail = async (emailInput: string) => {
  await getAuthModule().accountService.sendPasswordRecoveryEmail(emailInput)
}

export const writeAdminLog = async (
  session: AuthSessionContext,
  input: WriteAdminLogInput,
  summary?: string
) => {
  await getAuthModule().adminLogService.write(session, input, summary)
}
