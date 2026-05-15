import { createEvent } from 'h3'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  readBody,
  loginWithEmailAndPassword,
  writeAdminLog,
  setAuthSessionCookie,
  clearAuthSessionCookie,
  requireAuthSession,
  resolveAuthSession,
  sendPasswordRecoveryEmail,
  registerAccount,
  getRegistrationStatus,
  listAdminUserEnrollments,
  updateAdminUserEnrollments
} = vi.hoisted(() => ({
  readBody: vi.fn(),
  loginWithEmailAndPassword: vi.fn(),
  writeAdminLog: vi.fn(),
  setAuthSessionCookie: vi.fn(),
  clearAuthSessionCookie: vi.fn(),
  requireAuthSession: vi.fn(),
  resolveAuthSession: vi.fn(),
  sendPasswordRecoveryEmail: vi.fn(),
  registerAccount: vi.fn(),
  getRegistrationStatus: vi.fn(),
  listAdminUserEnrollments: vi.fn(),
  updateAdminUserEnrollments: vi.fn()
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

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  loginWithEmailAndPassword,
  writeAdminLog,
  clearAuthSessionCookie,
  requireAuthSession,
  sendPasswordRecoveryEmail,
  registerAccount,
  getRegistrationStatus
}))

vi.mock('../../../server/modules/auth/auth.module', () => ({
  getAuthModule: () => ({
    accountService: {
      loginWithEmailAndPassword,
      registerAccount,
      sendPasswordRecoveryEmail
    },
    adminLogService: {
      write: writeAdminLog
    },
    registrationStatusService: {
      getRegistrationStatus
    },
    sessionService: {
      resolveAuthSession
    }
  })
}))

vi.mock('../../../server/modules/auth/interfaces/http/cookies', () => ({
  setAuthSessionCookieForEvent: setAuthSessionCookie,
  clearAuthSessionCookieForEvent: clearAuthSessionCookie,
  getAuthSessionCookieFromEvent: vi.fn(() => 'session-cookie')
}))

vi.mock('../../../server/modules/users/users.module', () => ({
  getUsersModule: () => ({
    adminLog: {
      write: writeAdminLog
    },
    userEnrollmentsService: {
      listAdminUserEnrollments,
      updateAdminUserEnrollments
    }
  })
}))

import loginHandler from '../../../server/api/auth/login.post'
import logoutHandler from '../../../server/api/auth/logout.post'
import passwordRecoveryHandler from '../../../server/api/auth/password-recovery.post'
import registerHandler from '../../../server/api/auth/register.post'
import registrationStatusHandler from '../../../server/api/auth/registration-status.get'
import sessionHandler from '../../../server/api/auth/session.get'
import adminUserEnrollmentsGetHandler from '../../../server/api/admin/users/[userId]/enrollments/index.get'
import adminUserEnrollmentsPatchHandler from '../../../server/api/admin/users/[userId]/enrollments/index.patch'

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
  const req = new IncomingMessage(new Socket())
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
      loginWithEmailAndPassword.mockResolvedValue({
        user: sampleUser,
        idToken: 'id-token'
      })
      writeAdminLog.mockResolvedValue(undefined)

      const response = await loginHandler(event)

      expect(loginWithEmailAndPassword).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'super-secret'
      })
      expect(setAuthSessionCookie).toHaveBeenCalledWith(event, 'id-token')
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
      loginWithEmailAndPassword.mockResolvedValue({
        user: sampleUser,
        idToken: 'id-token'
      })
      writeAdminLog.mockResolvedValue(undefined)

      await loginHandler(event)

      expect(loginWithEmailAndPassword).toHaveBeenCalledWith({
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

      resolveAuthSession.mockResolvedValue(session)
      writeAdminLog.mockResolvedValue(undefined)

      const response = await logoutHandler(event)

      expect(resolveAuthSession).toHaveBeenCalledWith('session-cookie')
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

      resolveAuthSession.mockResolvedValue(null)

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
        fullName: 'Jane Doe',
        cpf: '12345678900',
        email: 'jane@example.com',
        phone: '75999999999',
        password: 'super-secret',
        region: 'sertao'
      })
      registerAccount.mockResolvedValue({
        user: sampleUser,
        idToken: 'id-token'
      })

      const response = await registerHandler(event)

      expect(registerAccount).toHaveBeenCalledWith({
        fullName: 'Jane Doe',
        cpf: '12345678900',
        email: 'jane@example.com',
        phone: '75999999999',
        password: 'super-secret',
        region: 'sertao'
      })
      expect(setAuthSessionCookie).toHaveBeenCalledWith(event, 'id-token')
      expect(response).toEqual({ user: sampleUser })
    })

    it('uses empty defaults and the default region when fields are missing', async () => {
      const event = {} as never

      readBody.mockResolvedValue(undefined)
      registerAccount.mockResolvedValue({
        user: sampleUser,
        idToken: 'id-token'
      })

      await registerHandler(event)

      expect(registerAccount).toHaveBeenCalledWith({
        fullName: '',
        cpf: '',
        email: '',
        phone: null,
        password: '',
        region: 'feira-de-santana'
      })
    })
  })

  describe('admin user enrollment endpoints', () => {
    const adminSession = {
      user: {
        ...sampleUser,
        role: 'admin'
      },
      issuedAt: '2026-05-09T00:00:00.000Z'
    }
    const enrollmentData = {
      user: {
        id: 'user-1',
        fullName: 'Jane Doe',
        cpf: '12345678900',
        email: 'jane@example.com',
        role: 'student',
        status: 'active',
        region: 'feira-de-santana',
        phone: null,
        avatarUrl: null,
        lastLoginAt: null,
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z',
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
        deletedBy: null
      },
      courses: [],
      enrollments: []
    }

    it('requires an admin session to list user enrollments', async () => {
      const event = {
        context: {
          params: {
            userId: 'user-1'
          }
        }
      } as never

      requireAuthSession.mockResolvedValue(adminSession)
      listAdminUserEnrollments.mockResolvedValue(enrollmentData)

      const response = await adminUserEnrollmentsGetHandler(event)

      expect(requireAuthSession).toHaveBeenCalledWith(event, { admin: true })
      expect(listAdminUserEnrollments).toHaveBeenCalledWith(adminSession, 'user-1')
      expect(response).toEqual({
        status: 'success',
        data: enrollmentData
      })
    })

    it('requires an admin session to update user enrollments', async () => {
      const event = {
        context: {
          params: {
            userId: 'user-1'
          }
        }
      } as never

      requireAuthSession.mockResolvedValue(adminSession)
      readBody.mockResolvedValue({
        courseIds: ['course-1']
      })
      updateAdminUserEnrollments.mockResolvedValue(enrollmentData)

      const response = await adminUserEnrollmentsPatchHandler(event)

      expect(requireAuthSession).toHaveBeenCalledWith(event, { admin: true })
      expect(updateAdminUserEnrollments).toHaveBeenCalledWith(adminSession, 'user-1', {
        courseIds: ['course-1']
      })
      expect(response).toEqual({
        status: 'success',
        message: 'Matriculas atualizadas com sucesso.',
        data: enrollmentData
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
