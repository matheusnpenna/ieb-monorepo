import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  requireAuthSession,
  writeAdminLog,
  listAdminAssessmentAttemptsForManagement,
  updateAdminAssessmentAttemptScoreById,
  deleteAdminAssessmentAttemptById,
  readBody
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  writeAdminLog: vi.fn(),
  listAdminAssessmentAttemptsForManagement: vi.fn(),
  updateAdminAssessmentAttemptScoreById: vi.fn(),
  deleteAdminAssessmentAttemptById: vi.fn(),
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

vi.mock('../../../server/utils/auth', () => ({
  requireAuthSession,
  writeAdminLog
}))

vi.mock('../../../server/utils/courses', () => ({
  listAdminAssessmentAttemptsForManagement,
  updateAdminAssessmentAttemptScoreById,
  deleteAdminAssessmentAttemptById
}))

import listAttemptsHandler from '../../../server/api/admin/assessment-attempts/index.get'
import updateAttemptHandler from '../../../server/api/admin/assessment-attempts/[attemptId]/index.patch'
import deleteAttemptHandler from '../../../server/api/admin/assessment-attempts/[attemptId]/index.delete'

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

const sampleAttempt = {
  id: 'attempt-1',
  userId: 'student-1',
  studentName: 'Student User',
  studentEmail: 'student@example.com',
  courseId: 'course-1',
  courseTitle: 'Curso',
  moduleId: 'module-1',
  moduleTitle: 'Modulo',
  assessmentId: 'assessment-1',
  assessmentTitle: 'Avaliacao',
  assessmentQuestionType: 'free_text',
  passingScore: 70,
  attemptNumber: 1,
  status: 'pending_review',
  score: null,
  approved: null,
  submittedAt: '2026-05-08T10:00:00.000Z',
  gradedAt: null,
  answers: {
    'question-1': 'Resposta'
  }
}

describe('admin assessment attempts api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists assessment attempts', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    listAdminAssessmentAttemptsForManagement.mockResolvedValue([sampleAttempt])

    const response = await listAttemptsHandler({} as never)

    expect(response).toEqual({
      status: 'success',
      data: [sampleAttempt]
    })
  })

  it('updates attempt score', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    readBody.mockResolvedValue({ score: 80 })
    updateAdminAssessmentAttemptScoreById.mockResolvedValue({
      ...sampleAttempt,
      status: 'graded',
      score: 80,
      approved: true,
      gradedAt: '2026-05-08T12:00:00.000Z'
    })

    const response = await updateAttemptHandler({
      context: {
        params: {
          attemptId: 'attempt-1'
        }
      }
    } as never)

    expect(updateAdminAssessmentAttemptScoreById).toHaveBeenCalledWith(sampleSession, 'attempt-1', 80)
    expect(response.status).toBe('success')
  })

  it('deletes an attempt', async () => {
    requireAuthSession.mockResolvedValue(sampleSession)
    deleteAdminAssessmentAttemptById.mockResolvedValue(sampleAttempt)

    const response = await deleteAttemptHandler({
      context: {
        params: {
          attemptId: 'attempt-1'
        }
      }
    } as never)

    expect(deleteAdminAssessmentAttemptById).toHaveBeenCalledWith(sampleSession, 'attempt-1')
    expect(response.status).toBe('success')
  })
})
