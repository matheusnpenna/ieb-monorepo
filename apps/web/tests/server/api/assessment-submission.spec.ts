import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
  getAccessibleModuleAssessmentsBySlugs,
  submitAssessmentAttemptBySlugs,
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
  listAdminAssessmentAttemptsForManagement,
  updateAdminAssessmentAttemptScoreById,
  deleteAdminAssessmentAttemptById,
  listAdminAssessmentsForManagement,
  createAdminAssessment,
  getAdminAssessmentBySlug,
  updateAdminAssessmentBySlug,
  deleteAdminAssessmentBySlug
}))

import submitAssessmentHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/assessments/[assessmentSlug]/attempts/index.post'

const sampleSession = {
  user: {
    id: 'student-1',
    email: 'student@example.com',
    fullName: 'Student User',
    role: 'student',
    status: 'active',
    region: 'aluno-externo',
    avatarUrl: null
  },
  issuedAt: '2026-05-08T00:00:00.000Z'
} as const

describe('assessment submission api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits an assessment attempt', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({
      answers: {
        'question-1': ['option-1']
      }
    })
    submitAssessmentAttemptBySlugs.mockResolvedValue({
      attempt: {
        id: 'attempt-1',
        assessmentId: 'assessment-1',
        attemptNumber: 1,
        status: 'graded',
        score: 100,
        approved: true,
        submittedAt: '2026-05-08T10:00:00.000Z'
      }
    })

    const response = await submitAssessmentHandler({
      context: {
        params: {
          courseSlug: 'curso',
          moduleSlug: 'modulo',
          assessmentSlug: 'avaliacao'
        }
      }
    } as never)

    expect(submitAssessmentAttemptBySlugs).toHaveBeenCalledWith(
      sampleSession,
      'curso',
      'modulo',
      'avaliacao',
      { 'question-1': ['option-1'] }
    )
    expect(response.status).toBe('success')
  })
})
