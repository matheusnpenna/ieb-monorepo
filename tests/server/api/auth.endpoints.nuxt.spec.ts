import { createEvent } from 'h3'
import { IncomingMessage, ServerResponse } from 'node-mock-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  readBody,
  loginWithEmailAndPassword,
  writeAdminLog,
  clearAuthSessionCookie,
  requireAuthSession,
  sendPasswordRecoveryEmail,
  registerAccount,
  getRegistrationStatus
} = vi.hoisted(() => ({
  readBody: vi.fn(),
  loginWithEmailAndPassword: vi.fn(),
  writeAdminLog: vi.fn(),
  clearAuthSessionCookie: vi.fn(),
  requireAuthSession: vi.fn(),
  sendPasswordRecoveryEmail: vi.fn(),
  registerAccount: vi.fn(),
  getRegistrationStatus: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')

  return {
    ...actual,
    readBody
  }
})

vi.mock('../../../apps/web/server/utils/auth', () => ({
  loginWithEmailAndPassword,
  writeAdminLog,
  clearAuthSessionCookie,
  requireAuthSession,
  sendPasswordRecoveryEmail,
  registerAccount,
  getRegistrationStatus
}))

import loginHandler from '../../../apps/web/server/api/auth/login.post'
import logoutHandler from '../../../apps/web/server/api/auth/logout.post'
import passwordRecoveryHandler from '../../../apps/web/server/api/auth/password-recovery.post'
import registerHandler from '../../../apps/web/server/api/auth/register.post'
import registrationStatusHandler from '../../../apps/web/server/api/auth/registration-status.get'
import sessionHandler from '../../../apps/web/server/api/auth/session.get'

const sampleUser = {
  id: 'user-1',
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  role: 'student',
  status: 'active',
  region: 'feira-de-santana',
  avatarUrl: null
} as const

const createGetEvent = (url: string) => {
  const req = new IncomingMessage()
  req.method = 'GET'
  req.url = url
  req.push(null)

  const res = new ServerResponse(req)

  return createEvent(req, res)
}

describe('server auth endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('authenticates the user and writes the login log', async () => {
      const event = {} as never

      readBody.mockResolvedValue({
        email: 'jane@example.com',
        password: 'super-secret'
      })
      loginWithEmailAndPassword.mockResolvedValue(sampleUser)
      writeAdminLog.mockResolvedValue(undefined)

      const response = await loginHandler(event)

      expect(loginWithEmailAndPassword).toHaveBeenCalledWith(event, {
        email: 'jane@example.com',
        password: 'super-secret'
      })
      expect(writeAdminLog).toHaveBeenCalledWith(
        {
          user: sampleUser,
          issuedAt: expect.any(String)
        },
        'login',
        'Login realizado com sucesso no painel/plataforma.'
      )
      expect(response).toEqual({ user: sampleUser })
    })

    it('falls back to empty strings when the body is missing', async () => {
      const event = {} as never

      readBody.mockResolvedValue(undefined)
      loginWithEmailAndPassword.mockResolvedValue(sampleUser)
      writeAdminLog.mockResolvedValue(undefined)

      await loginHandler(event)

      expect(loginWithEmailAndPassword).toHaveBeenCalledWith(event, {
        email: '',
        password: ''
      })
    })
  })

  describe('POST /api/auth/logout', () => {
    it('writes the logout log when there is an authenticated session', async () => {
      const event = {} as never
      const session = {
        user: sampleUser,
        issuedAt: '2026-05-05T00:00:00.000Z'
      }

      requireAuthSession.mockResolvedValue(session)
      writeAdminLog.mockResolvedValue(undefined)

      const response = await logoutHandler(event)

      expect(requireAuthSession).toHaveBeenCalledWith(event)
      expect(writeAdminLog).toHaveBeenCalledWith(
        session,
        'logout',
        'Logout realizado com sucesso no painel/plataforma.'
      )
      expect(clearAuthSessionCookie).toHaveBeenCalledWith(event)
      expect(response).toEqual({ success: true })
    })

    it('still clears the cookie when there is no authenticated session', async () => {
      const event = {} as never

      requireAuthSession.mockRejectedValue(new Error('Unauthenticated'))

      const response = await logoutHandler(event)

      expect(writeAdminLog).not.toHaveBeenCalled()
      expect(clearAuthSessionCookie).toHaveBeenCalledWith(event)
      expect(response).toEqual({ success: true })
    })
  })

  describe('POST /api/auth/password-recovery', () => {
    it('forwards the submitted email to the recovery service', async () => {
      const event = {} as never

      readBody.mockResolvedValue({
        email: 'jane@example.com'
      })
      sendPasswordRecoveryEmail.mockResolvedValue(undefined)

      const response = await passwordRecoveryHandler(event)

      expect(sendPasswordRecoveryEmail).toHaveBeenCalledWith('jane@example.com')
      expect(response).toEqual({
        message: 'Se o e-mail estiver cadastrado, enviaremos um link de recuperacao em instantes.'
      })
    })

    it('falls back to an empty email when the body is missing', async () => {
      const event = {} as never

      readBody.mockResolvedValue(undefined)
      sendPasswordRecoveryEmail.mockResolvedValue(undefined)

      await passwordRecoveryHandler(event)

      expect(sendPasswordRecoveryEmail).toHaveBeenCalledWith('')
    })
  })

  describe('POST /api/auth/register', () => {
    it('passes the submitted payload to account registration', async () => {
      const event = {} as never

      readBody.mockResolvedValue({
        classroomUuid: 'class-1',
        fullName: 'Jane Doe',
        cpf: '12345678900',
        email: 'jane@example.com',
        password: 'super-secret',
        region: 'sertao'
      })
      registerAccount.mockResolvedValue(sampleUser)

      const response = await registerHandler(event)

      expect(registerAccount).toHaveBeenCalledWith(event, {
        classroomUuid: 'class-1',
        fullName: 'Jane Doe',
        cpf: '12345678900',
        email: 'jane@example.com',
        password: 'super-secret',
        region: 'sertao'
      })
      expect(response).toEqual({ user: sampleUser })
    })

    it('uses empty defaults and the default region when fields are missing', async () => {
      const event = {} as never

      readBody.mockResolvedValue(undefined)
      registerAccount.mockResolvedValue(sampleUser)

      await registerHandler(event)

      expect(registerAccount).toHaveBeenCalledWith(event, {
        classroomUuid: '',
        fullName: '',
        cpf: '',
        email: '',
        password: '',
        region: 'feira-de-santana'
      })
    })
  })

  describe('GET /api/auth/registration-status', () => {
    it('passes the classroomUuid query param to the registration service', async () => {
      const event = createGetEvent('/api/auth/registration-status?classroomUuid=class-1')
      const serviceResponse = {
        isOpen: true,
        message: 'Cadastro liberado',
        classroomName: 'Turma 2026'
      }

      getRegistrationStatus.mockResolvedValue(serviceResponse)

      const response = await registrationStatusHandler(event)

      expect(getRegistrationStatus).toHaveBeenCalledWith('class-1')
      expect(response).toEqual(serviceResponse)
    })

    it('falls back to an empty classroomUuid when the query param is invalid', async () => {
      const event = createGetEvent('/api/auth/registration-status?classroomUuid=class-1&classroomUuid=class-2')
      const serviceResponse = {
        isOpen: false,
        message: 'Periodo encerrado',
        classroomName: null
      }

      getRegistrationStatus.mockResolvedValue(serviceResponse)

      await registrationStatusHandler(event)

      expect(getRegistrationStatus).toHaveBeenCalledWith('')
    })
  })

  describe('GET /api/auth/session', () => {
    it('returns an authenticated response when the middleware already resolved a session', async () => {
      const event = {
        context: {
          authSession: {
            user: sampleUser
          }
        }
      } as never

      const response = await sessionHandler(event)

      expect(response).toEqual({
        authenticated: true,
        user: sampleUser
      })
    })

    it('returns an unauthenticated response when there is no session in context', async () => {
      const event = {
        context: {}
      } as never

      const response = await sessionHandler(event)

      expect(response).toEqual({
        authenticated: false,
        user: null
      })
    })
  })
})
