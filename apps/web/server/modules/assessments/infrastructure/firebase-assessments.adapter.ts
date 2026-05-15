import type { AssessmentsBackendPort } from '../application/ports'
import {
  createAdminAssessment,
  deleteAdminAssessmentBySlug,
  deleteAdminAssessmentAttemptById,
  getAccessibleModuleAssessmentsBySlugs,
  getAdminAssessmentBySlug,
  listAdminAssessmentsForManagement,
  listAdminAssessmentAttemptsForManagement,
  submitAssessmentAttemptBySlugs,
  updateAdminAssessmentBySlug,
  updateAdminAssessmentAttemptScoreById
} from '../../shared/infrastructure/course-catalog'

export class FirebaseAssessmentsAdapter implements AssessmentsBackendPort {
  listAdminAssessmentsForManagement = listAdminAssessmentsForManagement
  getAdminAssessmentBySlug = getAdminAssessmentBySlug
  createAdminAssessment = createAdminAssessment
  updateAdminAssessmentBySlug = updateAdminAssessmentBySlug
  deleteAdminAssessmentBySlug = deleteAdminAssessmentBySlug
  getAccessibleModuleAssessmentsBySlugs = getAccessibleModuleAssessmentsBySlugs
  submitAssessmentAttemptBySlugs = submitAssessmentAttemptBySlugs
  listAdminAssessmentAttemptsForManagement = listAdminAssessmentAttemptsForManagement
  updateAdminAssessmentAttemptScoreById = updateAdminAssessmentAttemptScoreById
  deleteAdminAssessmentAttemptById = deleteAdminAssessmentAttemptById
}
