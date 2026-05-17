import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
  getAccessibleModuleAssessmentsBySlugs,
  submitAssessmentAttemptBySlugs,
  listAccountAssessmentAttempts,
  listAdminAssessmentAttemptsForManagement,
  updateAdminAssessmentAttemptScoreById,
  deleteAdminAssessmentAttemptById,
  listAdminAssessmentsForManagement,
  createAdminAssessment,
  getAdminAssessmentBySlug,
  updateAdminAssessmentBySlug,
  deleteAdminAssessmentBySlug,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  writeAdminLog: vi.fn(),
  getAccessibleModuleAssessmentsBySlugs: vi.fn(),
  submitAssessmentAttemptBySlugs: vi.fn(),
  listAccountAssessmentAttempts: vi.fn(),
  listAdminAssessmentAttemptsForManagement: vi.fn(),
  updateAdminAssessmentAttemptScoreById: vi.fn(),
  deleteAdminAssessmentAttemptById: vi.fn(),
  listAdminAssessmentsForManagement: vi.fn(),
  createAdminAssessment: vi.fn(),
  getAdminAssessmentBySlug: vi.fn(),
  updateAdminAssessmentBySlug: vi.fn(),
  deleteAdminAssessmentBySlug: vi.fn(),
  readBody: vi.fn()
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
  requireAuthSession,
  writeAdminLog
}))

vi.mock('../../../server/modules/assessments/infrastructure/firebase-assessments.repository', () => ({
  getAccessibleModuleAssessmentsBySlugs,
  submitAssessmentAttemptBySlugs,
  listAccountAssessmentAttempts,
  listAdminAssessmentAttemptsForManagement,
  updateAdminAssessmentAttemptScoreById,
  deleteAdminAssessmentAttemptById,
  listAdminAssessmentsForManagement,
  createAdminAssessment,
  getAdminAssessmentBySlug,
  updateAdminAssessmentBySlug,
  deleteAdminAssessmentBySlug
}))

import listAssessmentsHandler from '../../../server/api/admin/assessments/index.get'
import createAssessmentHandler from '../../../server/api/admin/assessments/index.post'
import getAssessmentHandler from '../../../server/api/admin/assessments/[assessmentSlug]/index.get'
import updateAssessmentHandler from '../../../server/api/admin/assessments/[assessmentSlug]/index.patch'
import deleteAssessmentHandler from '../../../server/api/admin/assessments/[assessmentSlug]/index.delete'

const sampleSession = {
  user: {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active',
    region: 'feira-de-santana',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
} as const

const sampleAssessment = {
  id: 'avaliacao-do-modulo',
  courseId: 'teologia-basica',
  moduleId: 'fundamentos-da-fe',
  title: 'Avaliacao do Modulo',
  slug: 'avaliacao-do-modulo',
  description: 'Prova do modulo',
  questionType: 'multiple_choice',
  passingScore: 70,
  timeLimitInMinutes: 30,
  questions: [],
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  deletedAt: null,
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedBy: null
}

describe('admin assessments api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists admin assessments', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    listAdminAssessmentsForManagement.mockResolvedValue([sampleAssessment])

    const response = await listAssessmentsHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: [sampleAssessment]
    })
  })

  it('creates an assessment', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue(sampleAssessment)
    createAdminAssessment.mockResolvedValue(sampleAssessment)

    const response = await createAssessmentHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: sampleAssessment
    })
  })

  it('gets a single assessment', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    getAdminAssessmentBySlug.mockResolvedValue(sampleAssessment)

    const response = await getAssessmentHandler({
      context: {
        params: {
          assessmentSlug: 'avaliacao-do-modulo'
        }
      }
    } as never)

    expect(response).toEqual({
      status: 'success',
      data: sampleAssessment
    })
  })

  it('updates an assessment', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      ...sampleAssessment,
      title: 'Avaliacao revisada'
    })
    updateAdminAssessmentBySlug.mockResolvedValue({
      ...sampleAssessment,
      title: 'Avaliacao revisada'
    })

    const response = await updateAssessmentHandler({
      context: {
        params: {
          assessmentSlug: 'avaliacao-do-modulo'
        }
      }
    } as never)

    expect(response.status).toBe('success')
  })

  it('soft deletes an assessment', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    deleteAdminAssessmentBySlug.mockResolvedValue({
      ...sampleAssessment,
      deletedAt: '2026-05-08T12:00:00.000Z'
    })

    const response = await deleteAssessmentHandler({
      context: {
        params: {
          assessmentSlug: 'avaliacao-do-modulo'
        }
      }
    } as never)

    expect(response.status).toBe('success')
  })
})
