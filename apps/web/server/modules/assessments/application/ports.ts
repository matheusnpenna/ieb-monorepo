import type {
  AdminAssessmentAttemptViewItem,
  AdminAssessmentInput,
  AdminAssessmentAttemptScoreInput,
  Assessment,
  AuthSessionContext,
  StudentAssessmentSubmissionData,
  StudentModuleAssessmentData
} from '@ieb/shared'

export interface AssessmentsBackendPort {
  listAdminAssessmentsForManagement(
    session: AuthSessionContext,
    filters?: { courseId?: string; moduleId?: string }
  ): Promise<Assessment[]>
  getAdminAssessmentBySlug(session: AuthSessionContext, assessmentSlug: string): Promise<Assessment>
  createAdminAssessment(session: AuthSessionContext, input: AdminAssessmentInput): Promise<Assessment>
  updateAdminAssessmentBySlug(
    session: AuthSessionContext,
    assessmentSlug: string,
    input: AdminAssessmentInput
  ): Promise<Assessment>
  deleteAdminAssessmentBySlug(session: AuthSessionContext, assessmentSlug: string): Promise<Assessment>
  getAccessibleModuleAssessmentsBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string
  ): Promise<StudentModuleAssessmentData>
  submitAssessmentAttemptBySlugs(
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    assessmentSlug: string,
    answers: Record<string, string | string[]>
  ): Promise<StudentAssessmentSubmissionData>
  listAdminAssessmentAttemptsForManagement(session: AuthSessionContext): Promise<AdminAssessmentAttemptViewItem[]>
  updateAdminAssessmentAttemptScoreById(
    session: AuthSessionContext,
    attemptId: string,
    score: AdminAssessmentAttemptScoreInput['score']
  ): Promise<AdminAssessmentAttemptViewItem>
  deleteAdminAssessmentAttemptById(session: AuthSessionContext, attemptId: string): Promise<AdminAssessmentAttemptViewItem>
}

export interface AdminLogPort {
  write(
    session: AuthSessionContext,
    entry: {
      action: 'create' | 'update' | 'delete'
      targetCollection: string
      targetId: string
      summary: string
      metadata?: Record<string, unknown>
    }
  ): Promise<void>
}
