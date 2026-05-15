import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
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
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  getAccessibleModuleAssessmentsBySlugs: vi.fn(),
  submitAssessmentAttemptBySlugs: vi.fn(),
  listAdminAssessmentAttemptsForManagement: vi.fn(),
  updateAdminAssessmentAttemptScoreById: vi.fn(),
  deleteAdminAssessmentAttemptById: vi.fn(),
  listAdminAssessmentsForManagement: vi.fn(),
  createAdminAssessment: vi.fn(),
  getAdminAssessmentBySlug: vi.fn(),
  updateAdminAssessmentBySlug: vi.fn(),
  deleteAdminAssessmentBySlug: vi.fn()
}))

vi.hoisted(() => {
  ;(globalThis as typeof globalThis & { defineEventHandler?: unknown }).defineEventHandler = (handler: unknown) =>
    handler
})

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession
}))

vi.mock('../../../server/utils/courses', () => ({
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

import moduleAssessmentHandler from '../../../server/api/courses/[courseSlug]/modules/[moduleSlug]/assessment/index.get'

describe('GET /api/courses/[courseSlug]/modules/[moduleSlug]/assessment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns assessment availability for the authenticated user', async () => {
    requireAuthSession.mockResolvedValue({
      user: { id: 'student-1' }
    })
    getAccessibleModuleAssessmentsBySlugs.mockResolvedValue({
      availability: 'available',
      message: 'A avaliacao deste modulo ja esta disponivel.',
      assessments: [],
      progress: {
        completionPercentage: 100,
        completedLessons: 2,
        totalLessons: 2
      }
    })

    const response = await moduleAssessmentHandler({
      context: {
        params: {
          courseSlug: 'teologia-basica',
          moduleSlug: 'fundamentos-da-fe'
        }
      }
    } as never)

    expect(response.status).toBe('success')
    expect(getAccessibleModuleAssessmentsBySlugs).toHaveBeenCalledWith(
      expect.anything(),
      'teologia-basica',
      'fundamentos-da-fe'
    )
  })
})
