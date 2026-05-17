import type { AssessmentsBackendPort } from '../application/ports'
import {
  createAdminAssessment,
  deleteAdminAssessmentBySlug,
  deleteAdminAssessmentAttemptById,
  getAccessibleModuleAssessmentsBySlugs,
  listAccountAssessmentAttempts,
  getAdminAssessmentBySlug,
  listAdminAssessmentsForManagement,
  listAdminAssessmentAttemptsForManagement,
  submitAssessmentAttemptBySlugs,
  updateAdminAssessmentBySlug,
  updateAdminAssessmentAttemptScoreById
} from './firebase-assessments.repository'

export class FirebaseAssessmentsAdapter implements AssessmentsBackendPort {
  listAdminAssessmentsForManagement = listAdminAssessmentsForManagement
  getAdminAssessmentBySlug = getAdminAssessmentBySlug
  createAdminAssessment = createAdminAssessment
  updateAdminAssessmentBySlug = updateAdminAssessmentBySlug
  deleteAdminAssessmentBySlug = deleteAdminAssessmentBySlug
  getAccessibleModuleAssessmentsBySlugs = getAccessibleModuleAssessmentsBySlugs
  submitAssessmentAttemptBySlugs = submitAssessmentAttemptBySlugs
  listAccountAssessmentAttempts = listAccountAssessmentAttempts
  listAdminAssessmentAttemptsForManagement = listAdminAssessmentAttemptsForManagement
  updateAdminAssessmentAttemptScoreById = updateAdminAssessmentAttemptScoreById
  deleteAdminAssessmentAttemptById = deleteAdminAssessmentAttemptById
}
