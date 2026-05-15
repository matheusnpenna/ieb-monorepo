import { defineEventHandler } from 'h3'
import { handleUpdateAdminAssessmentAttemptScore } from '../../../../modules/assessments/interfaces/http/controller'

export default defineEventHandler(handleUpdateAdminAssessmentAttemptScore)
