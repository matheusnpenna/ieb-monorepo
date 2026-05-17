import type { AdminAssessmentInput, AuthSessionContext } from '@ieb/shared'
import type { AssessmentsBackendPort } from './ports'

interface AssessmentsServiceDependencies {
  backend: AssessmentsBackendPort
}

export class AssessmentsService {
  private readonly backend: AssessmentsBackendPort

  constructor(dependencies: AssessmentsServiceDependencies) {
    this.backend = dependencies.backend
  }

  listAdminAssessmentsForManagement = (
    session: AuthSessionContext,
    filters?: { courseId?: string; moduleId?: string }
  ) => this.backend.listAdminAssessmentsForManagement(session, filters)
  getAdminAssessmentBySlug = (session: AuthSessionContext, assessmentSlug: string) =>
    this.backend.getAdminAssessmentBySlug(session, assessmentSlug)
  createAdminAssessment = (session: AuthSessionContext, input: AdminAssessmentInput) =>
    this.backend.createAdminAssessment(session, input)
  updateAdminAssessmentBySlug = (session: AuthSessionContext, assessmentSlug: string, input: AdminAssessmentInput) =>
    this.backend.updateAdminAssessmentBySlug(session, assessmentSlug, input)
  deleteAdminAssessmentBySlug = (session: AuthSessionContext, assessmentSlug: string) =>
    this.backend.deleteAdminAssessmentBySlug(session, assessmentSlug)
  getAccessibleModuleAssessmentsBySlugs = (session: AuthSessionContext, courseSlug: string, moduleSlug: string) =>
    this.backend.getAccessibleModuleAssessmentsBySlugs(session, courseSlug, moduleSlug)
  submitAssessmentAttemptBySlugs = (
    session: AuthSessionContext,
    courseSlug: string,
    moduleSlug: string,
    assessmentSlug: string,
    answers: Record<string, string | string[]>
  ) => this.backend.submitAssessmentAttemptBySlugs(session, courseSlug, moduleSlug, assessmentSlug, answers)
  listAccountAssessmentAttempts = (session: AuthSessionContext) => this.backend.listAccountAssessmentAttempts(session)
  listAdminAssessmentAttemptsForManagement = (session: AuthSessionContext) =>
    this.backend.listAdminAssessmentAttemptsForManagement(session)
  updateAdminAssessmentAttemptScoreById = (session: AuthSessionContext, attemptId: string, score: number) =>
    this.backend.updateAdminAssessmentAttemptScoreById(session, attemptId, score)
  deleteAdminAssessmentAttemptById = (session: AuthSessionContext, attemptId: string) =>
    this.backend.deleteAdminAssessmentAttemptById(session, attemptId)
}
