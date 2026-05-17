import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  readBody,
  readMultipartFormData,
  setAuthSessionCookieForEvent,
  getAccountProfile,
  updateAccountProfile,
  listAccountAssessmentAttempts,
  changeAccountPassword,
  uploadAccountAvatar
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  readBody: vi.fn(),
  readMultipartFormData: vi.fn(),
  setAuthSessionCookieForEvent: vi.fn(),
  getAccountProfile: vi.fn(),
  updateAccountProfile: vi.fn(),
  listAccountAssessmentAttempts: vi.fn(),
  changeAccountPassword: vi.fn(),
  uploadAccountAvatar: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')

  return {
    ...actual,
    readBody,
    readMultipartFormData
  }
})

vi.mock('../../../server/modules/auth/interfaces/http/session', () => ({
  requireAuthSession
}))

vi.mock('../../../server/modules/auth/interfaces/http/cookies', () => ({
  setAuthSessionCookieForEvent
}))

vi.mock('../../../server/modules/users/users.module', () => ({
  getUsersModule: () => ({
    adminLog: {
      write: vi.fn()
    },
    usersService: {
      getAccountProfile,
      updateAccountProfile
    }
  })
}))

vi.mock('../../../server/modules/assessments/assessments.module', () => ({
  getAssessmentsModule: () => ({
    adminLog: {
      write: vi.fn()
    },
    service: {
      listAccountAssessmentAttempts
    }
  })
}))

vi.mock('../../../server/modules/auth/auth.module', () => ({
  getAuthModule: () => ({
    accountService: {
      changeAccountPassword
    }
  })
}))

vi.mock('../../../server/modules/assets/assets.module', () => ({
  getAssetsModule: () => ({
    adminLog: {
      write: vi.fn()
    },
    service: {
      uploadAccountAvatar
    }
  })
}))

import getProfileHandler from '../../../server/api/account/profile/index.get'
import updateProfileHandler from '../../../server/api/account/profile/index.patch'
import listAttemptsHandler from '../../../server/api/account/assessment-attempts/index.get'
import changePasswordHandler from '../../../server/api/account/password/index.post'
import uploadAvatarHandler from '../../../server/api/account/avatar/index.post'

const sampleSession = {
  user: {
    id: 'student-1',
    email: 'student@example.com',
    fullName: 'Aluno Videira',
    role: 'student',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
} as const

const sampleUser = {
  id: 'student-1',
  role: 'student',
  status: 'active',
  fullName: 'Aluno Videira',
  cpf: '12345678901',
  email: 'student@example.com',
  phone: null,
  avatarUrl: null,
  region: 'feira-de-santana',
  lastLoginAt: null,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: null,
  updatedBy: null,
  deletedBy: null
}

describe('account api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the authenticated account profile', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAccountProfile.mockResolvedValue(sampleUser)

    const response = await getProfileHandler({} as never)

    expect(response).toEqual({ status: 'success', data: sampleUser })
    expect(requireAuthSession).toHaveBeenCalled()
    expect(getAccountProfile).toHaveBeenCalledWith(sampleSession)
  })

  it('updates the authenticated account profile', async () => {
    const input = {
      fullName: 'Aluno Atualizado',
      cpf: '98765432100',
      phone: '(75) 99999-9999',
      avatarUrl: null,
      region: 'panambi'
    }

    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue(input)
    updateAccountProfile.mockResolvedValue({ ...sampleUser, ...input })

    const response = await updateProfileHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      message: 'Dados da conta atualizados.',
      data: { ...sampleUser, ...input }
    })
    expect(updateAccountProfile).toHaveBeenCalledWith(sampleSession, input)
  })

  it('lists only the authenticated user assessment attempts', async () => {
    const attempts = [
      {
        id: 'attempt-1',
        courseId: 'course-1',
        courseTitle: 'Curso',
        courseHref: '/curso/curso',
        moduleId: 'module-1',
        moduleTitle: 'Modulo',
        moduleHref: '/curso/curso/modulo/modulo',
        assessmentId: 'assessment-1',
        assessmentTitle: 'Prova',
        passingScore: 70,
        attemptNumber: 1,
        status: 'graded',
        score: 90,
        approved: true,
        submittedAt: '2026-05-08T00:00:00.000Z',
        gradedAt: '2026-05-08T00:10:00.000Z'
      }
    ]

    requireAuthSession.mockResolvedValue(sampleSession)
    listAccountAssessmentAttempts.mockResolvedValue(attempts)

    const response = await listAttemptsHandler({} as never)

    expect(response).toEqual({ status: 'success', data: attempts })
    expect(listAccountAssessmentAttempts).toHaveBeenCalledWith(sampleSession)
  })

  it('changes the authenticated account password and refreshes the session cookie', async () => {
    const input = {
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
      newPasswordConfirmation: 'new-secret'
    }

    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue(input)
    changeAccountPassword.mockResolvedValue({ idToken: 'new-id-token' })

    const event = {} as never
    const response = await changePasswordHandler(event)

    expect(response).toEqual({
      status: 'success',
      message: 'Senha atualizada com sucesso.',
      data: {
        changed: true
      }
    })
    expect(changeAccountPassword).toHaveBeenCalledWith(sampleSession, input)
    expect(setAuthSessionCookieForEvent).toHaveBeenCalledWith(event, 'new-id-token')
  })

  it('uploads an authenticated account avatar', async () => {
    const fileData = Buffer.from('avatar-image')
    const uploadedAvatar = {
      url: 'https://storage.googleapis.com/bucket/account/users/avatar/student-1/avatar.png',
      path: 'account/users/avatar/student-1/avatar.png',
      filename: 'avatar.png'
    }

    requireAuthSession.mockResolvedValue(sampleSession)
    readMultipartFormData.mockResolvedValue([
      {
        name: 'file',
        filename: 'Avatar.png',
        type: 'image/png',
        data: fileData
      }
    ])
    uploadAccountAvatar.mockResolvedValue(uploadedAvatar)

    const response = await uploadAvatarHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: uploadedAvatar
    })
    expect(uploadAccountAvatar).toHaveBeenCalledWith(sampleSession, {
      filename: 'Avatar.png',
      mimeType: 'image/png',
      data: fileData
    })
  })
})
